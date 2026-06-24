import { prisma } from '../../shared/lib/prisma';
import { ReportTargetType } from '@prisma/client';

export async function createReport(reporterId: string, targetType: ReportTargetType, targetId: string, reason: string) {
  return await prisma.report.create({
    data: {
      reporterId,
      targetType,
      targetId,
      reason,
    }
  });
}

export async function getReports(limit = 50) {
  return await prisma.report.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: {
        select: {
          profile: {
            select: { username: true }
          }
        }
      }
    }
  });
}

export async function resolveReport(reportId: string, resolutionReason: string) {
  // In a real app we might store resolutionReason in a separate Audit Log or Note model.
  return await prisma.report.update({
    where: { id: reportId },
    data: { 
      status: 'ACTIONED'
    }
  });
}
