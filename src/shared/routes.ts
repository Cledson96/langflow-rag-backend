import { Router } from 'express';

import type { DatabaseHealthcheck } from '@/shared/http/database-healthcheck';

export function createRoutes(databaseHealthcheck: DatabaseHealthcheck) {
  const routes = Router();

  for (const path of ['/health', '/livez']) {
    routes.get(path, (_request, response) => {
      response.status(200).json({ status: 'ok' });
    });
  }

  routes.get('/readyz', async (_request, response) => {
    if (await databaseHealthcheck.isHealthy()) {
      response.status(200).json({ status: 'ok' });
      return;
    }

    response.status(503).json({ status: 'unavailable' });
  });

  return routes;
}
