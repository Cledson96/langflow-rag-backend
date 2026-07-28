import { describe, expect, it, vi } from 'vitest';

import { OpenRouterClient } from '@/infrastructure/openrouter/openrouter-client';

describe('OpenRouterClient', () => {
  it('sends tool definitions and parses tool calls without exposing the API key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                function: { arguments: '{"query":"from:gobrax.com.br"}', name: 'search_gmail' },
                id: 'call-1',
                type: 'function',
              }],
            },
          }],
          usage: { completion_tokens: 4, prompt_tokens: 10, total_tokens: 14 },
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      ),
    );
    const client = new OpenRouterClient(
      { apiKey: 'private-key', baseUrl: 'https://openrouter.example/api/v1' },
      fetcher,
    );

    const result = await client.complete(
      'openai/gpt-4.1-mini',
      [{ content: 'Veja meus e-mails', role: 'user' }],
      [{
        description: 'Pesquisa o Gmail',
        name: 'search_gmail',
        parameters: { properties: { query: { type: 'string' } }, type: 'object' },
      }],
    );

    expect(result.toolCalls).toEqual([
      { arguments: '{"query":"from:gobrax.com.br"}', id: 'call-1', name: 'search_gmail' },
    ]);
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 4, totalTokens: 14 });
    expect(fetcher).toHaveBeenCalledWith(
      'https://openrouter.example/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer private-key' }),
        method: 'POST',
      }),
    );
  });
});
