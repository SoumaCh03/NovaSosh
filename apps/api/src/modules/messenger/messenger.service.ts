import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/errors/AppError';

export interface RegisterDeviceInput {
  userId: string;
  deviceIdentifier: string;
  registrationId: number;
  identityKeyPub: string;
  signedPreKeyId: number;
  signedPreKeyPub: string;
  signedPreKeySig: string;
}

export interface PublishPreKeysInput {
  deviceId: string;
  preKeys: { keyId: number; publicKey: string }[];
}

export async function registerDevice(data: RegisterDeviceInput) {
  const device = await prisma.userDevice.upsert({
    where: {
      userId_deviceIdentifier: {
        userId: data.userId,
        deviceIdentifier: data.deviceIdentifier,
      },
    },
    create: {
      userId: data.userId,
      deviceIdentifier: data.deviceIdentifier,
      registrationId: data.registrationId,
      identityKeyPub: data.identityKeyPub,
      signedPreKeyId: data.signedPreKeyId,
      signedPreKeyPub: data.signedPreKeyPub,
      signedPreKeySig: data.signedPreKeySig,
    },
    update: {
      registrationId: data.registrationId,
      identityKeyPub: data.identityKeyPub,
      signedPreKeyId: data.signedPreKeyId,
      signedPreKeyPub: data.signedPreKeyPub,
      signedPreKeySig: data.signedPreKeySig,
    },
  });

  return device;
}

export async function publishPreKeys(data: PublishPreKeysInput) {
  const keys = data.preKeys.map((k) => ({
    userDeviceId: data.deviceId,
    keyId: k.keyId,
    publicKey: k.publicKey,
  }));

  await prisma.e2EPreKey.createMany({
    data: keys,
    skipDuplicates: true,
  });

  return { success: true, keysAdded: keys.length };
}

export async function fetchRecipientKeys(userId: string) {
  const devices = await prisma.userDevice.findMany({
    where: { userId },
    select: {
      id: true,
      deviceIdentifier: true,
      registrationId: true,
      identityKeyPub: true,
      signedPreKeyId: true,
      signedPreKeyPub: true,
      signedPreKeySig: true,
      preKeys: {
        take: 1,
        orderBy: { keyId: 'asc' },
      },
    },
  });

  if (!devices.length) {
    throw new AppError('NOT_FOUND', 'User has no registered devices for E2EE');
  }

  // Remove the fetched preKey from the DB so it's only used once
  const keysToReturn = await Promise.all(
    devices.map(async (device) => {
      const preKey = device.preKeys[0] || null;
      if (preKey) {
        await prisma.e2EPreKey.delete({ where: { id: preKey.id } });
      }
      return {
        deviceId: device.deviceIdentifier,
        registrationId: device.registrationId,
        identityKeyPub: device.identityKeyPub,
        signedPreKeyId: device.signedPreKeyId,
        signedPreKeyPub: device.signedPreKeyPub,
        signedPreKeySig: device.signedPreKeySig,
        oneTimePreKey: preKey ? { id: preKey.keyId, pub: preKey.publicKey } : null,
      };
    })
  );

  return keysToReturn;
}

export async function createConversation(creatorId: string, participantIds: string[], type: 'DIRECT' | 'GROUP', title?: string) {
  const conversation = await prisma.conversation.create({
    data: {
      type,
      title,
      participants: {
        create: [creatorId, ...participantIds].map((id) => ({
          userId: id,
          role: id === creatorId ? 'OWNER' : 'MEMBER',
        })),
      },
    },
    include: {
      participants: true,
    },
  });

  return conversation;
}

export async function saveEncryptedMessage(senderId: string, conversationId: string, encryptedContent: string, isForwarded = false, replyToId?: string) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      encryptedContent,
      isForwarded,
      replyToId,
    },
    include: {
      sender: {
        select: { id: true, profile: { select: { username: true } } },
      },
    },
  });

  return message;
}

export async function getConversations(userId: string) {
  return await prisma.conversation.findMany({
    where: {
      participants: { some: { userId } }
    },
    include: {
      participants: {
        include: { user: { select: { id: true, profile: { select: { displayName: true, username: true, avatarUrl: true } } } } }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function getMessages(conversationId: string, userId: string, skip = 0, take = 50) {
  // Security check: ensure user is participant
  const isParticipant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId }
  });
  if (!isParticipant) throw new AppError('FORBIDDEN', 'Not a participant of this conversation');

  return await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take
  });
}

export async function setDisappearingDuration(conversationId: string, userId: string, duration: number | null) {
  // Ensure user is in conversation
  const isParticipant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId }
  });
  if (!isParticipant) throw new AppError('FORBIDDEN', 'Not a participant of this conversation');

  return await prisma.conversation.update({
    where: { id: conversationId },
    data: { disappearingDuration: duration }
  });
}

export async function editMessage(messageId: string, userId: string, encryptedContent: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('NOT_FOUND', 'Message not found');
  if (message.senderId !== userId) throw new AppError('FORBIDDEN', 'Not authorized to edit this message');
  
  // Enforce 48 hours rule
  const hoursSinceSent = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceSent > 48) throw new AppError('FORBIDDEN', 'Message can no longer be edited');

  return await prisma.message.update({
    where: { id: messageId },
    data: { encryptedContent, editedAt: new Date() }
  });
}

export async function deleteMessageForEveryone(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('NOT_FOUND', 'Message not found');
  if (message.senderId !== userId) throw new AppError('FORBIDDEN', 'Not authorized to delete this message');

  // Enforce 48 hours rule
  const hoursSinceSent = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceSent > 48) throw new AppError('FORBIDDEN', 'Message can no longer be deleted');

  return await prisma.message.update({
    where: { id: messageId },
    data: { 
      isDeletedForEveryone: true, 
      encryptedContent: null, // Wipe content
      content: null,
      mediaUrl: null,
      deletedAt: new Date() 
    }
  });
}

