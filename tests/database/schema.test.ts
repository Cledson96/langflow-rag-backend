import { randomUUID } from 'node:crypto';

import { MessageRole, PrismaClient, ProjectRole } from '@/generated/prisma';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app_test';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

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

describe('Prisma schema', () => {
  it('keeps membership unique and persists conversation messages', async () => {
    const user = await prisma.user.create({
      data: {
        email: `user-${randomUUID()}@example.com`,
        passwordHash: 'hash',
      },
    });
    const project = await prisma.project.create({
      data: {
        createdByUserId: user.id,
        name: 'Projeto RAG',
        slug: `projeto-rag-${randomUUID()}`,
      },
    });

    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        role: ProjectRole.OWNER,
        userId: user.id,
      },
    });

    await expect(
      prisma.projectMember.create({
        data: {
          projectId: project.id,
          role: ProjectRole.MEMBER,
          userId: user.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    const conversation = await prisma.conversation.create({
      data: {
        createdByUserId: user.id,
        modelId: 'openai/gpt-4.1-mini',
        projectId: project.id,
      },
    });
    const message = await prisma.message.create({
      data: {
        content: 'O que é RAG?',
        conversationId: conversation.id,
        role: MessageRole.USER,
      },
    });

    expect(message.content).toBe('O que é RAG?');
  });
});
