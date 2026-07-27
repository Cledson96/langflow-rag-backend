import { describe, expect, it } from 'vitest';

import { PrismaDatabaseHealthcheck } from '@/infrastructure/database/prisma-healthcheck';

describe('PrismaDatabaseHealthcheck', () => {
  it('returns false when the database query rejects', async () => {
    const healthcheck = new PrismaDatabaseHealthcheck({
      $queryRawUnsafe: async () => {
        throw new Error('database unavailable');
      },
    });

    await expect(healthcheck.isHealthy()).resolves.toBe(false);
  });
});
