import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/errors/AppError';
import { CreatePostInput, CreateCommentInput } from './posts.validation';
import { getBlockedUserIds, getFriendIds, getFriendsOfFriendsIds } from '../privacy/privacy.service';
import { createNotification } from '../notifications/notifications.service';

export async function createPost(authorId: string, input: CreatePostInput) {
  return await prisma.$transaction(async (tx) => {
    // Build media create payload
    let mediaCreate: any = undefined;

    if (input.mediaUrls && input.mediaUrls.length > 0) {
      mediaCreate = {
        create: input.mediaUrls.map((url, idx) => ({
          type: input.type === 'IMAGE' ? 'IMAGE' : 'VIDEO',
          rawUrl: url,
          order: idx,
        })),
      };
    } else if (input.mediaFileId) {
      // Device-uploaded file: link the MediaFile raw URL as a MediaAsset
      const mediaFile = await tx.mediaFile.findUnique({
        where: { id: input.mediaFileId },
        select: { rawUrl: true, mimeType: true },
      });
      if (mediaFile) {
        mediaCreate = {
          create: [{
            type: mediaFile.mimeType.startsWith('image/') ? 'IMAGE' : 'VIDEO',
            rawUrl: mediaFile.rawUrl,
            order: 0,
          }],
        };
      }
    }

    // 1. Create the post with visibility
    const post = await tx.post.create({
      data: {
        authorId,
        type: input.type as any,
        caption: input.caption || null,
        visibility: (input.visibility as any) || 'PUBLIC',
        media: mediaCreate,
        ...(input.type === 'POLL' && input.pollOptions ? {
          poll: {
            create: {
              options: {
                create: input.pollOptions.map(opt => ({ text: opt }))
              }
            }
          }
        } : {})
      },
      include: {
        media: true,
        poll: { include: { options: true } },
        author: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    // 2. Increment user profile post count
    await tx.profile.update({
      where: { userId: authorId },
      data: { postsCount: { increment: 1 } },
    });

    return post;
  });
}

export async function getFeed(userId: string, type: 'recommended' | 'following', cursor?: string, limit = 10) {
  // 1. Get block list and friend graph for privacy filtering
  const blockedIds = await getBlockedUserIds(userId);
  const friendIds = await getFriendIds(userId);
  const fofIds = await getFriendsOfFriendsIds(userId, friendIds, blockedIds);

  // 2. Build privacy-aware where clause
  // A post is visible to userId if:
  //   - authorId === userId (own posts always visible)
  //   - visibility is PUBLIC
  //   - visibility is FRIENDS and author is a friend
  //   - visibility is FRIENDS_OF_FRIENDS and author is a friend or friend-of-friend
  //   - visibility is ONLY_ME and authorId === userId (handled by first rule)
  //   - Author is NOT in the blocked list
  const visibilityFilter: any[] = [
    { authorId: userId }, // Always see own posts
    { visibility: 'PUBLIC' },
  ];

  if (friendIds.length > 0) {
    visibilityFilter.push({
      visibility: 'FRIENDS',
      authorId: { in: friendIds },
    });
    visibilityFilter.push({
      visibility: 'FRIENDS_OF_FRIENDS',
      authorId: { in: friendIds },
    });
  }

  if (fofIds.length > 0) {
    visibilityFilter.push({
      visibility: 'FRIENDS_OF_FRIENDS',
      authorId: { in: fofIds },
    });
  }

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
      OR: visibilityFilter,
      ...(blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {}),
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    // Note: In-memory sorting for MVP Algorithm since Prisma doesn't natively support dynamic calculated fields in orderBy easily without raw queries.
    // We fetch recent posts and then sort them in TS if type === 'recommended'.
    orderBy: { createdAt: 'desc' },
    include: {
      media: true,
      author: {
        select: {
          id: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      },
      likes: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    const nextItem = posts.pop();
    nextCursor = nextItem!.id;
  }

  // Algorithmic Sorting
  if (type === 'recommended') {
    posts.sort((a, b) => {
      const scoreA = (a.likeCount * 2) + (a.commentCount * 3) + (a.shareCount * 5);
      const scoreB = (b.likeCount * 2) + (b.commentCount * 3) + (b.shareCount * 5);
      // Give recency a slight boost
      const ageA = Date.now() - new Date(a.createdAt).getTime();
      const ageB = Date.now() - new Date(b.createdAt).getTime();
      const finalA = scoreA - (ageA / 10000000);
      const finalB = scoreB - (ageB / 10000000);
      return finalB - finalA;
    });
  }

  // Format payload and add helper properties
  const data = posts.map((post) => {
    const { likes, author, ...rest } = post;
    return {
      ...rest,
      author: {
        id: author.id,
        username: author.profile?.username || '',
        displayName: author.profile?.displayName || '',
        avatarUrl: author.profile?.avatarUrl || null,
        isVerified: author.profile?.isVerified || false,
      },
      viewerHasLiked: likes.length > 0,
    };
  });

  return { data, nextCursor };
}

export async function toggleLikePost(userId: string, postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new AppError('NOT_FOUND', 'Post not found');
  }

  return await prisma.$transaction(async (tx) => {
    // Check if like exists
    const existing = await tx.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      // Remove Like
      await tx.like.delete({ where: { id: existing.id } });
      const updated = await tx.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false, likeCount: updated.likeCount };
    } else {
      // Add Like
      await tx.like.create({
        data: { userId, postId },
      });
      const updated = await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });
      
      // Notify post author (non-blocking)
      createNotification(post.authorId, userId, 'LIKE', 'post', postId).catch(e => console.error(e));

      return { liked: true, likeCount: updated.likeCount };
    }
  });
}

export async function createComment(userId: string, postId: string, input: CreateCommentInput) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new AppError('NOT_FOUND', 'Post not found');
  }

  return await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        authorId: userId,
        postId,
        content: input.content,
      },
      include: {
        author: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    // Notify post author (non-blocking)
    createNotification(post.authorId, userId, 'COMMENT', 'post', postId).catch(e => console.error(e));

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        username: comment.author.profile?.username || '',
        displayName: comment.author.profile?.displayName || '',
        avatarUrl: comment.author.profile?.avatarUrl || null,
        isVerified: comment.author.profile?.isVerified || false,
      },
    };
  });
}

export async function getComments(postId: string, cursor?: string, limit = 20) {
  const comments = await prisma.comment.findMany({
    where: { postId, deletedAt: null },
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
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (comments.length > limit) {
    const nextItem = comments.pop();
    nextCursor = nextItem!.id;
  }

  const data = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: {
      id: comment.author.id,
      username: comment.author.profile?.username || '',
      displayName: comment.author.profile?.displayName || '',
      avatarUrl: comment.author.profile?.avatarUrl || null,
      isVerified: comment.author.profile?.isVerified || false,
    },
  }));

  return { data, nextCursor };
}

export async function updatePost(userId: string, postId: string, input: any) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError('NOT_FOUND', 'Post not found');
  if (post.authorId !== userId) throw new AppError('FORBIDDEN', 'Not authorized to edit this post');

  const dataToUpdate: any = { isEdited: true };
  if (input.caption !== undefined) dataToUpdate.caption = input.caption;
  if (input.visibility !== undefined) dataToUpdate.visibility = input.visibility;

  return await prisma.post.update({
    where: { id: postId },
    data: dataToUpdate,
    include: {
      media: true,
      author: { select: { id: true, profile: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } } }
    }
  });
}

export async function updatePrivacy(userId: string, postId: string, visibility: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError('NOT_FOUND', 'Post not found');
  if (post.authorId !== userId) throw new AppError('FORBIDDEN', 'Not authorized to edit this post');

  return await prisma.post.update({
    where: { id: postId },
    data: { visibility: visibility as any },
  });
}

export async function deletePost(userId: string, postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError('NOT_FOUND', 'Post not found');
  if (post.authorId !== userId) throw new AppError('FORBIDDEN', 'Not authorized to delete this post');

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  });

  await prisma.profile.update({
    where: { userId },
    data: { postsCount: { decrement: 1 } },
  });

  return { success: true };
}

export async function sharePostToTimeline(userId: string, postId: string, input: any) {
  const originalPost = await prisma.post.findUnique({ where: { id: postId, deletedAt: null } });
  if (!originalPost) throw new AppError('NOT_FOUND', 'Original post not found');
  
  // Create a new post that references the original
  const newPost = await prisma.post.create({
    data: {
      authorId: userId,
      type: originalPost.type, // inherit type or set to a custom 'SHARE' type if we had one
      caption: input.caption || null,
      visibility: input.visibility || 'PUBLIC',
      sharedPostId: postId,
    },
    include: {
      author: { select: { id: true, profile: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } } },
      sharedPost: {
        include: {
          author: { select: { id: true, profile: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } } },
          media: true,
        }
      }
    }
  });

  await prisma.profile.update({
    where: { userId },
    data: { postsCount: { increment: 1 } },
  });

  await prisma.post.update({
    where: { id: postId },
    data: { shareCount: { increment: 1 } },
  });

  // Notify original author
  createNotification(originalPost.authorId, userId, 'SHARE', 'post', postId).catch(e => console.error(e));

  return newPost;
}
