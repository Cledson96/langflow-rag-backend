import { Router } from 'express';
import { z } from 'zod';

import { AgentMemoryRepository } from '@/modules/agent/agent-memory.repository';
import { AgentSoulRepository } from '@/modules/agent/agent-soul.repository';
import { AuthService } from '@/modules/auth/auth.service';
import { ProjectRepository } from '@/modules/projects/project.repository';

const uuidSchema = z.uuid();
const soulSchema = z
  .object({
    companyContext: z.string().trim().min(20).max(20_000).optional(),
    instructions: z.string().trim().min(20).max(20_000).optional(),
    name: z.string().trim().min(1).max(80).optional(),
    personality: z.string().trim().min(20).max(10_000).optional(),
    role: z.string().trim().min(3).max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export function createAgentRouter(
  auth: AuthService,
  souls: AgentSoulRepository,
  memories: AgentMemoryRepository,
  projects: ProjectRepository,
) {
  const router = Router();

  router.use(
    ['/agent', '/admin/agent', '/me/memories', '/projects/:projectId/memories'],
    async (request, response, next) => {
      const value = request.header('authorization');
      const user = value?.startsWith('Bearer ') ? await auth.getAuthenticatedUser(value.slice(7)) : null;
      if (!user) {
        response.status(401).json({ error: 'unauthorized' });
        return;
      }
      response.locals.user = user;
      next();
    },
  );

  router.get('/agent/soul', async (_request, response) => {
    response.json(await souls.getOrCreate());
  });

  router.patch('/admin/agent/soul', async (request, response) => {
    if (response.locals.user.role !== 'ADMIN') {
      response.status(403).json({ error: 'forbidden' });
      return;
    }
    response.json(await souls.update(soulSchema.parse(request.body)));
  });

  router.get('/me/memories', async (_request, response) => {
    response.json(await memories.listUserMemories(response.locals.user.id));
  });

  router.delete('/me/memories/:memoryId', async (request, response) => {
    const result = await memories.archiveUserMemory(
      uuidSchema.parse(request.params.memoryId),
      response.locals.user.id,
    );
    if (!result.count) {
      response.status(404).json({ error: 'memory_not_found' });
      return;
    }
    response.json({ archived: true });
  });

  router.use('/projects/:projectId/memories', async (request, response, next) => {
    const projectId = uuidSchema.parse(request.params.projectId);
    const membership = await projects.isMember(projectId, response.locals.user.id);
    if (!membership) {
      response.status(404).json({ error: 'project_not_found' });
      return;
    }
    response.locals.projectId = projectId;
    response.locals.projectMembership = membership;
    next();
  });

  router.get('/projects/:projectId/memories', async (_request, response) => {
    response.json(await memories.listProjectMemories(response.locals.projectId));
  });

  router.delete('/projects/:projectId/memories/:memoryId', async (request, response) => {
    const canManage =
      response.locals.user.role === 'ADMIN' || response.locals.projectMembership.role === 'OWNER';
    if (!canManage) {
      response.status(403).json({ error: 'forbidden' });
      return;
    }
    const result = await memories.archiveProjectMemory(
      uuidSchema.parse(request.params.memoryId),
      response.locals.projectId,
    );
    if (!result.count) {
      response.status(404).json({ error: 'memory_not_found' });
      return;
    }
    response.json({ archived: true });
  });

  return router;
}
