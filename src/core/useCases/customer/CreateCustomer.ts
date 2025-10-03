import { DomainError, EntityNotFoundError } from '../../../shared/errors'
import { Customer } from '../../entities/Customer'
import type { ICustomerRepository } from '../../repositories/ICustomerRepository'
import type { ITenantRepository } from '../../repositories/ITenantRepository'

interface CreateCustomerInput {
  tenantId: string
  name: string
  email: string
  phone: string
  document?: string
}

export class CreateCustomerUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private tenantRepository: ITenantRepository,
  ) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    // Verificar se tenant existe
    const tenant = await this.tenantRepository.findById(input.tenantId)
    if (!tenant) {
      throw new EntityNotFoundError('Tenant', input.tenantId)
    }

    // Verificar se email já existe
    const existingByEmail = await this.customerRepository.findByEmail(input.email)
    if (existingByEmail) {
      throw new DomainError('Email já cadastrado')
    }

    // Verificar se documento já existe (se fornecido)
    if (input.document) {
      const existingByDocument = await this.customerRepository.findByDocument(input.document)
      if (existingByDocument) {
        throw new DomainError('Documento já cadastrado')
      }
    }

    const customer = Customer.create({
      tenantId: input.tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      document: input.document,
    })

    return await this.customerRepository.create(customer)
  }
}
