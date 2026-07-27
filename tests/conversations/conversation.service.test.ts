import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@/generated/prisma';
import { ConversationService } from '@/modules/conversations/conversation.service';
import { ConversationRepository } from '@/modules/conversations/conversation.repository';
import { ProjectRepository } from '@/modules/projects/project.repository';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app_test';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const projects = new ProjectRepository(prisma);
const conversations = new ConversationService(new ConversationRepository(prisma), projects, ['openai/gpt-4.1-mini']);

beforeAll(async () => {
  await prisma.message.deleteMany(); await prisma.conversation.deleteMany(); await prisma.projectMember.deleteMany(); await prisma.project.deleteMany(); await prisma.user.deleteMany();
});
afterAll(async () => prisma.$disconnect());

describe('ConversationService', () => {
  it('creates a conversation only for a project member and stores its model', async () => {
    const user = await prisma.user.create({ data: { email: `u-${randomUUID()}@example.com`, passwordHash: 'hash' } });
    const project = await projects.createWithOwner({ name: 'Projeto', slug: `p-${randomUUID()}`, userId: user.id });

    const conversation = await conversations.create(user.id, project.id, { modelId: 'openai/gpt-4.1-mini', title: 'Primeira conversa' });

    expect(conversation).toMatchObject({ createdByUserId: user.id, projectId: project.id, modelId: 'openai/gpt-4.1-mini' });
  });
});
