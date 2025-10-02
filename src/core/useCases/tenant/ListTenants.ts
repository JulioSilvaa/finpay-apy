import type { Tenant } from '../../entities/Tenant'
import type { ITenantRepository } from '../../repositories'

export class ListTenantsUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(): Promise<Tenant[]> {
    return await this.tenantRepository.list()
  }
}
