import { beforeEach,describe, expect, it } from 'vitest'

import { Customer } from '../../../core/entities/Customer'
import { Tenant } from '../../../core/entities/Tenant'
import type { ICustomerRepository } from '../../../core/repositories/ICustomerRepository'
import type { ITenantRepository } from '../../../core/repositories/ITenantRepository'
import { CreateCustomerUseCase } from '../../../core/useCases/customer/CreateCustomer'
import { EntityNotFoundError } from '../../../shared/errors'

class InMemoryCustomerRepository implements ICustomerRepository {
  public customers: Customer[] = []

  async create(customer: Customer): Promise<Customer> {
    this.customers.push(customer)
    return customer
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customers.find((c) => c.id === id) || null
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customers.find((c) => c.email === email) || null
  }

  async findByDocument(document: string): Promise<Customer | null> {
    return this.customers.find((c) => c.document === document) || null
  }

  async findByTenantId(tenantId: string): Promise<Customer[]> {
    return this.customers.filter((c) => c.tenantId === tenantId)
  }

  async update(customer: Customer): Promise<Customer> {
    const index = this.customers.findIndex((c) => c.id === customer.id)
    if (index >= 0) {
      this.customers[index] = customer
    }
    return customer
  }

  async delete(id: string): Promise<void> {
    this.customers = this.customers.filter((c) => c.id !== id)
  }

  async activate(id: string): Promise<void> {
    const customer = await this.findById(id)
    if (customer) {
      customer.activate()
    }
  }

  async deactivate(id: string): Promise<void> {
    const customer = await this.findById(id)
    if (customer) {
      customer.deactivate()
    }
  }

  async list(): Promise<Customer[]> {
    return this.customers
  }
}

class InMemoryTenantRepository implements ITenantRepository {
  public tenants: Tenant[] = []

  async save(tenant: Tenant): Promise<void> {
    this.tenants.push(tenant)
  }

  async create(tenant: Tenant): Promise<Tenant> {
    this.tenants.push(tenant)
    return tenant
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.id === id) || null
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.email === email) || null
  }

  async findByDocument(document: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.document === document) || null
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenants
  }

  async delete(id: string): Promise<void> {
    this.tenants = this.tenants.filter((t) => t.id !== id)
  }

  async update(tenant: Tenant): Promise<Tenant> {
    return tenant
  }

  async activate(_id: string): Promise<void> {}
  async deactivate(_id: string): Promise<void> {}
}

describe('CreateCustomerUseCase', () => {
  let customerRepository: InMemoryCustomerRepository
  let tenantRepository: InMemoryTenantRepository
  let createCustomer: CreateCustomerUseCase
  let tenant: Tenant

  beforeEach(() => {
    customerRepository = new InMemoryCustomerRepository()
    tenantRepository = new InMemoryTenantRepository()
    createCustomer = new CreateCustomerUseCase(customerRepository, tenantRepository)

    tenant = Tenant.create({
      name: 'Empresa Test',
      email: 'empresa@test.com',
      asaasWalletId: 'wallet-123',
    })

    tenantRepository.tenants.push(tenant)
  })

  it('deve criar um customer', async () => {
    const customer = await createCustomer.execute({
      tenantId: tenant.id,
      name: 'João Silva',
      email: 'joao@test.com',
      phone: '11999999999',
    })

    expect(customer.id).toBeDefined()
    expect(customer.name).toBe('João Silva')
    expect(customer.email).toBe('joao@test.com')
    expect(customer.phone).toBe('11999999999')
    expect(customer.isActive).toBe(true)
    expect(customerRepository.customers).toHaveLength(1)
  })

  it('deve criar customer com documento', async () => {
    const customer = await createCustomer.execute({
      tenantId: tenant.id,
      name: 'Maria Santos',
      email: 'maria@test.com',
      phone: '11988888888',
      document: '12345678900',
    })

    expect(customer.document).toBe('12345678900')
  })

  it('deve lançar erro se tenant não existir', async () => {
    await expect(
      createCustomer.execute({
        tenantId: 'invalid-id',
        name: 'João Silva',
        email: 'joao@test.com',
        phone: '11999999999',
      }),
    ).rejects.toThrow(EntityNotFoundError)
  })

  it('deve lançar erro se email já existir', async () => {
    await createCustomer.execute({
      tenantId: tenant.id,
      name: 'Cliente 1',
      email: 'duplicado@test.com',
      phone: '11999999999',
    })

    await expect(
      createCustomer.execute({
        tenantId: tenant.id,
        name: 'Cliente 2',
        email: 'duplicado@test.com',
        phone: '11988888888',
      }),
    ).rejects.toThrow('Email já cadastrado')
  })

  it('deve lançar erro se documento já existir', async () => {
    await createCustomer.execute({
      tenantId: tenant.id,
      name: 'Cliente 1',
      email: 'cliente1@test.com',
      phone: '11999999999',
      document: '12345678900',
    })

    await expect(
      createCustomer.execute({
        tenantId: tenant.id,
        name: 'Cliente 2',
        email: 'cliente2@test.com',
        phone: '11988888888',
        document: '12345678900',
      }),
    ).rejects.toThrow('Documento já cadastrado')
  })

  it('deve lançar erro se nome for muito curto', async () => {
    await expect(
      createCustomer.execute({
        tenantId: tenant.id,
        name: 'Jo',
        email: 'joao@test.com',
        phone: '11999999999',
      }),
    ).rejects.toThrow('Nome deve ter pelo menos 3 caracteres')
  })

  it('deve lançar erro se email for inválido', async () => {
    await expect(
      createCustomer.execute({
        tenantId: tenant.id,
        name: 'João Silva',
        email: 'email-invalido',
        phone: '11999999999',
      }),
    ).rejects.toThrow('Email inválido')
  })

  it('deve lançar erro se telefone for inválido', async () => {
    await expect(
      createCustomer.execute({
        tenantId: tenant.id,
        name: 'João Silva',
        email: 'joao@test.com',
        phone: '123',
      }),
    ).rejects.toThrow('Telefone inválido')
  })
})
