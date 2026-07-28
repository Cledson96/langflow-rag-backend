import type { PrismaClient } from '@/generated/prisma';

export class ConversationRepository {
  constructor(private readonly database: PrismaClient) {}
  create(data: { createdByUserId: string; modelId: string; projectId: string; title?: string }) {
    return this.database.conversation.create({ data });
  }
  listForUser(projectId: string, userId: string) {
    return this.database.conversation.findMany({ where: { projectId, createdByUserId: userId }, orderBy: { updatedAt: 'desc' } });
  }
  findForUser(id: string, projectId: string, userId: string) {
    return this.database.conversation.findFirst({ where: { id, projectId, createdByUserId: userId } });
  }
  updateModel(id: string, modelId: string) {
    return this.database.conversation.update({ data: { modelId }, where: { id } });
  }
  createMessage(data: { content: string; conversationId: string; metadata?: object; modelId?: string; role: 'USER' | 'ASSISTANT' }) {
    return this.database.message.create({ data });
  }
  listMessages(conversationId: string) {
    return this.database.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
  }
}
