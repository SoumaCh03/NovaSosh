import { Response } from 'express';
import { createReport, getReports, resolveReport } from './moderation.service';
import { AppError } from '../../shared/errors/AppError';
import { ReportTargetType } from '@prisma/client';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';

export async function createReportHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  const { targetType, targetId, reason } = req.body;
  if (!targetType || !targetId || !reason) throw new AppError('INVALID_INPUT', 'Missing fields');
  
  const report = await createReport(req.userId, targetType as ReportTargetType, targetId, reason);
  res.json({ success: true, report });
}

export async function getReportsHandler(req: AuthenticatedRequest, res: Response) {
  // In a real app, verify ADMIN role here
  const reports = await getReports();
  res.json({ data: reports });
}

export async function resolveReportHandler(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { resolutionReason } = req.body;
  const report = await resolveReport(id, resolutionReason || 'Action taken');
  res.json({ success: true, report });
}
