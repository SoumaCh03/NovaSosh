import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/errors/AppError';

export async function getProfile(username: string, viewerId?: string) {
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: {
      user: {
        select: { id: true, createdAt: true },
      },
    },
  });

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Profile not found');
  }

  // TODO: Add privacy filtering logic based on Friendship status and Profile Privacy

  return profile;
}

import { UpdateProfileInput } from './profiles.validation';

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const profile = await prisma.profile.update({
    where: { userId },
    data,
  });

  return profile;
}

export async function addCloseFriend(userId: string, friendId: string) {
  // Ensure they are actually friends first
  const friendship = await prisma.friendRelationship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId },
      ],
    },
  });

  if (!friendship) {
    throw new AppError('VALIDATION_ERROR', 'User is not a friend');
  }

  const closeFriend = await prisma.closeFriend.upsert({
    where: {
      userId_friendId: { userId, friendId },
    },
    update: {},
    create: {
      userId,
      friendId,
    },
  });

  return closeFriend;
}

export async function removeCloseFriend(userId: string, friendId: string) {
  await prisma.closeFriend.delete({
    where: {
      userId_friendId: { userId, friendId },
    },
  });
}
