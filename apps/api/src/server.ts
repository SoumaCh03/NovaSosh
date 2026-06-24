import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './shared/lib/logger';
import { authRouter } from './modules/auth/auth.routes';
import { postsRouter } from './modules/posts/posts.routes';
import { profilesRouter } from './modules/profiles/profiles.routes';
import { graphRouter } from './modules/graph/graph.routes';
import { mediaRouter } from './modules/media/media.routes';
import { privacyRouter } from './modules/privacy/privacy.routes';
import { messengerRouter } from './modules/messenger/messenger.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import moderationRoutes from './modules/moderation/moderation.routes';

const app = createApp();
const server = http.createServer(app);

// Mount API v1 routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/profiles', profilesRouter);
app.use('/api/v1/graph', graphRouter);
app.use('/api/v1/media', mediaRouter);
app.use('/api/v1/privacy', privacyRouter);
app.use('/api/v1/messenger', messengerRouter);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/moderation', moderationRoutes);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

// Realtime Namespaces Setup (realtime architecture)
const messagingNamespace = io.of('/messaging');
const notificationsNamespace = io.of('/notifications');
const presenceNamespace = io.of('/presence');

messagingNamespace.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected to messaging namespace');

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(conversationId);
    logger.info({ socketId: socket.id, conversationId }, 'Joined conversation');
  });

  socket.on('send_message', (data: { conversationId: string; message: any }) => {
    socket.to(data.conversationId).emit('receive_message', data.message);
  });

  // WebRTC Signaling for Phase 11 Calls
  socket.on('webrtc_offer', (data: { conversationId: string; offer: any; callerId: string }) => {
    socket.to(data.conversationId).emit('webrtc_offer_received', data);
  });

  socket.on('webrtc_answer', (data: { conversationId: string; answer: any; responderId: string }) => {
    socket.to(data.conversationId).emit('webrtc_answer_received', data);
  });

  socket.on('webrtc_ice_candidate', (data: { conversationId: string; candidate: any }) => {
    socket.to(data.conversationId).emit('webrtc_ice_candidate_received', data);
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected from messaging namespace');
  });
});

server.listen(env.PORT, () => {
  logger.info(`[NOVA API] Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
