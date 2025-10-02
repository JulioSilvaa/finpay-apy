import { EntityNotFoundError } from '../../../shared/errors'
import type { Tenant } from '../../entities/Tenant'
import type { ITenantRepository } from '../../repositories'

export class FindTenantByEmailUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(email: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findByEmail(email)

    if (!tenant) {
      throw new EntityNotFoundError('Tenant', email)
    }

    return tenant
  }
}
