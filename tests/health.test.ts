import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createServer } from '@/server';

describe('health endpoints', () => {
  it.each(['/health', '/livez', '/readyz'])('returns the current status for %s', async (path) => {
    const response = await request(createServer()).get(path);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns unavailable when the database healthcheck fails', async () => {
    const response = await request(
      createServer({
        databaseHealthcheck: {
          isHealthy: async () => false,
        },
      }),
    ).get('/readyz');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
  });
});
