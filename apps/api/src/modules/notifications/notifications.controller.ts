import { Response } from 'express';
import { getNotifications, markAsRead, deleteNotifications, getNotificationSettings, updateNotificationSettings, savePushSubscription } from './notifications.service';
import { AppError } from '../../shared/errors/AppError';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';

export async function getNotificationsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  const notifications = await getNotifications(req.userId);
  res.json({ data: notifications });
}

export async function markAsReadHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  const { id } = req.params;
  await markAsRead(req.userId, id === 'all' ? undefined : id);
  res.json({ success: true });
}

export async function deleteNotificationsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  const { ids } = req.body;
  if (!Array.isArray(ids)) throw new AppError('BAD_REQUEST', 'ids must be an array');
  await deleteNotifications(req.userId, ids);
  res.json({ success: true });
}

export async function getSettingsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  const settings = await getNotificationSettings(req.userId);
  res.json({ data: settings });
}

export async function updateSettingsHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  const settings = await updateNotificationSettings(req.userId, req.body);
  res.json({ data: settings });
}

export async function subscribePushHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) throw new AppError('UNAUTHENTICATED', 'Not authenticated');
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys) throw new AppError('BAD_REQUEST', 'Invalid subscription payload');
  await savePushSubscription(req.userId, endpoint, keys.p256dh, keys.auth);
  res.status(201).json({ success: true });
}

