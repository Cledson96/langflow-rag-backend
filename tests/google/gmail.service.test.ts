import { describe, expect, it, vi } from 'vitest';

import { GmailService } from '@/modules/google/gmail.service';

describe('GmailService', () => {
  it('searches Gmail and returns normalized readable messages', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messages: [{ id: 'message_1', threadId: 'thread_1' }] }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'message_1',
            payload: {
              headers: [
                { name: 'Subject', value: 'Relatório diário' },
                { name: 'From', value: 'Operação <operacao@gobrax.com.br>' },
                { name: 'Date', value: 'Tue, 28 Jul 2026 09:00:00 -0300' },
              ],
              mimeType: 'text/plain',
              body: { data: Buffer.from('Conteúdo operacional').toString('base64url') },
            },
            snippet: 'Conteúdo operacional',
            threadId: 'thread_1',
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      );
    const gmail = new GmailService(fetcher);

    const result = await gmail.search('access-token', 'newer_than:1d', 5);

    expect(result).toEqual([{
      body: 'Conteúdo operacional',
      date: 'Tue, 28 Jul 2026 09:00:00 -0300',
      from: 'Operação <operacao@gobrax.com.br>',
      id: 'message_1',
      snippet: 'Conteúdo operacional',
      subject: 'Relatório diário',
      threadId: 'thread_1',
    }]);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ href: expect.stringContaining('q=newer_than%3A1d') }),
      expect.objectContaining({ headers: { authorization: 'Bearer access-token' } }),
    );
  });
});
