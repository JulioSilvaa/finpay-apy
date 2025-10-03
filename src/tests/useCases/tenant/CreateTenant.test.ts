import { beforeEach,describe, expect, it } from 'vitest'

import { Tenant } from '../../../core/entities/Tenant'
import type { ITenantRepository } from '../../../core/repositories/ITenantRepository'
import { CreateTenantUseCase } from '../../../core/useCases/tenant/CreateTenant'

class InMemoryTenantRepository implements ITenantRepository {
  public tenants: Tenant[] = []

  async save(tenant: Tenant): Promise<void> {
    const index = this.tenants.findIndex((t) => t.id === tenant.id)
    if (index >= 0) {
      this.tenants[index] = tenant
    } else {
      this.tenants.push(tenant)
    }
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
}

describe('CreateTenantUseCase', () => {
  let tenantRepository: InMemoryTenantRepository
  let createTenant: CreateTenantUseCase

  beforeEach(() => {
    tenantRepository = new InMemoryTenantRepository()
    createTenant = new CreateTenantUseCase(tenantRepository)
  })

  it('deve criar um tenant com dados mínimos', async () => {
    const tenant = await createTenant.execute({
      name: 'Empresa Teste',
      email: 'empresa@test.com',
    })

    expect(tenant.id).toBeDefined()
    expect(tenant.name).toBe('Empresa Teste')
    expect(tenant.email).toBe('empresa@test.com')
    expect(tenant.isActive).toBe(true)
    expect(tenantRepository.tenants).toHaveLength(1)
  })

  it('deve criar tenant com todos os dados', async () => {
    const tenant = await createTenant.execute({
      name: 'Empresa Completa',
      email: 'completa@test.com',
      phone: '11999999999',
      document: '12345678000100',
      businessType: 'LTDA',
    })

    expect(tenant.name).toBe('Empresa Completa')
    expect(tenant.email).toBe('completa@test.com')
    expect(tenant.phone).toBe('11999999999')
    expect(tenant.document).toBe('12345678000100')
    expect(tenant.businessType).toBe('LTDA')
  })

  it('deve lançar erro se email já existir', async () => {
    await createTenant.execute({
      name: 'Empresa 1',
      email: 'duplicado@test.com',
    })

    await expect(
      createTenant.execute({
        name: 'Empresa 2',
        email: 'duplicado@test.com',
      }),
    ).rejects.toThrow('Email já cadastrado')
  })

  it('deve lançar erro se documento já existir', async () => {
    await createTenant.execute({
      name: 'Empresa 1',
      email: 'empresa1@test.com',
      document: '12345678000100',
    })

    await expect(
      createTenant.execute({
        name: 'Empresa 2',
        email: 'empresa2@test.com',
        document: '12345678000100',
      }),
    ).rejects.toThrow('Documento já cadastrado')
  })

  it('deve lançar erro se nome estiver vazio', async () => {
    await expect(
      createTenant.execute({
        name: '',
        email: 'test@test.com',
      }),
    ).rejects.toThrow('Nome deve ter pelo menos 3 caracteres')
  })

  it('deve lançar erro se email for inválido', async () => {
    await expect(
      createTenant.execute({
        name: 'Empresa Test',
        email: 'email-invalido',
      }),
    ).rejects.toThrow('Email inválido')
  })
})
