import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { alwaysHealthyDatabase, type DatabaseHealthcheck } from '@/shared/http/database-healthcheck';
import { createLogger } from '@/shared/logger';
import { createRoutes } from '@/shared/routes';

interface CreateServerOptions {
  corsOrigins?: readonly string[];
  databaseHealthcheck?: DatabaseHealthcheck;
}

export function createServer({
  corsOrigins = [],
  databaseHealthcheck = alwaysHealthyDatabase,
}: CreateServerOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: [...corsOrigins],
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(pinoHttp({ logger: createLogger() }));
  app.use(createRoutes(databaseHealthcheck));

  return app;
}
