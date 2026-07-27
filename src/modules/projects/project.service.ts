import { ProjectRepository } from '@/modules/projects/project.repository';

interface CreateProjectInput {
  name: string;
  slug: string;
}

export class ProjectService {
  constructor(private readonly projects: ProjectRepository) {}

  create(userId: string, input: CreateProjectInput) {
    return this.projects.createWithOwner({ ...input, userId });
  }
}
