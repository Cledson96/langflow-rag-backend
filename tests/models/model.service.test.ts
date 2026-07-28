import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@/generated/prisma';
import { ModelRepository } from '@/modules/models/model.repository';
import { ModelService } from '@/modules/models/model.service';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app_test';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const models = new ModelService(new ModelRepository(prisma));

beforeAll(async () => {
  await prisma.aIModel.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('ModelService', () => {
  it('returns only enabled models to authenticated users', async () => {
    await models.create({
      id: `openai/test-${randomUUID()}`,
      name: 'Modelo ativo',
      provider: 'OpenAI',
    });
    await models.create({
      enabled: false,
      id: `openrouter/test-${randomUUID()}`,
      name: 'Modelo inativo',
      provider: 'OpenRouter',
    });

    const result = await models.listEnabled();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ enabled: true, name: 'Modelo ativo' });
  });

  it('supports enabling, renaming and setting a default model', async () => {
    const model = await models.create({
      enabled: false,
      id: `openrouter/test-${randomUUID()}`,
      name: 'Modelo provisório',
      provider: 'OpenRouter',
    });

    const updated = await models.update(model.id, {
      enabled: true,
      isDefault: true,
      name: 'Modelo principal',
    });

    expect(updated).toMatchObject({
      enabled: true,
      isDefault: true,
      name: 'Modelo principal',
    });
    await expect(models.getDefault()).resolves.toMatchObject({ id: model.id });
  });
});
