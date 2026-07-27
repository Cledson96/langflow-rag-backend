#!/usr/bin/env bash
set -euo pipefail
: "${DEPLOY_PATH:?}" "${API_IMAGE:?}" "${APP_PORT:=3010}"
cd "$DEPLOY_PATH"
docker network inspect langflow_ai_internal >/dev/null 2>&1 || docker network create langflow_ai_internal
docker compose --env-file .env pull
docker compose --env-file .env run --rm api npx prisma migrate deploy
docker compose --env-file .env up -d --remove-orphans
curl --fail --silent --show-error "http://127.0.0.1:${APP_PORT}/readyz" >/dev/null
sed "s|__APP_PORT__|${APP_PORT}|g" deploy/nginx/api-langflow.cledson.com.br.conf.template > /etc/nginx/sites-available/api-langflow.cledson.com.br.conf
ln -sf /etc/nginx/sites-available/api-langflow.cledson.com.br.conf /etc/nginx/sites-enabled/api-langflow.cledson.com.br.conf
nginx -t && systemctl reload nginx
