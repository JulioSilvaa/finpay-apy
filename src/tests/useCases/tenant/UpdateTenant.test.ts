import { beforeEach,describe, expect, it } from 'vitest'

import { Tenant } from '../../../core/entities/Tenant'
import type { ITenantRepository } from '../../../core/repositories/ITenantRepository'
import { UpdateTenantUseCase } from '../../../core/useCases/tenant/UpdateTenant'
import { EntityNotFoundError } from '../../../shared/errors'

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

  async update(tenant: Tenant): Promise<Tenant> {
    const index = this.tenants.findIndex((t) => t.id === tenant.id)
    if (index >= 0) {
      this.tenants[index] = tenant
    }
    return tenant
  }

  async activate(id: string): Promise<void> {
    const tenant = await this.findById(id)
    if (tenant) {
      tenant.activate()
      await this.save(tenant)
    }
  }

  async deactivate(id: string): Promise<void> {
    const tenant = await this.findById(id)
    if (tenant) {
      tenant.deactivate()
      await this.save(tenant)
    }
  }
}

describe('UpdateTenantUseCase', () => {
  let tenantRepository: InMemoryTenantRepository
  let updateTenant: UpdateTenantUseCase
  let tenant: Tenant

  beforeEach(() => {
    tenantRepository = new InMemoryTenantRepository()
    updateTenant = new UpdateTenantUseCase(tenantRepository)

    tenant = Tenant.create({
      name: 'Empresa Original',
      email: 'original@test.com',
      asaasWalletId: 'wallet-123',
    })

    tenantRepository.tenants.push(tenant)
  })

  it('deve atualizar asaasWalletId', async () => {
    const updated = await updateTenant.execute(tenant.id, {
      asaasWalletId: 'new-wallet-456',
      asaasCustomerId: 'customer-456',
    })

    expect(updated.asaasWalletId).toBe('new-wallet-456')
    expect(updated.asaasCustomerId).toBe('customer-456')
  })

  it('deve lançar erro se tenant não existir', async () => {
    await expect(
      updateTenant.execute('invalid-id', {
        asaasWalletId: 'wallet-123',
      }),
    ).rejects.toThrow(EntityNotFoundError)
  })
})
