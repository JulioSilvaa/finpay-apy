import { beforeEach,describe, expect, it } from 'vitest'

import { Tenant } from '../../../core/entities/Tenant'
import type { ITenantRepository } from '../../../core/repositories/ITenantRepository'
import { ActivateTenantUseCase } from '../../../core/useCases/tenant/ActivateTenant'
import { DeactivateTenantUseCase } from '../../../core/useCases/tenant/DeactivateTenant'
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

describe('ActivateTenant and DeactivateTenant', () => {
  let tenantRepository: InMemoryTenantRepository
  let activateTenant: ActivateTenantUseCase
  let deactivateTenant: DeactivateTenantUseCase
  let tenant: Tenant

  beforeEach(() => {
    tenantRepository = new InMemoryTenantRepository()
    activateTenant = new ActivateTenantUseCase(tenantRepository)
    deactivateTenant = new DeactivateTenantUseCase(tenantRepository)

    tenant = Tenant.create({
      name: 'Empresa Test',
      email: 'empresa@test.com',
      asaasWalletId: 'wallet-123',
    })

    tenantRepository.tenants.push(tenant)
  })

  it('deve desativar um tenant ativo', async () => {
    await deactivateTenant.execute(tenant.id)
    const updated = await tenantRepository.findById(tenant.id)

    expect(updated?.isActive).toBe(false)
  })

  it('deve ativar um tenant desativado', async () => {
    tenant.deactivate()
    await tenantRepository.save(tenant)

    await activateTenant.execute(tenant.id)
    const updated = await tenantRepository.findById(tenant.id)

    expect(updated?.isActive).toBe(true)
  })

  it('deve lançar erro ao desativar tenant que não existe', async () => {
    await expect(
      deactivateTenant.execute('invalid-id'),
    ).rejects.toThrow(EntityNotFoundError)
  })

  it('deve lançar erro ao ativar tenant que não existe', async () => {
    await expect(
      activateTenant.execute('invalid-id'),
    ).rejects.toThrow(EntityNotFoundError)
  })

  it('deve poder desativar e reativar múltiplas vezes', async () => {
    await deactivateTenant.execute(tenant.id)
    expect((await tenantRepository.findById(tenant.id))?.isActive).toBe(false)

    await activateTenant.execute(tenant.id)
    expect((await tenantRepository.findById(tenant.id))?.isActive).toBe(true)

    await deactivateTenant.execute(tenant.id)
    expect((await tenantRepository.findById(tenant.id))?.isActive).toBe(false)
  })
})
