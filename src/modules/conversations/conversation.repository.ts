import type { PrismaClient } from '@/generated/prisma';

export class ConversationRepository {
  constructor(private readonly database: PrismaClient) {}
  create(data: { createdByUserId: string; modelId: string; projectId: string; title?: string }) {
    return this.database.conversation.create({ data });
  }
  listForUser(projectId: string, userId: string) {
    return this.database.conversation.findMany({ where: { projectId, createdByUserId: userId }, orderBy: { updatedAt: 'desc' } });
  }
}
