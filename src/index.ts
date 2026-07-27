import 'dotenv/config';

import { loadEnv } from '@/shared/config/env';
import { createLogger } from '@/shared/logger';
import { createServer } from '@/server';
import { createPrismaClient } from '@/infrastructure/database/prisma-client';
import { PrismaDatabaseHealthcheck } from '@/infrastructure/database/prisma-healthcheck';
import { AuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { UserRepository } from '@/modules/users/user.repository';

const config = loadEnv(process.env);
const logger = createLogger();
const database = createPrismaClient(config.databaseUrl);
const authService = new AuthService(new UserRepository(database), {
  expiresIn: config.jwtExpiresIn,
  secret: config.jwtSecret,
});
const server = createServer({
  authRouter: createAuthRouter(authService),
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
