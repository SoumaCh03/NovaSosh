import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { prisma } from '../lib/prisma';

// Configure portable static ffmpeg binary path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const UPLOADS_DIR = path.join(__dirname, '../../../../uploads');
const PROCESSED_DIR = path.join(UPLOADS_DIR, 'processed');
const HLS_DIR = path.join(UPLOADS_DIR, 'hls');

function ensureDirs() {
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });
}

export async function processImage(mediaFileId: string, jobId: string) {
  ensureDirs();

  await prisma.mediaProcessingJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', progress: 10.0 },
  });

  try {
    const file = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
    });

    if (!file) throw new Error('File not found in database');

    const rawPath = file.rawPath;
    if (!fs.existsSync(rawPath)) throw new Error(`Raw file does not exist on disk: ${rawPath}`);

    // 1. Generate blur placeholder (10x10 base64 blur)
    const blurBuffer = await sharp(rawPath)
      .resize(10, 10, { fit: 'inside' })
      .blur(2)
      .toFormat('png')
      .toBuffer();
    const blurPlaceholder = `data:image/png;base64,${blurBuffer.toString('base64')}`;

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { progress: 30.0 },
    });

    // 2. Generate Optimized Variant (JPEG, resized to max 1200w)
    const optimizedPath = path.join(PROCESSED_DIR, `${mediaFileId}_optimized.jpg`);
    await sharp(rawPath)
      .resize(1200, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(optimizedPath);

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { progress: 50.0 },
    });

    // 3. Generate Modern WebP Variant
    const webpPath = path.join(PROCESSED_DIR, `${mediaFileId}_variant.webp`);
    await sharp(rawPath)
      .resize(1200, null, { withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(webpPath);

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { progress: 70.0 },
    });

    // 4. Generate next-gen AVIF Variant
    const avifPath = path.join(PROCESSED_DIR, `${mediaFileId}_variant.avif`);
    await sharp(rawPath)
      .resize(1200, null, { withoutEnlargement: true })
      .avif({ quality: 65 })
      .toFile(avifPath);

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { progress: 85.0 },
    });

    // 5. Generate Thumbnail (150x150 crop)
    const thumbnailPath = path.join(PROCESSED_DIR, `${mediaFileId}_thumbnail.jpg`);
    await sharp(rawPath)
      .resize(150, 150, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);

    // Save Variants to Database
    const variants = [
      { type: 'OPTIMIZED', file: optimizedPath, suffix: 'optimized.jpg' },
      { type: 'WEBP', file: webpPath, suffix: 'variant.webp' },
      { type: 'AVIF', file: avifPath, suffix: 'variant.avif' },
      { type: 'THUMBNAIL', file: thumbnailPath, suffix: 'thumbnail.jpg' },
    ];

    for (const v of variants) {
      await prisma.mediaVariant.create({
        data: {
          mediaFileId,
          variantType: v.type,
          path: v.file,
          url: `http://localhost:4000/uploads/processed/${mediaFileId}_${v.suffix}`,
        },
      });
    }

    // Save blur placeholder in MediaFile record
    await prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: {
        status: 'READY',
        rawUrl: blurPlaceholder, // Store blur placeholder in base URL field or custom metadata
      },
    });

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100.0 },
    });

  } catch (err: any) {
    console.error('Image transcode error:', err);
    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: err.message },
    });
    await prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: { status: 'FAILED' },
    });
  }
}

export async function processVideo(mediaFileId: string, jobId: string) {
  ensureDirs();

  await prisma.mediaProcessingJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', progress: 5.0 },
  });

  try {
    const file = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
    });

    if (!file) throw new Error('File not found in database');

    const rawPath = file.rawPath;
    if (!fs.existsSync(rawPath)) throw new Error(`Raw file does not exist on disk: ${rawPath}`);

    // Create HLS sub-folder for video segments
    const videoHlsDir = path.join(HLS_DIR, mediaFileId);
    if (!fs.existsSync(videoHlsDir)) {
      fs.mkdirSync(videoHlsDir, { recursive: true });
    }

    const mp4Path = path.join(PROCESSED_DIR, `${mediaFileId}_optimized.mp4`);
    const posterPath = path.join(PROCESSED_DIR, `${mediaFileId}_poster.jpg`);
    const thumbnailPath = path.join(PROCESSED_DIR, `${mediaFileId}_thumbnail.jpg`);
    const hlsPlaylistPath = path.join(videoHlsDir, 'playlist.m3u8');

    // 1. Extract Poster and Thumbnail frames
    await new Promise<void>((resolve, reject) => {
      ffmpeg(rawPath)
        .screenshots({
          timestamps: [1], // extract frame at 1s
          folder: PROCESSED_DIR,
          filename: `${mediaFileId}_poster.jpg`,
          size: '1080x1920'
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    // Generate smaller 150x150 thumbnail from poster
    if (fs.existsSync(posterPath)) {
      await sharp(posterPath)
        .resize(150, 150, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);
    }

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { progress: 20.0 },
    });

    // 2. Transcode Video to portrait optimized MP4 (H.264/AAC)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(rawPath)
        .output(mp4Path)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('720x1280') // transcode to portrait 720p
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart' // stream web optimization
        ])
        .on('progress', async (prog) => {
          if (prog.percent) {
            // scale progress between 20% and 60%
            const currentProgress = 20.0 + (prog.percent * 0.4);
            await prisma.mediaProcessingJob.update({
              where: { id: jobId },
              data: { progress: Math.min(currentProgress, 59.0) },
            });
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { progress: 60.0 },
    });

    // 3. Generate HLS playlist & segment files
    await new Promise<void>((resolve, reject) => {
      ffmpeg(mp4Path)
        .output(hlsPlaylistPath)
        .outputOptions([
          '-codec:v copy', // copy raw stream from transcoded MP4 (extremely fast, zero re-encode overhead!)
          '-codec:a copy',
          '-hls_time 6', // 6-second segments
          '-hls_playlist_type vod',
          '-hls_segment_filename', path.join(videoHlsDir, 'segment_%03d.ts')
        ])
        .on('progress', async (prog) => {
          if (prog.percent) {
            // scale progress between 60% and 95%
            const currentProgress = 60.0 + (prog.percent * 0.35);
            await prisma.mediaProcessingJob.update({
              where: { id: jobId },
              data: { progress: Math.min(currentProgress, 94.0) },
            });
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Save Variants to Database
    const variants = [
      { type: 'OPTIMIZED', file: mp4Path, url: `http://localhost:4000/uploads/processed/${mediaFileId}_optimized.mp4` },
      { type: 'PREVIEW', file: posterPath, url: `http://localhost:4000/uploads/processed/${mediaFileId}_poster.jpg` },
      { type: 'THUMBNAIL', file: thumbnailPath, url: `http://localhost:4000/uploads/processed/${mediaFileId}_thumbnail.jpg` },
      { type: 'HLS_PLAYLIST', file: hlsPlaylistPath, url: `http://localhost:4000/uploads/hls/${mediaFileId}/playlist.m3u8` }
    ];

    for (const v of variants) {
      await prisma.mediaVariant.create({
        data: {
          mediaFileId,
          variantType: v.type,
          path: v.file,
          url: v.url,
        },
      });
    }

    // Set status to READY
    await prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: {
        status: 'READY',
      },
    });

    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100.0 },
    });

  } catch (err: any) {
    console.error('Video transcode error:', err);
    await prisma.mediaProcessingJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: err.message },
    });
    await prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: { status: 'FAILED' },
    });
  }
}
