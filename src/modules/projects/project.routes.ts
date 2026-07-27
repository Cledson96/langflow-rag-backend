import { Router } from 'express';
import { z } from 'zod';

import { AuthService } from '@/modules/auth/auth.service';
import { ProjectService } from '@/modules/projects/project.service';

const schema = z.object({ name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(120) });

export function createProjectRouter(auth: AuthService, projects: ProjectService) {
  const router = Router();
  router.use('/projects', async (request, response, next) => {
    const value = request.header('authorization');
    const user = value?.startsWith('Bearer ') ? await auth.getAuthenticatedUser(value.slice(7)) : null;
    if (!user) return response.status(401).json({ error: 'unauthorized' });
    response.locals.user = user;
    next();
  });
  router.get('/projects', async (_request, response) => response.json(await projects.listForUser(response.locals.user.id)));
  router.post('/projects', async (request, response) => response.status(201).json(await projects.create(response.locals.user.id, schema.parse(request.body))));
  return router;
}
