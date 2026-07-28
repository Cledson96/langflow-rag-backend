import type { LangflowRunInput, LangflowRunner } from '@/infrastructure/langflow/langflow-client';
import { type AgentMessage, OpenRouterClient } from '@/infrastructure/openrouter/openrouter-client';
import { AgentContextService } from '@/modules/agent/agent-context.service';
import { AgentToolRegistry } from '@/modules/agent/agent-tool-registry';

export class AgentRunner implements LangflowRunner {
  constructor(
    private readonly openRouter: OpenRouterClient,
    private readonly context: AgentContextService,
    private readonly tools: AgentToolRegistry,
  ) {}

  async run(input: LangflowRunInput) {
    const messages: AgentMessage[] = [
      {
        content: await this.context.build(input.userId, input.projectId),
        role: 'system',
      },
      ...(input.history ?? []).slice(-20).map((message): AgentMessage => ({
        content: message.content.slice(0, 20_000),
        role: message.role === 'USER' ? 'user' : 'assistant',
      })),
    ];
    const toolExecutions: Array<{ label: string; name: string; status: 'completed' | 'failed' }> = [];
    const sources: Array<{ displayName: string }> = [];
    let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;

    for (let iteration = 0; iteration < 8; iteration += 1) {
      const turn = await this.openRouter.complete(input.modelId, messages, this.tools.definitions());
      usage = mergeUsage(usage, turn.usage);
      if (turn.toolCalls.length === 0) {
        return {
          content: turn.content?.trim() || 'Não consegui produzir uma resposta.',
          metadata: {
            agent: { name: 'Nexo' },
            ...(sources.length > 0 ? { sources: uniqueSources(sources) } : {}),
            ...(toolExecutions.length > 0 ? { tools: toolExecutions } : {}),
            ...(usage ? { usage } : {}),
          },
        };
      }

      messages.push({ content: turn.content, role: 'assistant', toolCalls: turn.toolCalls });
      for (const toolCall of turn.toolCalls) {
        try {
          const parsedArguments: unknown = JSON.parse(toolCall.arguments);
          const result = await this.tools.execute(toolCall.name, input, parsedArguments);
          toolExecutions.push({ label: result.label, name: toolCall.name, status: 'completed' });
          if (result.sources) sources.push(...result.sources);
          messages.push({
            content: JSON.stringify(result.output),
            name: toolCall.name,
            role: 'tool',
            toolCallId: toolCall.id,
          });
        } catch (error: unknown) {
          const notConnected = error instanceof Error && error.message.includes('Google account is not connected');
          toolExecutions.push({
            label: toolCall.name.includes('gmail') ? 'Gmail não disponível' : 'Ferramenta indisponível',
            name: toolCall.name,
            status: 'failed',
          });
          messages.push({
            content: JSON.stringify({
              error: notConnected
                ? 'A conta Google ainda não autorizou o Gmail. Oriente o usuário a abrir Integrações e conectar o Google Workspace.'
                : 'A ferramenta falhou. Informe o usuário sem inventar resultados.',
            }),
            name: toolCall.name,
            role: 'tool',
            toolCallId: toolCall.id,
          });
        }
      }
    }

    throw new Error('Agent exceeded the tool execution limit');
  }
}

function mergeUsage(
  current: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
  next: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
) {
  if (!current && !next) return undefined;
  return {
    inputTokens: (current?.inputTokens ?? 0) + (next?.inputTokens ?? 0),
    outputTokens: (current?.outputTokens ?? 0) + (next?.outputTokens ?? 0),
    totalTokens: (current?.totalTokens ?? 0) + (next?.totalTokens ?? 0),
  };
}

function uniqueSources(sources: Array<{ displayName: string }>) {
  return [...new Map(sources.map((source) => [source.displayName, source])).values()];
}
