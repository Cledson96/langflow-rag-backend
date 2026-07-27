import { describe, expect, it } from 'vitest';

import { loadEnv } from '@/shared/config/env';

describe('loadEnv', () => {
  it('returns an immutable typed configuration', () => {
    const config = loadEnv({
      CORS_ORIGINS: 'https://app.cledson.com.br,https://localhost:3000',
      JWT_EXPIRES_IN: '1h',
      JWT_SECRET: 'a-very-long-development-secret',
      LANGFLOW_API_KEY: 'langflow-service-key',
      LANGFLOW_BASE_URL: 'http://langflow:7860',
      LANGFLOW_FLOW_ID: 'flow-id',
      NODE_ENV: 'test',
      PORT: '3010',
    });

    expect(config.port).toBe(3010);
    expect(config.corsOrigins).toEqual(['https://app.cledson.com.br', 'https://localhost:3000']);
    expect(Object.isFrozen(config)).toBe(true);
  });
});
