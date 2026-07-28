import type { PrismaClient } from '@/generated/prisma';

interface RememberInput {
  confidence?: number;
  content: string;
  key: string;
  kind: string;
  projectId?: string;
  sourceMessageId?: string;
  userId: string;
}

export class AgentMemoryRepository {
  constructor(private readonly database: PrismaClient) {}

  listUserMemories(userId: string) {
    return this.database.agentMemory.findMany({
      orderBy: { updatedAt: 'desc' },
      where: { archived: false, createdByUserId: userId, scope: 'USER' },
    });
  }

  listProjectMemories(projectId: string) {
    return this.database.agentMemory.findMany({
      orderBy: { updatedAt: 'desc' },
      where: { archived: false, projectId, scope: 'PROJECT' },
    });
  }

  archiveUserMemory(memoryId: string, userId: string) {
    return this.database.agentMemory.updateMany({
      data: { archived: true },
      where: { archived: false, createdByUserId: userId, id: memoryId, scope: 'USER' },
    });
  }

  archiveProjectMemory(memoryId: string, projectId: string) {
    return this.database.agentMemory.updateMany({
      data: { archived: true },
      where: { archived: false, id: memoryId, projectId, scope: 'PROJECT' },
    });
  }

  async listContext(userId: string, projectId: string) {
    const [userMemories, projectMemories] = await Promise.all([
      this.database.agentMemory.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 30,
        where: { archived: false, createdByUserId: userId, scope: 'USER' },
      }),
      this.database.agentMemory.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 40,
        where: { archived: false, projectId, scope: 'PROJECT' },
      }),
    ]);
    return { projectMemories, userMemories };
  }

  rememberUser(input: RememberInput) {
    return this.remember({ ...input, scope: 'USER' });
  }

  rememberProject(input: RememberInput & { projectId: string }) {
    return this.remember({ ...input, scope: 'PROJECT' });
  }

  private async remember(input: RememberInput & { scope: 'PROJECT' | 'USER' }) {
    const normalizedKey = normalizeKey(input.key);
    const existing = await this.database.agentMemory.findFirst({
      where: {
        archived: false,
        createdByUserId: input.scope === 'USER' ? input.userId : undefined,
        key: normalizedKey,
        projectId: input.scope === 'PROJECT' ? input.projectId : null,
        scope: input.scope,
      },
    });
    const data = {
      confidence: Math.min(Math.max(input.confidence ?? 1, 0), 1),
      content: input.content.trim(),
      key: normalizedKey,
      kind: input.kind.trim().toLowerCase(),
      sourceMessageId: input.sourceMessageId,
    };

    if (existing) {
      return this.database.agentMemory.update({ data, where: { id: existing.id } });
    }
    return this.database.agentMemory.create({
      data: {
        ...data,
        createdByUserId: input.userId,
        projectId: input.scope === 'PROJECT' ? input.projectId : null,
        scope: input.scope,
      },
    });
  }
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}
