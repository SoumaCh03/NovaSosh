import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../shared/lib/prisma';
import { processImage, processVideo } from '../../shared/utils/transcoder';

const UPLOADS_DIR = path.join(__dirname, '../../../../uploads');
const TMP_DIR = path.join(UPLOADS_DIR, 'tmp');
const RAW_DIR = path.join(UPLOADS_DIR, 'raw');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
}

export async function initUpload(userId: string, fileName: string, mimeType: string, fileSize: number) {
  ensureDirs();

  // Validate file types and sizes
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('Unsupported file type. Only image/ and video/ MIME types are allowed.');
  }

  const maxSize = isImage ? 20 * 1024 * 1024 : 500 * 1024 * 1024; // Image 20MB, Video 500MB
  if (fileSize > maxSize) {
    throw new Error(`File size exceeds the limit of ${maxSize / (1024 * 1024)} MB`);
  }

  // Create PENDING database record
  const mediaFile = await prisma.mediaFile.create({
    data: {
      userId,
      fileName,
      mimeType,
      fileSize,
      status: 'PENDING',
      rawPath: '',
      rawUrl: '',
    },
  });

  const uploadId = mediaFile.id;
  const chunkDir = path.join(TMP_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }

  return {
    uploadId,
    chunkSize: 5 * 1024 * 1024, // 5MB standard chunk size
    totalChunks: Math.ceil(fileSize / (5 * 1024 * 1024)),
  };
}

export async function saveChunk(uploadId: string, chunkIndex: number, fileBuffer: Buffer) {
  const chunkDir = path.join(TMP_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) {
    throw new Error('Upload session not found or expired.');
  }

  const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
  fs.writeFileSync(chunkPath, fileBuffer);

  // Read directory to get uploaded chunks count
  const files = fs.readdirSync(chunkDir);
  const uploadedChunks = files.filter(f => f.startsWith('chunk_')).map(f => parseInt(f.split('_')[1], 10));

  return {
    success: true,
    uploadedChunks: uploadedChunks.sort((a, b) => a - b),
  };
}

export async function completeUpload(userId: string, uploadId: string) {
  const chunkDir = path.join(TMP_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) {
    throw new Error('Upload session not found.');
  }

  const mediaFile = await prisma.mediaFile.findUnique({
    where: { id: uploadId },
  });

  if (!mediaFile || mediaFile.userId !== userId) {
    throw new Error('Unauthorized or invalid media file.');
  }

  const ext = path.extname(mediaFile.fileName);
  const destinationFileName = `${uploadId}_original${ext}`;
  const destinationPath = path.join(RAW_DIR, destinationFileName);

  // Write stream to merge chunks
  const writeStream = fs.createWriteStream(destinationPath);
  const files = fs.readdirSync(chunkDir).filter(f => f.startsWith('chunk_'));
  
  // Sort chunk files numerically
  const sortedChunkFiles = files.sort((a, b) => {
    const idxA = parseInt(a.split('_')[1], 10);
    const idxB = parseInt(b.split('_')[1], 10);
    return idxA - idxB;
  });

  if (sortedChunkFiles.length === 0) {
    throw new Error('No uploaded chunks found to complete.');
  }

  for (const chunkFile of sortedChunkFiles) {
    const chunkPath = path.join(chunkDir, chunkFile);
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
  }
  writeStream.end();

  // Wait for stream to finish writing
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err) => reject(err));
  });

  // Clean up chunks
  try {
    fs.rmSync(chunkDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Failed to remove chunk directory:', err);
  }

  // Update MediaFile record with raw paths
  const rawUrl = `http://localhost:4000/uploads/raw/${destinationFileName}`;
  const updatedMedia = await prisma.mediaFile.update({
    where: { id: uploadId },
    data: {
      status: 'PENDING', // Will transition to READY once transcode finishes
      rawPath: destinationPath,
      rawUrl,
    },
  });

  // Create background processing job
  const job = await prisma.mediaProcessingJob.create({
    data: {
      mediaFileId: uploadId,
      status: 'PENDING',
      progress: 0.0,
    },
  });

  // Trigger background transcode (non-blocking)
  const isVideo = mediaFile.mimeType.startsWith('video/');
  if (isVideo) {
    processVideo(uploadId, job.id).catch(err => {
      console.error(`Video transcoding failed for mediaId ${uploadId}:`, err);
    });
  } else {
    processImage(uploadId, job.id).catch(err => {
      console.error(`Image processing failed for mediaId ${uploadId}:`, err);
    });
  }

  return {
    mediaFile: updatedMedia,
    jobId: job.id,
  };
}

export async function abortUpload(userId: string, uploadId: string) {
  const mediaFile = await prisma.mediaFile.findUnique({
    where: { id: uploadId },
  });

  if (!mediaFile || mediaFile.userId !== userId) {
    throw new Error('Unauthorized or invalid media file.');
  }

  const chunkDir = path.join(TMP_DIR, uploadId);
  if (fs.existsSync(chunkDir)) {
    fs.rmSync(chunkDir, { recursive: true, force: true });
  }

  // Delete from DB
  await prisma.mediaFile.delete({
    where: { id: uploadId },
  });

  return { success: true };
}

export async function getJobStatus(jobId: string) {
  return await prisma.mediaProcessingJob.findUnique({
    where: { id: jobId },
  });
}
