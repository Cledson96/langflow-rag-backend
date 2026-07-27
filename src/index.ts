import 'dotenv/config';

import { loadEnv } from '@/shared/config/env';
import { createLogger } from '@/shared/logger';
import { createServer } from '@/server';

const config = loadEnv(process.env);
const logger = createLogger();
const server = createServer({ corsOrigins: config.corsOrigins });

const httpServer = server.listen(config.port, () => {
  logger.info({ port: config.port }, 'server started');
});

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'shutting down');
  httpServer.close(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
