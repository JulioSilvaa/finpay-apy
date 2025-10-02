import { EntityNotFoundError } from '../../../shared/errors'
import type { Tenant } from '../../entities/Tenant'
import type { ITenantRepository } from '../../repositories'

interface UpdateTenantInput {
  asaasCustomerId?: string
  asaasWalletId?: string
}

export class UpdateTenantUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id)

    if (!tenant) {
      throw new EntityNotFoundError('Tenant', id)
    }

    if (input.asaasCustomerId && input.asaasWalletId) {
      tenant.linkAsaasAccount(input.asaasCustomerId, input.asaasWalletId)
    }

    return await this.tenantRepository.update(tenant)
  }
}
