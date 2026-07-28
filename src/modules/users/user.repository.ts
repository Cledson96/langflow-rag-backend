import type { PrismaClient, UserRole } from '@/generated/prisma';

export class UserRepository {
  constructor(private readonly database: PrismaClient) {}

  create(data: { email: string; name?: string; passwordHash: string; role?: UserRole }) {
    return this.database.user.create({ data });
  }

  findByEmail(email: string) {
    return this.database.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.database.user.findUnique({ where: { id } });
  }

  updateRole(id: string, role: UserRole) {
    return this.database.user.update({ data: { role }, where: { id } });
  }
}
