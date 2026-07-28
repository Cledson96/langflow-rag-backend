import { describe, expect, it, vi } from 'vitest';

import type { OpenRouterClient } from '@/infrastructure/openrouter/openrouter-client';
import type { AgentContextService } from '@/modules/agent/agent-context.service';
import { AgentRunner } from '@/modules/agent/agent-runner';
import type { AgentToolRegistry } from '@/modules/agent/agent-tool-registry';

describe('AgentRunner', () => {
  it('lets the model route durable information to personal memory and reports the tool execution', async () => {
    const complete = vi.fn()
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [{
          arguments: JSON.stringify({
            content: 'O usuário prefere respostas objetivas.',
            key: 'estilo_de_resposta',
            kind: 'preference',
          }),
          id: 'call-memory',
          name: 'remember_user_memory',
        }],
      })
      .mockResolvedValueOnce({
        content: 'Entendido. Vou ser mais objetivo.',
        toolCalls: [],
        usage: { totalTokens: 30 },
      });
    const execute = vi.fn().mockResolvedValue({
      label: 'Memória pessoal atualizada',
      output: { remembered: true, scope: 'user' },
    });
    const runner = new AgentRunner(
      { complete } as unknown as OpenRouterClient,
      { build: vi.fn().mockResolvedValue('Soul do Nexo') } as unknown as AgentContextService,
      {
        definitions: vi.fn().mockReturnValue([{ description: 'Memoriza', name: 'remember_user_memory', parameters: {} }]),
        execute,
      } as unknown as AgentToolRegistry,
    );

    const result = await runner.run({
      conversationId: 'conversation',
      history: [{ content: 'Prefiro respostas objetivas.', role: 'USER' }],
      modelId: 'openai/gpt-4.1-mini',
      projectId: 'project',
      sourceMessageId: 'message',
      userId: 'user',
      value: 'Prefiro respostas objetivas.',
    });

    expect(execute).toHaveBeenCalledWith(
      'remember_user_memory',
      expect.objectContaining({ projectId: 'project', sourceMessageId: 'message', userId: 'user' }),
      expect.objectContaining({ key: 'estilo_de_resposta' }),
    );
    expect(result).toMatchObject({
      content: 'Entendido. Vou ser mais objetivo.',
      metadata: {
        agent: { name: 'Nexo' },
        tools: [{ label: 'Memória pessoal atualizada', name: 'remember_user_memory', status: 'completed' }],
      },
    });
  });
});
