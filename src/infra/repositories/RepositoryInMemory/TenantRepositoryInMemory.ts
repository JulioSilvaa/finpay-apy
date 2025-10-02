import type { Tenant } from '../../../core/entities/Tenant'
import type { ITenantRepository } from '../../../core/repositories'

export class TenantRepositoryInMemory implements ITenantRepository {
  private tenants: Tenant[] = []

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

  async update(tenant: Tenant): Promise<Tenant> {
    const index = this.tenants.findIndex((t) => t.id === tenant.id)
    if (index === -1) {
      throw new Error('Tenant not found')
    }
    this.tenants[index] = tenant
    return tenant
  }

  async delete(id: string): Promise<void> {
    const index = this.tenants.findIndex((t) => t.id === id)
    if (index === -1) {
      throw new Error('Tenant not found')
    }
    this.tenants.splice(index, 1)
  }

  async activate(id: string): Promise<void> {
    const tenant = await this.findById(id)
    if (!tenant) {
      throw new Error('Tenant not found')
    }
    tenant.activate()
    await this.update(tenant)
  }

  async deactivate(id: string): Promise<void> {
    const tenant = await this.findById(id)
    if (!tenant) {
      throw new Error('Tenant not found')
    }
    tenant.deactivate()
    await this.update(tenant)
  }

  async list(): Promise<Tenant[]> {
    return this.tenants
  }

  // Helper method for tests
  clear(): void {
    this.tenants = []
  }
}
