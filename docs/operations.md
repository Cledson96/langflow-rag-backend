# Operação

## Secrets GitHub (environment `production`)

`VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_KEY`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `LANGFLOW_API_KEY`.

## Variables GitHub

`DEPLOY_PATH=/opt/langflow-rag-backend`, `APP_PORT=3010`, `CORS_ORIGINS`, `LANGFLOW_FLOW_ID`, `OPENROUTER_ALLOWED_MODELS`.

O DNS de `api-langflow.cledson.com.br` precisa apontar para o VPS antes de executar Certbot. O script publica apenas a API em loopback; PostgreSQL e Langflow continuam privados.
