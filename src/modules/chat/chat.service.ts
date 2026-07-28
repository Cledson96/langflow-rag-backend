import type { LangflowRunner } from '@/infrastructure/langflow/langflow-client';
import { ConversationRepository } from '@/modules/conversations/conversation.repository';
import { ProjectRepository } from '@/modules/projects/project.repository';

export class ChatService {
  constructor(private readonly conversations: ConversationRepository, private readonly projects: ProjectRepository, private readonly langflow: LangflowRunner) {}
  async send(userId: string, projectId: string, conversationId: string, content: string) {
    if (!(await this.projects.isMember(projectId, userId))) throw new Error('project access denied');
    const conversation = await this.conversations.findForUser(conversationId, projectId, userId);
    if (!conversation) throw new Error('conversation not found');
    const userMessage = await this.conversations.createMessage({ content, conversationId, role: 'USER' });
    const history = (await this.conversations.listMessages(conversationId))
      .filter((message) => message.role === 'USER' || message.role === 'ASSISTANT')
      .map((message) => ({ content: message.content, role: message.role as 'ASSISTANT' | 'USER' }));
    const answer = await this.langflow.run({
      conversationId,
      history,
      modelId: conversation.modelId,
      projectId,
      userId,
      value: content,
    });
    const assistantMessage = await this.conversations.createMessage({ content: answer.content, conversationId, metadata: answer.metadata, modelId: conversation.modelId, role: 'ASSISTANT' });
    return { assistantMessage, userMessage };
  }
  async listMessages(userId: string, projectId: string, conversationId: string) {
    const conversation = await this.conversations.findForUser(conversationId, projectId, userId);
    if (!conversation) throw new Error('conversation not found');
    return this.conversations.listMessages(conversationId);
  }
}
