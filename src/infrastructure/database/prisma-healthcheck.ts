import type { DatabaseHealthcheck } from '@/shared/http/database-healthcheck';

interface QueryableDatabase {
  $queryRawUnsafe(query: string): Promise<unknown>;
}

export class PrismaDatabaseHealthcheck implements DatabaseHealthcheck {
  constructor(private readonly database: QueryableDatabase) {}

  async isHealthy() {
    try {
      await this.database.$queryRawUnsafe('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
