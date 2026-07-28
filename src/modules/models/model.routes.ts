import { Router } from 'express';
import { z } from 'zod';

import { AuthService } from '@/modules/auth/auth.service';
import { ModelService } from '@/modules/models/model.service';

const idSchema = z.string().trim().min(3).max(200).regex(/^[a-z0-9._-]+\/[a-zA-Z0-9._:-]+$/);
const createSchema = z.object({
  enabled: z.boolean().optional(),
  id: idSchema,
  isDefault: z.boolean().optional(),
  name: z.string().trim().min(1).max(120),
  provider: z.string().trim().min(1).max(80),
});
const updateSchema = createSchema.omit({ id: true }).partial().refine((value) => Object.keys(value).length > 0);

export function createModelRouter(auth: AuthService, models: ModelService) {
  const router = Router();

  router.use(['/models', '/admin/models'], async (request, response, next) => {
    const value = request.header('authorization');
    const user = value?.startsWith('Bearer ') ? await auth.getAuthenticatedUser(value.slice(7)) : null;
    if (!user) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }
    response.locals.user = user;
    next();
  });

  router.get('/models', async (_request, response) => {
    response.json(await models.listEnabled());
  });

  router.use('/admin/models', (_request, response, next) => {
    if (response.locals.user.role !== 'ADMIN') {
      response.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  });

  router.get('/admin/models', async (_request, response) => {
    response.json(await models.listAll());
  });

  router.post('/admin/models', async (request, response) => {
    response.status(201).json(await models.create(createSchema.parse(request.body)));
  });

  router.patch('/admin/models/:modelId', async (request, response) => {
    response.json(await models.update(decodeURIComponent(request.params.modelId), updateSchema.parse(request.body)));
  });

  return router;
}
