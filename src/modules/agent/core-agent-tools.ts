import { z } from 'zod';

import type { LangflowRunner } from '@/infrastructure/langflow/langflow-client';
import { AgentMemoryRepository } from '@/modules/agent/agent-memory.repository';
import type { RegisteredAgentTool } from '@/modules/agent/agent-tool-registry';
import { GmailService } from '@/modules/google/gmail.service';
import { GoogleOAuthService } from '@/modules/google/google-oauth.service';

const searchMemorySchema = z.object({ query: z.string().trim().min(1).max(5_000) });
const searchGmailSchema = z.object({
  maxResults: z.number().int().min(1).max(10).default(5),
  query: z.string().trim().min(1).max(1_000),
});
const readGmailSchema = z.object({ messageId: z.string().min(1) });
const rememberSchema = z.object({
  confidence: z.number().min(0).max(1).default(1),
  content: z.string().trim().min(1).max(2_000),
  key: z.string().trim().min(1).max(120),
  kind: z.enum(['decision', 'fact', 'goal', 'preference', 'responsibility', 'rule']),
});

export function createCoreAgentTools(dependencies: {
  gmail: GmailService;
  google: GoogleOAuthService;
  langflow: LangflowRunner;
  memories: AgentMemoryRepository;
}): RegisteredAgentTool[] {
  return [
    {
      definition: {
        description: 'Busca informações na memória semântica e nos documentos Obsidian do projeto atual.',
        name: 'search_project_knowledge',
        parameters: {
          additionalProperties: false,
          properties: { query: { description: 'Pergunta ou assunto a pesquisar', type: 'string' } },
          required: ['query'],
          type: 'object',
        },
      },
      async execute(context, input) {
        const { query } = searchMemorySchema.parse(input);
        const answer = await dependencies.langflow.run({ ...context, value: query });
        const sources = Array.isArray(answer.metadata.sources)
          ? (answer.metadata.sources as Array<{ displayName: string }>)
          : [];
        return {
          label: 'Conhecimento do projeto consultado',
          output: { answer: answer.content, sources },
          sources,
        };
      },
    },
    {
      definition: {
        description: 'Pesquisa e lê mensagens da conta Gmail conectada. Aceita a sintaxe de busca do Gmail.',
        name: 'search_gmail',
        parameters: {
          additionalProperties: false,
          properties: {
            maxResults: { maximum: 10, minimum: 1, type: 'integer' },
            query: { description: 'Consulta no formato de pesquisa do Gmail', type: 'string' },
          },
          required: ['query'],
          type: 'object',
        },
      },
      async execute(context, input) {
        const { maxResults, query } = searchGmailSchema.parse(input);
        const accessToken = await dependencies.google.getAccessToken(context.userId);
        const messages = await dependencies.gmail.search(accessToken, query, maxResults);
        return { label: `${messages.length} e-mail(s) encontrado(s)`, output: { messages } };
      },
    },
    {
      definition: {
        description: 'Lê uma mensagem específica do Gmail pelo identificador retornado pela pesquisa.',
        name: 'read_gmail_message',
        parameters: {
          additionalProperties: false,
          properties: { messageId: { type: 'string' } },
          required: ['messageId'],
          type: 'object',
        },
      },
      async execute(context, input) {
        const { messageId } = readGmailSchema.parse(input);
        const accessToken = await dependencies.google.getAccessToken(context.userId);
        return {
          label: 'E-mail lido',
          output: { message: await dependencies.gmail.get(accessToken, messageId) },
        };
      },
    },
    {
      definition: memoryDefinition(
        'remember_user_memory',
        'Salva ou atualiza uma memória pessoal durável do usuário, útil entre projetos e conversas.',
      ),
      async execute(context, input) {
        const memory = rememberSchema.parse(input);
        await dependencies.memories.rememberUser({
          ...memory,
          sourceMessageId: context.sourceMessageId,
          userId: context.userId,
        });
        return {
          label: 'Memória pessoal atualizada',
          output: { remembered: true, scope: 'user' },
        };
      },
    },
    {
      definition: memoryDefinition(
        'remember_project_memory',
        'Salva ou atualiza uma memória compartilhada durável do projeto atual.',
      ),
      async execute(context, input) {
        const memory = rememberSchema.parse(input);
        await dependencies.memories.rememberProject({
          ...memory,
          projectId: context.projectId,
          sourceMessageId: context.sourceMessageId,
          userId: context.userId,
        });
        return {
          label: 'Memória do projeto atualizada',
          output: { remembered: true, scope: 'project' },
        };
      },
    },
  ];
}

function memoryDefinition(name: string, description: string) {
  return {
    description,
    name,
    parameters: {
      additionalProperties: false,
      properties: {
        confidence: { maximum: 1, minimum: 0, type: 'number' },
        content: { description: 'A informação autocontida a memorizar', type: 'string' },
        key: { description: 'Chave estável curta em snake_case', type: 'string' },
        kind: {
          enum: ['decision', 'fact', 'goal', 'preference', 'responsibility', 'rule'],
          type: 'string',
        },
      },
      required: ['content', 'key', 'kind'],
      type: 'object',
    },
  };
}
