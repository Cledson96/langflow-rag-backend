import cors from 'cors';
import express, { type Router } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { alwaysHealthyDatabase, type DatabaseHealthcheck } from '@/shared/http/database-healthcheck';
import { createLogger } from '@/shared/logger';
import { createRoutes } from '@/shared/routes';

interface CreateServerOptions {
  authRouter?: Router;
  projectRouter?: Router;
  conversationRouter?: Router;
  chatRouter?: Router;
  corsOrigins?: readonly string[];
  databaseHealthcheck?: DatabaseHealthcheck;
}

export function createServer({
  authRouter,
  projectRouter,
  conversationRouter,
  chatRouter,
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
  if (authRouter) {
    app.use(authRouter);
  }
  if (projectRouter) app.use(projectRouter);
  if (conversationRouter) app.use(conversationRouter);
  if (chatRouter) app.use(chatRouter);
  app.use(createRoutes(databaseHealthcheck));

  return app;
}
