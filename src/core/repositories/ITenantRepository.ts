import type { Tenant } from '../entities/Tenant'

export interface ITenantRepository {
  create(tenant: Tenant): Promise<Tenant>
  findById(id: string): Promise<Tenant | null>
  findByEmail(email: string): Promise<Tenant | null>
  findByDocument(document: string): Promise<Tenant | null>
  update(tenant: Tenant): Promise<Tenant>
  delete(id: string): Promise<void>
  activate(id: string): Promise<void>
  deactivate(id: string): Promise<void>
  list(): Promise<Tenant[]>
}
