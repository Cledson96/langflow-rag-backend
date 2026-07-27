import { randomUUID } from 'node:crypto';

import { jwtVerify } from 'jose';
import { PrismaClient } from '@/generated/prisma';
import { AuthService } from '@/modules/auth/auth.service';
import { UserRepository } from '@/modules/users/user.repository';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app_test';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const jwtSecret = 'a-test-secret-that-is-long-enough-for-jwt';
const authService = new AuthService(new UserRepository(prisma), {
  expiresIn: '1h',
  secret: jwtSecret,
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

describe('AuthService', () => {
  it('registers a user with a hash and a JWT containing only identity claims', async () => {
    const email = `user-${randomUUID()}@example.com`;

    const result = await authService.register({
      email,
      name: 'Cledson',
      password: 'senha-segura-123',
    });

    const persistedUser = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
    const payload = await jwtVerify(result.token, new TextEncoder().encode(jwtSecret));

    expect(persistedUser.passwordHash).not.toBe('senha-segura-123');
    expect(payload.payload).toMatchObject({ email, sub: result.user.id });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('authenticates with the registered password', async () => {
    const email = `user-${randomUUID()}@example.com`;
    await authService.register({ email, password: 'senha-segura-123' });

    const result = await authService.login({ email, password: 'senha-segura-123' });

    expect(result.user.email).toBe(email);
    await expect(jwtVerify(result.token, new TextEncoder().encode(jwtSecret))).resolves.toBeDefined();
  });
});
