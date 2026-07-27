import { Router } from 'express';
import { z } from 'zod';

import { AuthService } from '@/modules/auth/auth.service';
import { ConversationService } from '@/modules/conversations/conversation.service';

const createSchema = z.object({
  modelId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

export function createConversationRouter(auth: AuthService, conversations: ConversationService) {
  const router = Router();

  router.use('/projects/:projectId/conversations', async (request, response, next) => {
    const authorization = request.header('authorization');
    const user = authorization?.startsWith('Bearer ')
      ? await auth.getAuthenticatedUser(authorization.slice('Bearer '.length))
      : null;

    if (!user) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    response.locals.user = user;
    next();
  });

  router.get('/projects/:projectId/conversations', async (request, response) => {
    const result = await conversations.list(response.locals.user.id, request.params.projectId);
    response.json(result);
  });

  router.post('/projects/:projectId/conversations', async (request, response) => {
    const result = await conversations.create(
      response.locals.user.id,
      request.params.projectId,
      createSchema.parse(request.body),
    );
    response.status(201).json(result);
  });

  return router;
}
