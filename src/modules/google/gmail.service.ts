import { z } from 'zod';

const messageIdentifierSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);
const listSchema = z.object({
  messages: z.array(z.object({ id: z.string(), threadId: z.string().optional() })).default([]),
});

const partSchema: z.ZodType<{
  body?: { data?: string };
  headers?: Array<{ name: string; value: string }>;
  mimeType?: string;
  parts?: unknown[];
}> = z.lazy(() =>
  z.object({
    body: z.object({ data: z.string().optional() }).optional(),
    headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    mimeType: z.string().optional(),
    parts: z.array(partSchema).optional(),
  }),
);

const messageSchema = z.object({
  id: z.string(),
  payload: partSchema.optional(),
  snippet: z.string().default(''),
  threadId: z.string().optional(),
});

export interface GmailMessage {
  body: string;
  date: string;
  from: string;
  id: string;
  snippet: string;
  subject: string;
  threadId?: string;
}

export class GmailService {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async search(accessToken: string, query: string, maximumResults = 5): Promise<GmailMessage[]> {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', String(Math.min(Math.max(maximumResults, 1), 10)));
    url.searchParams.set('q', query);
    const payload = listSchema.parse(await this.request(url, accessToken));

    return Promise.all(payload.messages.map((message) => this.get(accessToken, message.id)));
  }

  async get(accessToken: string, messageId: string): Promise<GmailMessage> {
    const id = messageIdentifierSchema.parse(messageId);
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
    url.searchParams.set('format', 'full');
    const message = messageSchema.parse(await this.request(url, accessToken));
    const headers = new Map(
      (message.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value]),
    );

    return {
      body: extractBody(message.payload).slice(0, 12_000),
      date: headers.get('date') ?? '',
      from: headers.get('from') ?? '',
      id: message.id,
      snippet: message.snippet,
      subject: headers.get('subject') ?? '(sem assunto)',
      ...(message.threadId ? { threadId: message.threadId } : {}),
    };
  }

  private async request(url: URL, accessToken: string): Promise<unknown> {
    const response = await this.fetcher(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Gmail request failed with status ${response.status}`);
    return response.json();
  }
}

function extractBody(part: z.infer<typeof partSchema> | undefined): string {
  if (!part) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64Url(part.body.data);

  const plainText = (part.parts ?? [])
    .map((child) => extractBody(partSchema.parse(child)))
    .filter(Boolean)
    .join('\n');
  if (plainText) return plainText;

  if (part.mimeType === 'text/html' && part.body?.data) {
    return decodeBase64Url(part.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}
