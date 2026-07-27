import { PrismaClient } from '@/generated/prisma';

export function createPrismaClient(databaseUrl: string) {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}
