import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as mediaController from './media.controller';

const upload = multer({ storage: multer.memoryStorage() });

export const mediaRouter = Router();

mediaRouter.post('/upload/init', requireAuth, mediaController.initChunkedUpload);
mediaRouter.post('/upload/chunk', requireAuth, upload.single('chunk'), mediaController.uploadChunk);
mediaRouter.post('/upload/complete', requireAuth, mediaController.completeChunkedUpload);
mediaRouter.post('/upload/abort', requireAuth, mediaController.abortChunkedUpload);
mediaRouter.get('/jobs/:id', requireAuth, mediaController.pollJobStatus);
