# Operação

## Secrets GitHub (environment `production`)

`VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_KEY`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `LANGFLOW_API_KEY`, `GHCR_PULL_TOKEN`; `CERTBOT_EMAIL` é opcional.

## Variables GitHub

`DEPLOY_PATH=/opt/langflow-rag-backend`, `APP_PORT=3010`, `CORS_ORIGINS`, `LANGFLOW_FLOW_ID`, `OPENROUTER_ALLOWED_MODELS`.

`GHCR_PULL_TOKEN` precisa ter `read:packages` para que o VPS consiga baixar a imagem privada do GHCR. Se o pacote for tornado público depois do primeiro deploy, ele deixa de ser necessário.

O DNS de `api-langflow.cledson.com.br` precisa apontar para o VPS antes de executar Certbot. O script publica apenas a API em loopback; PostgreSQL e Langflow continuam privados.

O deploy provisiona HTTPS com Certbot. Cadastre opcionalmente o secret `CERTBOT_EMAIL` para receber alertas de renovação; sem ele, o certificado é emitido com o registro sem e-mail.
