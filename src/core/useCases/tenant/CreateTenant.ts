import { DomainError } from '../../../shared/errors'
import { Tenant } from '../../entities/Tenant'
import type { ITenantRepository } from '../../repositories'

interface CreateTenantInput {
  email: string
  name: string
  phone?: string
  document?: string
  businessType?: string
}

export class CreateTenantUseCase {
  constructor(private tenantRepository: ITenantRepository) {}

  async execute(input: CreateTenantInput): Promise<Tenant> {
    // Verificar se email já existe
    const existingTenant = await this.tenantRepository.findByEmail(input.email)
    if (existingTenant) {
      throw new DomainError('Email já cadastrado')
    }

    // Verificar se documento já existe (se fornecido)
    if (input.document) {
      const existingByDocument = await this.tenantRepository.findByDocument(
        input.document
      )
      if (existingByDocument) {
        throw new DomainError('Documento já cadastrado')
      }
    }

    const tenant = Tenant.create(input)
    return await this.tenantRepository.create(tenant)
  }
}
