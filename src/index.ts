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
import { GoogleConnectionRepository } from '@/modules/google/google-connection.repository';
import { GoogleOAuthService } from '@/modules/google/google-oauth.service';
import { createGoogleRouter } from '@/modules/google/google.routes';
import { TokenCipher } from '@/shared/security/token-cipher';
import { OpenRouterClient } from '@/infrastructure/openrouter/openrouter-client';
import { GmailService } from '@/modules/google/gmail.service';
import { AgentRunner } from '@/modules/agent/agent-runner';
import { AgentMemoryRepository } from '@/modules/agent/agent-memory.repository';
import { AgentSoulRepository } from '@/modules/agent/agent-soul.repository';
import { AgentContextService } from '@/modules/agent/agent-context.service';
import { AgentToolRegistry } from '@/modules/agent/agent-tool-registry';
import { createCoreAgentTools } from '@/modules/agent/core-agent-tools';
import { createAgentRouter } from '@/modules/agent/agent.routes';

const config = loadEnv(process.env);
const logger = createLogger();
const database = createPrismaClient(config.databaseUrl);
const userRepository = new UserRepository(database);
const authService = new AuthService(userRepository, {
  adminEmails: config.adminEmails,
  expiresIn: config.jwtExpiresIn,
  secret: config.jwtSecret,
});
const googleOAuthService = new GoogleOAuthService(
  authService,
  new GoogleConnectionRepository(database),
  new TokenCipher(config.googleTokenEncryptionKey),
  {
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
    frontendUrl: config.frontendUrl,
    jwtSecret: config.jwtSecret,
    redirectUri: config.googleRedirectUri,
  },
);
const modelService = new ModelService(new ModelRepository(database));
const projectRepository = new ProjectRepository(database);
const projectService = new ProjectService(projectRepository);
const conversationService = new ConversationService(
  new ConversationRepository(database),
  new ProjectRepository(database),
  modelService,
);
const conversationRepository = new ConversationRepository(database);
const agentMemories = new AgentMemoryRepository(database);
const agentSouls = new AgentSoulRepository(database);
const gmailService = new GmailService();
const langflowClient = new LangflowClient({
  apiKey: config.langflowApiKey,
  baseUrl: config.langflowBaseUrl,
  flowId: config.langflowFlowId,
});
const chatService = new ChatService(
  conversationRepository,
  projectRepository,
  new AgentRunner(
    new OpenRouterClient({ apiKey: config.openrouterApiKey, baseUrl: config.openrouterBaseUrl }),
    new AgentContextService(
      agentSouls,
      agentMemories,
      userRepository,
      projectRepository,
    ),
    new AgentToolRegistry(
      createCoreAgentTools({
        gmail: gmailService,
        google: googleOAuthService,
        langflow: langflowClient,
        memories: agentMemories,
      }),
    ),
  ),
);
const server = createServer({
  agentRouter: createAgentRouter(authService, agentSouls, agentMemories, projectRepository),
  authRouter: createAuthRouter(authService),
  corsOrigins: config.corsOrigins,
  databaseHealthcheck: new PrismaDatabaseHealthcheck(database),
  projectRouter: createProjectRouter(authService, projectService),
  conversationRouter: createConversationRouter(authService, conversationService),
  chatRouter: createChatRouter(authService, chatService),
  modelRouter: createModelRouter(authService, modelService),
  googleRouter: createGoogleRouter(authService, googleOAuthService),
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
