import { z } from 'zod';

const responseSchema = z.unknown();

export interface LangflowRunInput {
  conversationId: string;
  history?: Array<{ content: string; role: 'ASSISTANT' | 'USER' }>;
  modelId: string;
  projectId: string;
  userId: string;
  value: string;
}

export interface LangflowAnswer {
  content: string;
  metadata: Record<string, unknown>;
}

export interface LangflowRunner {
  run(input: LangflowRunInput): Promise<LangflowAnswer>;
}

export class LangflowClient implements LangflowRunner {
  constructor(private readonly config: { apiKey: string; baseUrl: string; flowId: string }) {}

  async run(input: LangflowRunInput): Promise<LangflowAnswer> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/run/${this.config.flowId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.config.apiKey },
      body: JSON.stringify({
        input_request: { input_type: 'chat', input_value: input.value, output_type: 'chat', session_id: input.conversationId, user_id: input.userId },
        context: { conversation_id: input.conversationId, model_id: input.modelId, project_id: input.projectId, user_id: input.userId },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Langflow request failed with status ${response.status}`);
    const payload = responseSchema.parse(await response.json());
    const message = findMessage(payload);
    if (typeof message?.text !== 'string') throw new Error('Langflow response did not contain a chat message');
    const answer = splitAnswerAndSources(message.text);
    return {
      content: answer.content,
      metadata: {
        ...toSafeMetadata(message),
        ...(answer.sources.length > 0 ? { sources: answer.sources } : {}),
      },
    };
  }
}

interface LangflowMessage {
  properties?: { source?: { display_name?: unknown; source?: unknown }; usage?: { input_tokens?: unknown; output_tokens?: unknown; total_tokens?: unknown } };
  run_id?: unknown;
  text?: unknown;
}

function findMessage(value: unknown): LangflowMessage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return record as LangflowMessage;
  for (const candidate of Object.values(record)) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const found = findMessage(item);
        if (found) return found;
      }
    } else {
      const found = findMessage(candidate);
      if (found) return found;
    }
  }
  return undefined;
}

function toSafeMetadata(message: LangflowMessage): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  if (typeof message.run_id === 'string') metadata.runId = message.run_id;
  const source = message.properties?.source;
  if (typeof source?.display_name === 'string' || typeof source?.source === 'string') {
    metadata.source = {
      ...(typeof source.display_name === 'string' ? { displayName: source.display_name } : {}),
      ...(typeof source.source === 'string' ? { name: source.source } : {}),
    };
  }
  const usage = message.properties?.usage;
  if (typeof usage?.input_tokens === 'number' || typeof usage?.output_tokens === 'number' || typeof usage?.total_tokens === 'number') {
    metadata.usage = {
      ...(typeof usage.input_tokens === 'number' ? { inputTokens: usage.input_tokens } : {}),
      ...(typeof usage.output_tokens === 'number' ? { outputTokens: usage.output_tokens } : {}),
      ...(typeof usage.total_tokens === 'number' ? { totalTokens: usage.total_tokens } : {}),
    };
  }
  return metadata;
}

function splitAnswerAndSources(text: string): {
  content: string;
  sources: Array<{ displayName: string }>;
} {
  const lines = text.split(/\r?\n/);
  const sourceIndex = lines.findIndex((line) => /^\s*(?:fonte|source)\s*:/i.test(line));

  if (sourceIndex === -1) {
    return { content: text.trim(), sources: [] };
  }

  const sourceLines = lines.slice(sourceIndex).flatMap((line) => {
    const value = line.replace(/^\s*(?:fonte|source)\s*:\s*/i, '').trim();
    return value.length > 0 ? [{ displayName: value }] : [];
  });

  return { content: lines.slice(0, sourceIndex).join('\n').trim(), sources: sourceLines };
}
