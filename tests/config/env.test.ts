import { describe, expect, it } from 'vitest';

import { loadEnv } from '@/shared/config/env';

describe('loadEnv', () => {
  it('returns an immutable typed configuration', () => {
    const config = loadEnv({
      CORS_ORIGINS: 'https://app.cledson.com.br,https://localhost:3000',
      DATABASE_URL: 'postgresql://app:app@127.0.0.1:5432/app',
      JWT_EXPIRES_IN: '1h',
      JWT_SECRET: 'a-very-long-development-secret',
      FRONTEND_URL: 'http://localhost:3001',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/integrations/google/callback',
      GOOGLE_TOKEN_ENCRYPTION_KEY: '1'.repeat(64),
      LANGFLOW_API_KEY: 'langflow-service-key',
      LANGFLOW_BASE_URL: 'http://langflow:7860',
      LANGFLOW_FLOW_ID: 'flow-id',
      NODE_ENV: 'test',
      OPENROUTER_ALLOWED_MODELS: 'openai/gpt-4.1-mini,anthropic/claude-sonnet-4',
      PORT: '3010',
    });

    expect(config.port).toBe(3010);
    expect(config.databaseUrl).toBe('postgresql://app:app@127.0.0.1:5432/app');
    expect(config.corsOrigins).toEqual(['https://app.cledson.com.br', 'https://localhost:3000']);
    expect(config.openrouterAllowedModels).toEqual(['openai/gpt-4.1-mini', 'anthropic/claude-sonnet-4']);
    expect(Object.isFrozen(config)).toBe(true);
  });
});
