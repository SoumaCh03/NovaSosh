import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/requireAuth';
import * as messengerService from './messenger.service';

export async function registerDevice(req: AuthenticatedRequest, res: Response) {
  const { deviceIdentifier, registrationId, identityKeyPub, signedPreKeyId, signedPreKeyPub, signedPreKeySig } = req.body;
  const device = await messengerService.registerDevice({
    userId: req.userId!,
    deviceIdentifier,
    registrationId,
    identityKeyPub,
    signedPreKeyId,
    signedPreKeyPub,
    signedPreKeySig,
  });
  res.json({ success: true, deviceId: device.id });
}

export async function publishPreKeys(req: AuthenticatedRequest, res: Response) {
  const { deviceId, preKeys } = req.body;
  const result = await messengerService.publishPreKeys({ deviceId, preKeys });
  res.json(result);
}

export async function getRecipientKeys(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.params;
  const keys = await messengerService.fetchRecipientKeys(userId);
  res.json({ keys });
}

export async function createConversation(req: AuthenticatedRequest, res: Response) {
  const { participantIds, type, title } = req.body;
  const conversation = await messengerService.createConversation(req.userId!, participantIds, type, title);
  res.json({ conversation });
}

export async function getConversations(req: AuthenticatedRequest, res: Response) {
  const conversations = await messengerService.getConversations(req.userId!);
  res.json({ conversations });
}

export async function getMessages(req: AuthenticatedRequest, res: Response) {
  const { conversationId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = parseInt(req.query.skip as string) || 0;
  const messages = await messengerService.getMessages(conversationId, req.userId!, skip, limit);
  res.json({ messages });
}

export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  const { conversationId, encryptedContent, isForwarded, replyToId } = req.body;
  const message = await messengerService.saveEncryptedMessage(req.userId!, conversationId, encryptedContent, isForwarded, replyToId);
  res.json({ message });
}

export async function setDisappearingDuration(req: AuthenticatedRequest, res: Response) {
  const { conversationId } = req.params;
  const { duration } = req.body; // duration in seconds
  const result = await messengerService.setDisappearingDuration(conversationId, req.userId!, duration);
  res.json({ success: true, duration: result.disappearingDuration });
}

export async function editMessage(req: AuthenticatedRequest, res: Response) {
  const { messageId } = req.params;
  const { encryptedContent } = req.body;
  const result = await messengerService.editMessage(messageId, req.userId!, encryptedContent);
  res.json({ success: true, message: result });
}

export async function deleteMessage(req: AuthenticatedRequest, res: Response) {
  const { messageId } = req.params;
  const result = await messengerService.deleteMessageForEveryone(messageId, req.userId!);
  res.json({ success: true, message: result });
}

