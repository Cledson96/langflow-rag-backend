import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '@/modules/auth/auth.service';
import { createModelRouter } from '@/modules/models/model.routes';
import { ModelService } from '@/modules/models/model.service';
import { createServer } from '@/server';

function testApp() {
  const auth = {
    getAuthenticatedUser: vi.fn(async (token: string) => {
      if (token === 'admin-token') return { id: 'admin-1', role: 'ADMIN' };
      if (token === 'user-token') return { id: 'user-1', role: 'USER' };
      return null;
    }),
  } as unknown as AuthService;
  const models = {
    create: vi.fn(async (input) => ({ ...input, createdAt: new Date(), updatedAt: new Date() })),
    listAll: vi.fn(async () => []),
    listEnabled: vi.fn(async () => []),
    update: vi.fn(async (id, input) => ({ id, ...input })),
  } as unknown as ModelService;

  return { app: createServer({ modelRouter: createModelRouter(auth, models) }), models };
}

describe('model routes', () => {
  it('keeps the catalog public to authenticated users but protects administration', async () => {
    const { app } = testApp();

    expect((await request(app).get('/models')).status).toBe(401);
    expect((await request(app).get('/models').set('Authorization', 'Bearer user-token')).status).toBe(200);
    expect((await request(app).get('/admin/models').set('Authorization', 'Bearer user-token')).status).toBe(403);
    expect((await request(app).get('/admin/models').set('Authorization', 'Bearer admin-token')).status).toBe(200);
  });

  it('creates and updates provider/model identifiers containing a slash', async () => {
    const { app, models } = testApp();
    const input = { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' };

    const created = await request(app)
      .post('/admin/models')
      .set('Authorization', 'Bearer admin-token')
      .send(input);
    expect(created.status).toBe(201);
    expect(models.create).toHaveBeenCalledWith(input);

    const updated = await request(app)
      .patch('/admin/models/openai%2Fgpt-4.1-mini')
      .set('Authorization', 'Bearer admin-token')
      .send({ enabled: false });
    expect(updated.status).toBe(200);
    expect(models.update).toHaveBeenCalledWith('openai/gpt-4.1-mini', { enabled: false });
  });
});
