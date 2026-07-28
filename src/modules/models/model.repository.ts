import type { Prisma, PrismaClient } from '@/generated/prisma';

export class ModelRepository {
  constructor(private readonly database: PrismaClient) {}

  listAll() {
    return this.database.aIModel.findMany({ orderBy: [{ isDefault: 'desc' }, { provider: 'asc' }, { name: 'asc' }] });
  }

  listEnabled() {
    return this.database.aIModel.findMany({
      orderBy: [{ isDefault: 'desc' }, { provider: 'asc' }, { name: 'asc' }],
      where: { enabled: true },
    });
  }

  findById(id: string) {
    return this.database.aIModel.findUnique({ where: { id } });
  }

  findDefault() {
    return this.database.aIModel.findFirst({ orderBy: { updatedAt: 'desc' }, where: { enabled: true, isDefault: true } });
  }

  create(data: Prisma.AIModelCreateInput) {
    return this.database.$transaction(async (transaction) => {
      if (data.isDefault === true) {
        await transaction.aIModel.updateMany({ data: { isDefault: false } });
      }

      return transaction.aIModel.create({ data });
    });
  }

  async update(id: string, data: Prisma.AIModelUpdateInput & { isDefault?: boolean }) {
    return this.database.$transaction(async (transaction) => {
      if (data.isDefault === true) {
        await transaction.aIModel.updateMany({ data: { isDefault: false }, where: { id: { not: id } } });
      }

      return transaction.aIModel.update({ data, where: { id } });
    });
  }
}
