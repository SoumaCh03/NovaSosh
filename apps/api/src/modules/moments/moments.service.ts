import ffmpeg from 'fluent-ffmpeg';
import { prisma } from '../../shared/lib/prisma';

export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        resolve(0);
      } else {
        resolve(metadata.format.duration || 0);
      }
    });
  });
}

export async function createMoment(
  creatorId: string,
  input: {
    mediaFileId: string;
    caption?: string;
    visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
    hashtags?: string[];
    mentions?: string[];
  }
) {
  const mediaFile = await prisma.mediaFile.findUnique({
    where: { id: input.mediaFileId },
    include: { variants: true }
  });

  if (!mediaFile || mediaFile.userId !== creatorId) {
    throw new Error('Invalid media file selection.');
  }

  // Get duration using ffprobe
  const duration = await getVideoDuration(mediaFile.rawPath);

  // Normalize visibility
  const visibility = input.visibility || 'PUBLIC';

  return await prisma.$transaction(async (tx) => {
    const moment = await tx.moment.create({
      data: {
        creatorId,
        mediaFileId: input.mediaFileId,
        caption: input.caption || null,
        visibility,
        duration,
      },
      include: {
        mediaFile: {
          include: {
            variants: true
          }
        },
        creator: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true
              }
            }
          }
        }
      }
    });

    // Write hashtags
    if (input.hashtags && input.hashtags.length > 0) {
      for (const tag of input.hashtags) {
        const cleanTag = tag.trim().toLowerCase().replace('#', '');
        if (cleanTag) {
          await tx.momentHashtag.create({
            data: {
              momentId: moment.id,
              tag: cleanTag
            }
          });
        }
      }
    }

    // Write mentions
    if (input.mentions && input.mentions.length > 0) {
      for (const username of input.mentions) {
        const cleanUsername = username.trim().toLowerCase().replace('@', '');
        const targetUser = await tx.profile.findUnique({
          where: { username: cleanUsername }
        });
        if (targetUser) {
          await tx.momentMention.create({
            data: {
              momentId: moment.id,
              userId: targetUser.userId
            }
          });
        }
      }
    }

    return moment;
  });
}

export async function getFeed(userId: string, cursor?: string, limit = 10) {
  // Chronological recommended feed for MVP
  const moments = await prisma.moment.findMany({
    where: {
      deletedAt: null,
      isPublished: true,
      visibility: 'PUBLIC'
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      mediaFile: {
        include: {
          variants: true
        }
      },
      creator: {
        select: {
          id: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true
            }
          }
        }
      },
      likes: {
        where: { userId },
        select: { id: true }
      },
      saves: {
        where: { userId },
        select: { id: true }
      }
    }
  });

  let nextCursor: string | null = null;
  if (moments.length > limit) {
    const nextItem = moments.pop();
    nextCursor = nextItem!.id;
  }

  const data = moments.map((m) => {
    const { likes, saves, creator, ...rest } = m;
    return {
      ...rest,
      creator: {
        id: creator.id,
        username: creator.profile?.username || '',
        displayName: creator.profile?.displayName || '',
        avatarUrl: creator.profile?.avatarUrl || null,
        isVerified: creator.profile?.isVerified || false,
      },
      viewerHasLiked: likes.length > 0,
      viewerHasSaved: saves.length > 0,
    };
  });

  return { data, nextCursor };
}

export async function toggleLike(userId: string, momentId: string) {
  const moment = await prisma.moment.findUnique({ where: { id: momentId } });
  if (!moment) {
    throw new Error('Moment not found.');
  }

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.momentLike.findUnique({
      where: {
        userId_momentId: { userId, momentId }
      }
    });

    if (existing) {
      await tx.momentLike.delete({ where: { id: existing.id } });
      const updated = await tx.moment.update({
        where: { id: momentId },
        data: { likeCount: { decrement: 1 } }
      });
      return { liked: false, likeCount: updated.likeCount };
    } else {
      await tx.momentLike.create({
        data: { userId, momentId }
      });
      const updated = await tx.moment.update({
        where: { id: momentId },
        data: { likeCount: { increment: 1 } }
      });
      return { liked: true, likeCount: updated.likeCount };
    }
  });
}

export async function createComment(
  authorId: string,
  momentId: string,
  input: { content: string; parentId?: string }
) {
  return await prisma.$transaction(async (tx) => {
    const comment = await tx.momentComment.create({
      data: {
        authorId,
        momentId,
        content: input.content,
        parentId: input.parentId || null
      },
      include: {
        author: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    await tx.moment.update({
      where: { id: momentId },
      data: { commentCount: { increment: 1 } }
    });

    return {
      id: comment.id,
      content: comment.content,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        username: comment.author.profile?.username || '',
        displayName: comment.author.profile?.displayName || '',
        avatarUrl: comment.author.profile?.avatarUrl || null,
      }
    };
  });
}

export async function getComments(momentId: string, cursor?: string, limit = 20) {
  const comments = await prisma.momentComment.findMany({
    where: { momentId },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: {
          id: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      }
    }
  });

  let nextCursor: string | null = null;
  if (comments.length > limit) {
    const nextItem = comments.pop();
    nextCursor = nextItem!.id;
  }

  const data = comments.map((c) => ({
    id: c.id,
    content: c.content,
    parentId: c.parentId,
    createdAt: c.createdAt,
    author: {
      id: c.author.id,
      username: c.author.profile?.username || '',
      displayName: c.author.profile?.displayName || '',
      avatarUrl: c.author.profile?.avatarUrl || null,
    }
  }));

  return { data, nextCursor };
}

export async function registerView(userId: string | null, momentId: string, watchTime: number, completed: boolean) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create MomentView details
    await tx.momentView.create({
      data: {
        momentId,
        userId,
        watchTime,
        completed
      }
    });

    // 2. Increment view count in Moment
    const moment = await tx.moment.update({
      where: { id: momentId },
      data: { viewCount: { increment: 1 } }
    });

    // 3. Upsert into daily MomentAnalytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await tx.momentAnalytics.upsert({
      where: {
        momentId_date: {
          momentId,
          date: today
        }
      },
      update: {
        views: { increment: 1 },
        watchTime: { increment: watchTime }
      },
      create: {
        momentId,
        date: today,
        views: 1,
        watchTime
      }
    });

    return moment;
  });
}

export async function getCreatorAnalytics(creatorId: string) {
  const moments = await prisma.moment.findMany({
    where: { creatorId, deletedAt: null },
    select: {
      id: true,
      duration: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      saveCount: true,
      caption: true,
      createdAt: true
    }
  });

  const totalMoments = moments.length;
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalSaves = 0;
  let totalWatchTime = 0;

  moments.forEach(m => {
    totalViews += m.viewCount;
    totalLikes += m.likeCount;
    totalComments += m.commentCount;
    totalSaves += m.saveCount;
  });

  // Query actual analytics breakdowns for these moments in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyBreakdown = await prisma.momentAnalytics.groupBy({
    by: ['date'],
    where: {
      momentId: { in: moments.map(m => m.id) },
      date: { gte: thirtyDaysAgo }
    },
    _sum: {
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: true,
      watchTime: true
    },
    orderBy: { date: 'asc' }
  });

  dailyBreakdown.forEach(day => {
    totalWatchTime += day._sum.watchTime || 0;
  });

  // Calculate engagement rate
  const reach = totalViews > 0 ? totalViews : 1;
  const engagement = totalLikes + totalComments + totalSaves;
  const engagementRate = ((engagement / reach) * 100).toFixed(2);

  return {
    summary: {
      totalMoments,
      totalViews,
      totalLikes,
      totalComments,
      totalSaves,
      totalWatchTime: Math.round(totalWatchTime),
      engagementRate: parseFloat(engagementRate)
    },
    momentsList: moments,
    dailyBreakdown: dailyBreakdown.map(d => ({
      date: d.date,
      views: d._sum.views || 0,
      likes: d._sum.likes || 0,
      watchTime: d._sum.watchTime || 0
    }))
  };
}

export async function getTrendingMoments(limit = 10) {
  // Sort moments by view count and like count for simple trending score
  const moments = await prisma.moment.findMany({
    where: {
      deletedAt: null,
      isPublished: true,
      visibility: 'PUBLIC'
    },
    take: limit,
    orderBy: [
      { viewCount: 'desc' },
      { likeCount: 'desc' }
    ],
    include: {
      mediaFile: {
        include: {
          variants: true
        }
      },
      creator: {
        select: {
          id: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true
            }
          }
        }
      }
    }
  });

  return moments.map((m) => {
    const { creator, ...rest } = m;
    return {
      ...rest,
      creator: {
        id: creator.id,
        username: creator.profile?.username || '',
        displayName: creator.profile?.displayName || '',
        avatarUrl: creator.profile?.avatarUrl || null,
        isVerified: creator.profile?.isVerified || false,
      }
    };
  });
}
