import { Router } from 'express';
import { z } from 'zod';

import { AuthService } from '@/modules/auth/auth.service';
import { GoogleOAuthService } from '@/modules/google/google-oauth.service';

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
const exchangeSchema = z.object({ code: z.string().min(1) });

async function authenticatedUser(request: { header(name: string): string | undefined }, auth: AuthService) {
  const authorization = request.header('authorization');
  return authorization?.startsWith('Bearer ')
    ? auth.getAuthenticatedUser(authorization.slice('Bearer '.length))
    : null;
}

export function createGoogleRouter(auth: AuthService, google: GoogleOAuthService) {
  const router = Router();

  router.get('/auth/google/start', async (_request, response) => {
    response.json({ url: await google.createAuthorizationUrl('login') });
  });

  router.post('/auth/google/exchange', async (request, response) => {
    const { code } = exchangeSchema.parse(request.body);
    response.json(await auth.exchangeGoogleLoginHandoff(code));
  });

  router.get('/integrations/google/start', async (request, response) => {
    const user = await authenticatedUser(request, auth);
    if (!user) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    response.json({ url: await google.createAuthorizationUrl('connect', user.id) });
  });

  router.get('/integrations/google/callback', async (request, response) => {
    try {
      const { code, state } = callbackSchema.parse(request.query);
      response.redirect(303, await google.handleCallback(code, state));
    } catch {
      response.redirect(303, 'https://app-langflow.cledson.com.br/login?google=error');
    }
  });

  router.get('/integrations/google', async (request, response) => {
    const user = await authenticatedUser(request, auth);
    if (!user) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    response.json(await google.getConnection(user.id));
  });

  router.delete('/integrations/google', async (request, response) => {
    const user = await authenticatedUser(request, auth);
    if (!user) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    await google.disconnect(user.id);
    response.json({ disconnected: true });
  });

  return router;
}
