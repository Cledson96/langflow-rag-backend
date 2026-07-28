import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@/generated/prisma';
import type { LangflowRunner } from '@/infrastructure/langflow/langflow-client';
import { ChatService } from '@/modules/chat/chat.service';
import { ConversationRepository } from '@/modules/conversations/conversation.repository';
import { ProjectRepository } from '@/modules/projects/project.repository';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app_test';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const projects = new ProjectRepository(prisma);
const conversations = new ConversationRepository(prisma);

class FakeLangflowRunner implements LangflowRunner {
  readonly inputs: Array<{ conversationId: string; modelId: string; projectId: string; userId: string; value: string }> = [];

  async run(input: { conversationId: string; modelId: string; projectId: string; userId: string; value: string }) {
    this.inputs.push(input);
    return { content: 'Resposta recuperada', metadata: { sources: ['README.md'] } };
  }
}

beforeAll(async () => {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => prisma.$disconnect());

describe('ChatService', () => {
  it('persists user and assistant messages and passes trusted conversation context to Langflow', async () => {
    const user = await prisma.user.create({ data: { email: `user-${randomUUID()}@example.com`, passwordHash: 'hash' } });
    const project = await projects.createWithOwner({ name: 'Projeto', slug: `project-${randomUUID()}`, userId: user.id });
    const conversation = await conversations.create({
      createdByUserId: user.id,
      modelId: 'openai/gpt-4.1-mini',
      projectId: project.id,
    });
    const runner = new FakeLangflowRunner();
    const service = new ChatService(conversations, projects, runner);

    const result = await service.send(user.id, project.id, conversation.id, 'O que é RAG?');

    expect(result.userMessage).toMatchObject({ content: 'O que é RAG?', role: 'USER' });
    expect(result.assistantMessage).toMatchObject({
      content: 'Resposta recuperada',
      metadata: { sources: ['README.md'] },
      modelId: 'openai/gpt-4.1-mini',
      role: 'ASSISTANT',
    });
    expect(runner.inputs).toEqual([{
      conversationId: conversation.id,
      history: [{ content: 'O que é RAG?', role: 'USER' }],
      modelId: 'openai/gpt-4.1-mini',
      projectId: project.id,
      sourceMessageId: result.userMessage.id,
      userId: user.id,
      value: 'O que é RAG?',
    }]);
  });
});
