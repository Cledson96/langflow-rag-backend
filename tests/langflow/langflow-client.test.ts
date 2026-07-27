import { afterEach, describe, expect, it, vi } from 'vitest';

import { LangflowClient } from '@/infrastructure/langflow/langflow-client';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('LangflowClient', () => {
  it('keeps only the answer, source, usage and run identifiers from a Langflow response', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      session_id: 'session-1',
      outputs: [{
        outputs: [{
          results: {
            message: {
              text: 'Resposta do RAG',
              run_id: 'run-1',
              properties: {
                source: { display_name: 'README.md', source: 'Chat Output' },
                usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
              },
            },
          },
        }],
      }],
    }), { status: 200 })) as typeof fetch;
    const client = new LangflowClient({ apiKey: 'service-key', baseUrl: 'http://langflow:7860', flowId: 'flow-id' });

    const answer = await client.run({
      conversationId: 'conversation-1',
      modelId: 'openai/gpt-4.1-mini',
      projectId: 'project-1',
      userId: 'user-1',
      value: 'Pergunta',
    });

    expect(answer).toEqual({
      content: 'Resposta do RAG',
      metadata: {
        runId: 'run-1',
        source: { displayName: 'README.md', name: 'Chat Output' },
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      },
    });
  });
});
