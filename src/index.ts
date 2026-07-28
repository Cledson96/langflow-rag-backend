import 'dotenv/config';

import { loadEnv } from '@/shared/config/env';
import { createLogger } from '@/shared/logger';
import { createServer } from '@/server';
import { createPrismaClient } from '@/infrastructure/database/prisma-client';
import { PrismaDatabaseHealthcheck } from '@/infrastructure/database/prisma-healthcheck';
import { AuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { UserRepository } from '@/modules/users/user.repository';
import { ProjectRepository } from '@/modules/projects/project.repository';
import { createProjectRouter } from '@/modules/projects/project.routes';
import { ProjectService } from '@/modules/projects/project.service';
import { ConversationRepository } from '@/modules/conversations/conversation.repository';
import { ConversationService } from '@/modules/conversations/conversation.service';
import { createConversationRouter } from '@/modules/conversations/conversation.routes';
import { LangflowClient } from '@/infrastructure/langflow/langflow-client';
import { ChatService } from '@/modules/chat/chat.service';
import { createChatRouter } from '@/modules/chat/chat.routes';
import { ModelRepository } from '@/modules/models/model.repository';
import { ModelService } from '@/modules/models/model.service';
import { createModelRouter } from '@/modules/models/model.routes';

const config = loadEnv(process.env);
const logger = createLogger();
const database = createPrismaClient(config.databaseUrl);
const authService = new AuthService(new UserRepository(database), {
  adminEmails: config.adminEmails,
  expiresIn: config.jwtExpiresIn,
  secret: config.jwtSecret,
});
const modelService = new ModelService(new ModelRepository(database));
const projectService = new ProjectService(new ProjectRepository(database));
const conversationService = new ConversationService(
  new ConversationRepository(database),
  new ProjectRepository(database),
  modelService,
);
const conversationRepository = new ConversationRepository(database);
const projectRepository = new ProjectRepository(database);
const chatService = new ChatService(
  conversationRepository,
  projectRepository,
  new LangflowClient({ apiKey: config.langflowApiKey, baseUrl: config.langflowBaseUrl, flowId: config.langflowFlowId }),
);
const server = createServer({
  authRouter: createAuthRouter(authService),
  corsOrigins: config.corsOrigins,
  databaseHealthcheck: new PrismaDatabaseHealthcheck(database),
  projectRouter: createProjectRouter(authService, projectService),
  conversationRouter: createConversationRouter(authService, conversationService),
  chatRouter: createChatRouter(authService, chatService),
  modelRouter: createModelRouter(authService, modelService),
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
