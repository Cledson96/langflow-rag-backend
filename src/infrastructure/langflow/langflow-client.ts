import { z } from 'zod';

const responseSchema = z.unknown();

export interface LangflowRunInput {
  conversationId: string;
  modelId: string;
  projectId: string;
  userId: string;
  value: string;
}

export interface LangflowAnswer {
  content: string;
  metadata: Record<string, unknown>;
}

export class LangflowClient {
  constructor(private readonly config: { apiKey: string; baseUrl: string; flowId: string }) {}

  async run(input: LangflowRunInput): Promise<LangflowAnswer> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/run/${this.config.flowId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json', 'x-api-key': this.config.apiKey },
      body: JSON.stringify({
        input_request: { input_type: 'chat', input_value: input.value, output_type: 'chat', session_id: input.conversationId, user_id: input.userId },
        context: { conversation_id: input.conversationId, model_id: input.modelId, project_id: input.projectId, user_id: input.userId },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Langflow request failed with status ${response.status}`);
    const payload = responseSchema.parse(await response.json());
    const content = findContent(payload);
    if (!content) throw new Error('Langflow response did not contain content');
    return { content, metadata: { langflow: payload } };
  }
}

function findContent(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) { for (const item of value) { const found = findContent(item); if (found) return found; } return undefined; }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'content', 'message']) { const found = findContent(record[key]); if (found) return found; }
    for (const candidate of Object.values(record)) { const found = findContent(candidate); if (found) return found; }
  }
  return undefined;
}
