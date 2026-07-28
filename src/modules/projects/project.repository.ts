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

  listForUser(userId: string) {
    return this.database.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findById(projectId: string) {
    return this.database.project.findUnique({ where: { id: projectId } });
  }

  isMember(projectId: string, userId: string) {
    return this.database.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  }
}
