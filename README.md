# Langflow RAG Backend

API segura para autenticação, projetos, conversas e execução do fluxo Langflow RAG.

O backend executa o agente Nexo, controla ferramentas e permissões, mantém memórias
pessoais e de projeto no PostgreSQL e usa o Langflow/Qdrant somente para recuperação
semântica do vault Obsidian. Veja [docs/agent-architecture.md](docs/agent-architecture.md).

## Desenvolvimento

```bash
cp .env.dev.example .env.dev
npm install
npm run dev
```

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Segredos não devem ser enviados ao repositório. Use somente os arquivos `.env.*.example` como referência.
