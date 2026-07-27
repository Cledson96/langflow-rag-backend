import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createServer } from '@/server';

describe('HTTP security defaults', () => {
  it('does not expose the Express signature', async () => {
    const response = await request(createServer()).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows configured browser origins', async () => {
    const response = await request(
      createServer({
        corsOrigins: ['https://app.cledson.com.br'],
      }),
    )
      .get('/health')
      .set('Origin', 'https://app.cledson.com.br');

    expect(response.headers['access-control-allow-origin']).toBe('https://app.cledson.com.br');
  });
});
