import { ProjectRole, type PrismaClient } from '@/generated/prisma';

export class ProjectRepository {
  constructor(private readonly database: PrismaClient) {}

  createWithOwner(data: { name: string; slug: string; userId: string }) {
    return this.database.project.create({
      data: {
        createdByUserId: data.userId,
        name: data.name,
        slug: data.slug,
        members: {
          create: {
            role: ProjectRole.OWNER,
            userId: data.userId,
          },
        },
      },
      include: { members: true },
    });
  }
}
