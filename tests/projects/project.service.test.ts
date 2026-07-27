import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@/generated/prisma';
import { ProjectService } from '@/modules/projects/project.service';
import { ProjectRepository } from '@/modules/projects/project.repository';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app_test';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const projects = new ProjectService(new ProjectRepository(prisma));

beforeAll(async () => {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => prisma.$disconnect());

describe('ProjectService', () => {
  it('creates a project and makes its creator the owner', async () => {
    const user = await prisma.user.create({
      data: { email: `user-${randomUUID()}@example.com`, passwordHash: 'hash' },
    });

    const project = await projects.create(user.id, {
      name: 'Projeto Comercial',
      slug: `projeto-comercial-${randomUUID()}`,
    });

    expect(project.members[0]).toMatchObject({ role: 'OWNER', userId: user.id });
  });

  it('lists only projects in which the user is a member', async () => {
    const member = await prisma.user.create({
      data: { email: `member-${randomUUID()}@example.com`, passwordHash: 'hash' },
    });
    const outsider = await prisma.user.create({
      data: { email: `outsider-${randomUUID()}@example.com`, passwordHash: 'hash' },
    });
    const project = await projects.create(member.id, { name: 'Projeto membro', slug: `membro-${randomUUID()}` });

    await expect(projects.listForUser(member.id)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: project.id })]),
    );
    await expect(projects.listForUser(outsider.id)).resolves.toEqual([]);
  });
});
