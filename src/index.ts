import 'dotenv/config';

import { loadEnv } from '@/shared/config/env';
import { createLogger } from '@/shared/logger';
import { createServer } from '@/server';
import { createPrismaClient } from '@/infrastructure/database/prisma-client';
import { PrismaDatabaseHealthcheck } from '@/infrastructure/database/prisma-healthcheck';

const config = loadEnv(process.env);
const logger = createLogger();
const database = createPrismaClient(config.databaseUrl);
const server = createServer({
  corsOrigins: config.corsOrigins,
  databaseHealthcheck: new PrismaDatabaseHealthcheck(database),
});

const httpServer = server.listen(config.port, () => {
  logger.info({ port: config.port }, 'server started');
});

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'shutting down');
  httpServer.close(async () => {
    await database.$disconnect();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
