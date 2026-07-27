import { Router } from 'express';
import { z } from 'zod';

import { AuthService } from '@/modules/auth/auth.service';

const registerSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(12).max(256),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(256),
});

export function createAuthRouter(authService: AuthService) {
  const router = Router();

  router.post('/auth/register', async (request, response) => {
    const input = registerSchema.parse(request.body);
    const result = await authService.register(input);

    response.status(201).json(result);
  });

  router.post('/auth/login', async (request, response) => {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);

    response.status(200).json(result);
  });

  router.get('/me', async (request, response) => {
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;

    if (!token) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    const user = await authService.getAuthenticatedUser(token);

    if (!user) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    response.status(200).json(user);
  });

  return router;
}
