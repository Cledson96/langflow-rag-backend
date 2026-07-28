import { ModelRepository } from '@/modules/models/model.repository';

interface CreateModelInput {
  enabled?: boolean;
  id: string;
  isDefault?: boolean;
  name: string;
  provider: string;
}

interface UpdateModelInput {
  enabled?: boolean;
  isDefault?: boolean;
  name?: string;
  provider?: string;
}

export class ModelService {
  constructor(private readonly models: ModelRepository) {}

  listAll() {
    return this.models.listAll();
  }

  listEnabled() {
    return this.models.listEnabled();
  }

  async getEnabled(id: string) {
    const model = await this.models.findById(id);
    return model?.enabled ? model : null;
  }

  async getDefault() {
    return (await this.models.findDefault()) ?? (await this.models.listEnabled())[0] ?? null;
  }

  async create(input: CreateModelInput) {
    return this.models.create({
      enabled: input.enabled ?? true,
      id: input.id,
      isDefault: input.isDefault ?? false,
      name: input.name,
      provider: input.provider,
    });
  }

  update(id: string, input: UpdateModelInput) {
    return this.models.update(id, input);
  }
}
