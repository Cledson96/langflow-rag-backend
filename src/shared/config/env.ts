import { z } from 'zod';

const environmentSchema = z.object({
  CORS_ORIGINS: z.string().min(1),
  DATABASE_URL: z.url(),
  JWT_EXPIRES_IN: z.string().min(1),
  JWT_SECRET: z.string().min(24),
  LANGFLOW_API_KEY: z.string().min(1),
  LANGFLOW_BASE_URL: z.url(),
  LANGFLOW_FLOW_ID: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive(),
});

export interface AppConfig {
  corsOrigins: readonly string[];
  databaseUrl: string;
  jwtExpiresIn: string;
  jwtSecret: string;
  langflowApiKey: string;
  langflowBaseUrl: string;
  langflowFlowId: string;
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
}

export function loadEnv(environment: Record<string, string | undefined>): Readonly<AppConfig> {
  const parsed = environmentSchema.parse(environment);

  return Object.freeze({
    corsOrigins: Object.freeze(
      parsed.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
    databaseUrl: parsed.DATABASE_URL,
    jwtExpiresIn: parsed.JWT_EXPIRES_IN,
    jwtSecret: parsed.JWT_SECRET,
    langflowApiKey: parsed.LANGFLOW_API_KEY,
    langflowBaseUrl: parsed.LANGFLOW_BASE_URL,
    langflowFlowId: parsed.LANGFLOW_FLOW_ID,
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
  });
}
