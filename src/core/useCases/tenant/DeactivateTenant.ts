import { EntityNotFoundError } from '../../../shared/errors'
import type { ITenantRepository } from '../../repositories'

export class DeactivateTenantUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(id: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(id)

    if (!tenant) {
      throw new EntityNotFoundError('Tenant', id)
    }

    await this.tenantRepository.deactivate(id)
  }
}
