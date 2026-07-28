import { ConversationRepository } from '@/modules/conversations/conversation.repository';
import { ModelService } from '@/modules/models/model.service';
import { ProjectRepository } from '@/modules/projects/project.repository';

export class ConversationService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly projects: ProjectRepository,
    private readonly models: ModelService,
  ) {}
  async create(userId: string, projectId: string, input: { modelId?: string; title?: string }) {
    if (!(await this.projects.isMember(projectId, userId))) throw new Error('project access denied');
    const model = input.modelId ? await this.models.getEnabled(input.modelId) : await this.models.getDefault();
    if (!model) throw new Error('model not allowed');
    const modelId = model.id;
    return this.conversations.create({ createdByUserId: userId, modelId, projectId, title: input.title });
  }
  async list(userId: string, projectId: string) {
    if (!(await this.projects.isMember(projectId, userId))) throw new Error('project access denied');
    return this.conversations.listForUser(projectId, userId);
  }

  async updateModel(userId: string, projectId: string, conversationId: string, modelId: string) {
    if (!(await this.projects.isMember(projectId, userId))) throw new Error('project access denied');
    const conversation = await this.conversations.findForUser(conversationId, projectId, userId);
    if (!conversation) throw new Error('conversation not found');
    if (!(await this.models.getEnabled(modelId))) throw new Error('model not allowed');
    return this.conversations.updateModel(conversation.id, modelId);
  }
}
