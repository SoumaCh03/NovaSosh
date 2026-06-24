import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth';
import * as messengerController from './messenger.controller';

export const messengerRouter = Router();

messengerRouter.use(requireAuth);

messengerRouter.post('/keys/device', messengerController.registerDevice);
messengerRouter.post('/keys/prekeys', messengerController.publishPreKeys);
messengerRouter.get('/keys/recipient/:userId', messengerController.getRecipientKeys);
messengerRouter.post('/conversations', messengerController.createConversation);
messengerRouter.get('/conversations', messengerController.getConversations);
messengerRouter.get('/conversations/:conversationId/messages', messengerController.getMessages);
messengerRouter.post('/messages', messengerController.sendMessage);
messengerRouter.put('/conversations/:conversationId/disappearing', messengerController.setDisappearingDuration);
messengerRouter.put('/messages/:messageId', messengerController.editMessage);
messengerRouter.delete('/messages/:messageId', messengerController.deleteMessage);
