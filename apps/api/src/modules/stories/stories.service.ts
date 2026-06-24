import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/errors/AppError';

export async function createStory(authorId: string, mediaFileIds: string[], customExpiresAt?: Date) {
  // Default expiration is 24 hours
  const expiresAt = customExpiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const story = await prisma.story.create({
    data: {
      authorId,
      expiresAt,
      // We assume MediaAsset will be created linking this story
    },
  });

  // Link MediaAssets
  if (mediaFileIds && mediaFileIds.length > 0) {
    const assetsData = mediaFileIds.map((fileId, index) => ({
      storyId: story.id,
      type: 'IMAGE' as any, // In a real system, determine type from file
      rawUrl: `/uploads/${fileId}`, // Example static path mapping
      order: index,
    }));
    await prisma.mediaAsset.createMany({ data: assetsData });
  }

  return story;
}

export async function getActiveFeedStories(userId: string) {
  const now = new Date();
  
  // Find friends
  const friendships = await prisma.friendRelationship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
  
  const friendIds = friendships.map(f => (f.requesterId === userId ? f.addresseeId : f.requesterId));

  // Also include the user's own active stories
  const eligibleAuthors = [...friendIds, userId];

  const stories = await prisma.story.findMany({
    where: {
      authorId: { in: eligibleAuthors },
      expiresAt: { gt: now },
    },
    include: {
      author: {
        select: { id: true, profile: { select: { username: true, avatarUrl: true } } }
      },
      media: true,
      _count: {
        select: { views: true, reactions: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return stories;
}

export async function markStoryAsViewed(storyId: string, userId: string) {
  await prisma.storyView.upsert({
    where: {
      storyId_userId: { storyId, userId },
    },
    update: { viewedAt: new Date() },
    create: {
      storyId,
      userId,
    },
  });

  await prisma.story.update({
    where: { id: storyId },
    data: { viewCount: { increment: 1 } },
  });
}

export async function reactToStory(storyId: string, userId: string, reactionType: string) {
  const reaction = await prisma.storyReaction.upsert({
    where: {
      userId_storyId: { userId, storyId },
    },
    update: { type: reactionType as any },
    create: {
      storyId,
      userId,
      type: reactionType as any,
    },
  });
  return reaction;
}
