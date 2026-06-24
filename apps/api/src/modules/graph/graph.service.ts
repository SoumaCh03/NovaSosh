import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/errors/AppError';

// -----------------------------------------------------------------
// FOLLOWERS & FOLLOWING
// -----------------------------------------------------------------

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new AppError('VALIDATION_ERROR', 'You cannot follow yourself');
  }

  // Check if target exists
  const target = await prisma.user.findUnique({ where: { id: followingId } });
  if (!target) throw new AppError('NOT_FOUND', 'Target user not found');

  // Check block status (if user is blocked, cannot follow)
  const isBlocked = await prisma.blockedUser.findFirst({
    where: { OR: [{ blockerId: followingId, blockedId: followerId }, { blockerId: followerId, blockedId: followingId }] }
  });
  if (isBlocked) throw new AppError('FORBIDDEN', 'Action restricted due to block');

  const existingFollow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } }
  });

  if (existingFollow) {
    return existingFollow; // Already following
  }

  return await prisma.$transaction(async (tx) => {
    const follow = await tx.follow.create({
      data: { followerId, followingId }
    });

    await tx.profile.update({
      where: { userId: followerId },
      data: { followingCount: { increment: 1 } }
    });

    await tx.profile.update({
      where: { userId: followingId },
      data: { followerCount: { increment: 1 } }
    });

    // Note: Here is where we would trigger a Notification creation
    return follow;
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  const existingFollow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } }
  });

  if (!existingFollow) return;

  await prisma.$transaction(async (tx) => {
    await tx.follow.delete({
      where: { followerId_followingId: { followerId, followingId } }
    });

    await tx.profile.update({
      where: { userId: followerId },
      data: { followingCount: { decrement: 1 } }
    });

    await tx.profile.update({
      where: { userId: followingId },
      data: { followerCount: { decrement: 1 } }
    });
  });
}

// -----------------------------------------------------------------
// FRIEND REQUESTS
// -----------------------------------------------------------------

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) throw new AppError('VALIDATION_ERROR', 'Cannot friend yourself');

  const isBlocked = await prisma.blockedUser.findFirst({
    where: { OR: [{ blockerId: addresseeId, blockedId: requesterId }, { blockerId: requesterId, blockedId: addresseeId }] }
  });
  if (isBlocked) throw new AppError('FORBIDDEN', 'Action restricted due to block');

  const existingReq = await prisma.friendRelationship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId }
      ]
    }
  });

  if (existingReq) {
    if (existingReq.status === 'ACCEPTED') throw new AppError('CONFLICT', 'Already friends');
    if (existingReq.status === 'PENDING') throw new AppError('CONFLICT', 'Friend request already exists');
    if (existingReq.status === 'DECLINED') {
      // Allow sending again if previously rejected
      return await prisma.friendRelationship.update({
        where: { id: existingReq.id },
        data: { status: 'PENDING', requesterId, addresseeId } // swap roles if needed
      });
    }
  }

  const req = await prisma.friendRelationship.create({
    data: { requesterId, addresseeId, status: 'PENDING' }
  });

  // Trigger Notification to addresseeId

  return req;
}

export async function acceptFriendRequest(userId: string, requestId: string) {
  const req = await prisma.friendRelationship.findUnique({ where: { id: requestId } });
  if (!req || req.addresseeId !== userId || req.status !== 'PENDING') {
    throw new AppError('NOT_FOUND', 'Valid friend request not found');
  }

  return await prisma.$transaction(async (tx) => {
    const acceptedReq = await tx.friendRelationship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' }
    });

    await tx.profile.update({
      where: { userId: req.requesterId },
      data: { friendsCount: { increment: 1 } }
    });
    await tx.profile.update({
      where: { userId: req.addresseeId },
      data: { friendsCount: { increment: 1 } }
    });

    return acceptedReq;
  });
}

export async function rejectFriendRequest(userId: string, requestId: string) {
  const req = await prisma.friendRelationship.findUnique({ where: { id: requestId } });
  if (!req || req.addresseeId !== userId || req.status !== 'PENDING') {
    throw new AppError('NOT_FOUND', 'Valid friend request not found');
  }

  return await prisma.friendRelationship.update({
    where: { id: requestId },
    data: { status: 'DECLINED' }
  });
}

export async function cancelFriendRequest(userId: string, requestId: string) {
  const req = await prisma.friendRelationship.findUnique({ where: { id: requestId } });
  if (!req || req.requesterId !== userId || req.status !== 'PENDING') {
    throw new AppError('NOT_FOUND', 'Valid friend request not found');
  }

  await prisma.friendRelationship.delete({ where: { id: requestId } });
}

export async function removeFriend(userId: string, friendId: string) {
  const req = await prisma.friendRelationship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId }
      ]
    }
  });

  if (!req) throw new AppError('NOT_FOUND', 'Friendship not found');

  await prisma.$transaction(async (tx) => {
    await tx.friendRelationship.delete({ where: { id: req.id } });
    await tx.profile.update({
      where: { userId },
      data: { friendsCount: { decrement: 1 } }
    });
    await tx.profile.update({
      where: { userId: friendId },
      data: { friendsCount: { decrement: 1 } }
    });
  });
}

// -----------------------------------------------------------------
// FETCH LISTS
// -----------------------------------------------------------------

export async function getFollowers(userId: string, skip = 0, take = 50) {
  return await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: { select: { id: true, profile: { select: { displayName: true, username: true, avatarUrl: true, isVerified: true } } } }
    },
    skip, take, orderBy: { createdAt: 'desc' }
  });
}

export async function getFollowing(userId: string, skip = 0, take = 50) {
  return await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: { select: { id: true, profile: { select: { displayName: true, username: true, avatarUrl: true, isVerified: true } } } }
    },
    skip, take, orderBy: { createdAt: 'desc' }
  });
}

export async function getFriends(userId: string, skip = 0, take = 50) {
  const friends = await prisma.friendRelationship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, profile: { select: { displayName: true, username: true, avatarUrl: true, isVerified: true } } } },
      addressee: { select: { id: true, profile: { select: { displayName: true, username: true, avatarUrl: true, isVerified: true } } } }
    },
    skip, take, orderBy: { createdAt: 'desc' }
  });

  return friends.map(f => f.requesterId === userId ? f.addressee : f.requester);
}
