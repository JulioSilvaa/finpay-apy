import { EntityNotFoundError } from '../../../shared/errors'
import type { Tenant } from '../../entities/Tenant'
import type { ITenantRepository } from '../../repositories'

export class FindTenantByIdUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id)

    if (!tenant) {
      throw new EntityNotFoundError('Tenant', id)
    }

    return tenant
  }
}
