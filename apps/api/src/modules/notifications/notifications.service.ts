import { prisma } from '../../shared/lib/prisma';
import { NotificationType } from '@prisma/client';

export async function getNotifications(userId: string, limit = 20) {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          }
        }
      }
    }
  });

  return notifications;
}

export async function markAsRead(userId: string, notificationId?: string) {
  if (notificationId) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  } else {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export async function createNotification(
  recipientId: string,
  actorId: string,
  type: NotificationType,
  entityType?: string,
  entityId?: string
) {
  if (recipientId === actorId) return null; // Don't notify yourself

  const notification = await prisma.notification.create({
    data: {
      recipientId,
      actorId,
      type,
      entityType,
      entityId,
    }
  });

  // TODO: Trigger Web Push here if settings allow
  
  return notification;
}

export async function deleteNotifications(userId: string, notificationIds: string[]) {
  return await prisma.notification.deleteMany({
    where: {
      recipientId: userId,
      id: { in: notificationIds }
    }
  });
}

export async function getNotificationSettings(userId: string) {
  let settings = await prisma.notificationSettings.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.notificationSettings.create({ data: { userId } });
  }
  return settings;
}

export async function updateNotificationSettings(userId: string, data: any) {
  return await prisma.notificationSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data }
  });
}

export async function savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string) {
  return await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId, p256dh, auth }
  });
}

