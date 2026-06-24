import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as mediaService from './media.service';

export async function initChunkedUpload(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const { fileName, mimeType, fileSize } = req.body;

  if (!fileName || !mimeType || fileSize === undefined) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'fileName, mimeType, and fileSize are required fields.' } });
    return;
  }

  try {
    const result = await mediaService.initUpload(userId, fileName, mimeType, parseInt(fileSize, 10));
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function uploadChunk(req: AuthenticatedRequest, res: Response) {
  const file = req.file;
  const { uploadId, chunkIndex } = req.body;

  if (!file || !uploadId || chunkIndex === undefined) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'File chunk, uploadId, and chunkIndex are required.' } });
    return;
  }

  try {
    const result = await mediaService.saveChunk(uploadId, parseInt(chunkIndex, 10), file.buffer);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function completeChunkedUpload(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const { uploadId } = req.body;

  if (!uploadId) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'uploadId is required.' } });
    return;
  }

  try {
    const result = await mediaService.completeUpload(userId, uploadId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function abortChunkedUpload(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const { uploadId } = req.body;

  if (!uploadId) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'uploadId is required.' } });
    return;
  }

  try {
    const result = await mediaService.abortUpload(userId, uploadId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}

export async function pollJobStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const job = await mediaService.getJobStatus(id);
    if (!job) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found.' } });
      return;
    }
    res.status(200).json(job);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
  }
}
