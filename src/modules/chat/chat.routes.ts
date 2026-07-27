import { Router } from 'express';
import { z } from 'zod';

import { AuthService } from '@/modules/auth/auth.service';
import { ChatService } from '@/modules/chat/chat.service';

const messageSchema = z.object({ content: z.string().trim().min(1).max(20_000) });

export function createChatRouter(auth: AuthService, chat: ChatService) {
  const router = Router();
  router.use('/projects/:projectId/conversations/:conversationId/messages', async (request, response, next) => {
    const value = request.header('authorization');
    const user = value?.startsWith('Bearer ') ? await auth.getAuthenticatedUser(value.slice(7)) : null;
    if (!user) { response.status(401).json({ error: 'unauthorized' }); return; }
    response.locals.user = user; next();
  });
  router.get('/projects/:projectId/conversations/:conversationId/messages', async (request, response) => {
    response.json(await chat.listMessages(response.locals.user.id, request.params.projectId, request.params.conversationId));
  });
  router.post('/projects/:projectId/conversations/:conversationId/messages', async (request, response) => {
    response.status(201).json(await chat.send(response.locals.user.id, request.params.projectId, request.params.conversationId, messageSchema.parse(request.body).content));
  });
  return router;
}
