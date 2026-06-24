import { prisma } from '../../shared/lib/prisma';

export async function getPrivacySettings(userId: string) {
  // Upsert: create with defaults if not exists
  const settings = await prisma.privacySettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return settings;
}

export async function updatePrivacySettings(userId: string, data: {
  defaultPostVisibility?: string;
  friendRequestPolicy?: string;
  messagingPolicy?: string;
  taggingPolicy?: string;
  mentionPolicy?: string;
}) {
  const settings = await prisma.privacySettings.upsert({
    where: { userId },
    create: {
      userId,
      ...(data.defaultPostVisibility && { defaultPostVisibility: data.defaultPostVisibility as any }),
      ...(data.friendRequestPolicy && { friendRequestPolicy: data.friendRequestPolicy }),
      ...(data.messagingPolicy && { messagingPolicy: data.messagingPolicy }),
      ...(data.taggingPolicy && { taggingPolicy: data.taggingPolicy }),
      ...(data.mentionPolicy && { mentionPolicy: data.mentionPolicy }),
    },
    update: {
      ...(data.defaultPostVisibility && { defaultPostVisibility: data.defaultPostVisibility as any }),
      ...(data.friendRequestPolicy && { friendRequestPolicy: data.friendRequestPolicy }),
      ...(data.messagingPolicy && { messagingPolicy: data.messagingPolicy }),
      ...(data.taggingPolicy && { taggingPolicy: data.taggingPolicy }),
      ...(data.mentionPolicy && { mentionPolicy: data.mentionPolicy }),
    },
  });
  return settings;
}

/**
 * Gets the IDs of all users who have blocked or been blocked by the given user.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.blockedUser.findMany({
    where: {
      OR: [
        { blockerId: userId },
        { blockedId: userId },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set<string>();
  for (const block of blocks) {
    if (block.blockerId !== userId) ids.add(block.blockerId);
    if (block.blockedId !== userId) ids.add(block.blockedId);
  }
  return Array.from(ids);
}

/**
 * Gets the IDs of all accepted friends of a user (bidirectional).
 */
export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendRelationship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const ids = new Set<string>();
  for (const fr of friendships) {
    if (fr.requesterId !== userId) ids.add(fr.requesterId);
    if (fr.addresseeId !== userId) ids.add(fr.addresseeId);
  }
  return Array.from(ids);
}

/**
 * Gets the IDs of friends-of-friends (mutual connections, excluding direct friends and blocked users).
 */
export async function getFriendsOfFriendsIds(userId: string, friendIds: string[], blockedIds: string[]): Promise<string[]> {
  if (friendIds.length === 0) return [];

  const fofFriendships = await prisma.friendRelationship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: { in: friendIds } },
        { addresseeId: { in: friendIds } },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const fofIds = new Set<string>();
  const excludeSet = new Set([userId, ...friendIds, ...blockedIds]);

  for (const fr of fofFriendships) {
    if (!excludeSet.has(fr.requesterId)) fofIds.add(fr.requesterId);
    if (!excludeSet.has(fr.addresseeId)) fofIds.add(fr.addresseeId);
  }

  return Array.from(fofIds);
}
