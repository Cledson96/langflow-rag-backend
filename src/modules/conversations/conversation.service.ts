import { ConversationRepository } from '@/modules/conversations/conversation.repository';
import { ProjectRepository } from '@/modules/projects/project.repository';

export class ConversationService {
  constructor(private readonly conversations: ConversationRepository, private readonly projects: ProjectRepository, private readonly allowedModels: readonly string[]) {}
  async create(userId: string, projectId: string, input: { modelId?: string; title?: string }) {
    if (!(await this.projects.isMember(projectId, userId))) throw new Error('project access denied');
    const modelId = input.modelId ?? this.allowedModels[0];
    if (!modelId || !this.allowedModels.includes(modelId)) throw new Error('model not allowed');
    return this.conversations.create({ createdByUserId: userId, modelId, projectId, title: input.title });
  }
  async list(userId: string, projectId: string) {
    if (!(await this.projects.isMember(projectId, userId))) throw new Error('project access denied');
    return this.conversations.listForUser(projectId, userId);
  }
}
