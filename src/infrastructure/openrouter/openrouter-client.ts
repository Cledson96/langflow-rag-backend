import { z } from 'zod';

const toolCallSchema = z.object({
  function: z.object({
    arguments: z.string(),
    name: z.string().min(1),
  }),
  id: z.string().min(1),
  type: z.literal('function'),
});

const responseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
        tool_calls: z.array(toolCallSchema).optional(),
      }),
    }),
  ).min(1),
  usage: z.object({
    completion_tokens: z.number().optional(),
    prompt_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
  }).optional(),
});

export interface AgentToolDefinition {
  description: string;
  name: string;
  parameters: Record<string, unknown>;
}

export type AgentMessage =
  | { content: string; role: 'assistant' | 'system' | 'user' }
  | { content: string; name: string; role: 'tool'; toolCallId: string }
  | { content: string | null; role: 'assistant'; toolCalls: AgentToolCall[] };

export interface AgentToolCall {
  arguments: string;
  id: string;
  name: string;
}

export interface OpenRouterTurn {
  content: string | null;
  toolCalls: AgentToolCall[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export class OpenRouterClient {
  constructor(
    private readonly config: { apiKey: string; baseUrl: string },
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async complete(model: string, messages: AgentMessage[], tools: AgentToolDefinition[]): Promise<OpenRouterTurn> {
    const response = await this.fetcher(`${this.config.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: messages.map((message) => {
          if (message.role === 'tool') {
            return { content: message.content, name: message.name, role: 'tool', tool_call_id: message.toolCallId };
          }
          if ('toolCalls' in message) {
            return {
              content: message.content,
              role: 'assistant',
              tool_calls: message.toolCalls.map((call) => ({
                function: { arguments: call.arguments, name: call.name },
                id: call.id,
                type: 'function',
              })),
            };
          }
          return message;
        }),
        model,
        tool_choice: 'auto',
        tools: tools.map((tool) => ({
          function: {
            description: tool.description,
            name: tool.name,
            parameters: tool.parameters,
          },
          type: 'function',
        })),
      }),
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'content-type': 'application/json',
        'http-referer': 'https://app-langflow.cledson.com.br',
        'x-title': 'Gobrax AI',
      },
      method: 'POST',
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);
    const payload = responseSchema.parse(await response.json());
    const message = payload.choices[0]!.message;

    return {
      content: message.content ?? null,
      toolCalls: (message.tool_calls ?? []).map((call) => ({
        arguments: call.function.arguments,
        id: call.id,
        name: call.function.name,
      })),
      ...(payload.usage
        ? {
            usage: {
              inputTokens: payload.usage.prompt_tokens,
              outputTokens: payload.usage.completion_tokens,
              totalTokens: payload.usage.total_tokens,
            },
          }
        : {}),
    };
  }
}
