import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@/generated/prisma';
import { AuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { UserRepository } from '@/modules/users/user.repository';
import { createServer } from '@/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app_test';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const authService = new AuthService(new UserRepository(prisma), {
  expiresIn: '1h',
  secret: 'a-test-secret-that-is-long-enough-for-jwt',
});

beforeAll(async () => {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth routes', () => {
  it('registers a user without returning the password hash', async () => {
    const response = await request(createServer({ authRouter: createAuthRouter(authService) }))
      .post('/auth/register')
      .send({
        email: `user-${randomUUID()}@example.com`,
        password: 'senha-segura-123',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ token: expect.any(String), user: { email: expect.any(String) } });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns the authenticated user from a bearer token', async () => {
    const app = createServer({ authRouter: createAuthRouter(authService) });
    const registration = await request(app)
      .post('/auth/register')
      .send({
        email: `user-${randomUUID()}@example.com`,
        password: 'senha-segura-123',
      });

    const response = await request(app).get('/me').set('Authorization', `Bearer ${registration.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(registration.body.user);
  });
});
