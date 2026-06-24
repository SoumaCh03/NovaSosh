import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as graphController from './graph.controller';

export const graphRouter = Router();

graphRouter.use(requireAuth);

graphRouter.post('/follow/:targetId', graphController.followUser);
graphRouter.delete('/follow/:targetId', graphController.unfollowUser);

graphRouter.post('/friend/:targetId', graphController.sendFriendRequest);
graphRouter.delete('/friend/:targetId', graphController.removeFriend);

graphRouter.patch('/friend/requests/:requestId/accept', graphController.acceptFriendRequest);
graphRouter.patch('/friend/requests/:requestId/reject', graphController.rejectFriendRequest);
graphRouter.delete('/friend/requests/:requestId/cancel', graphController.cancelFriendRequest);

graphRouter.get('/:userId/followers', graphController.getFollowers);
graphRouter.get('/:userId/following', graphController.getFollowing);
graphRouter.get('/:userId/friends', graphController.getFriends);
