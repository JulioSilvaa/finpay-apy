import type { Subscription } from '../entities/Subscription'

export interface ISubscriptionRepository {
  create(subscription: Subscription): Promise<Subscription>
  findById(id: string): Promise<Subscription | null>
  findByCustomerId(customerId: string): Promise<Subscription[]>
  findByTenantId(tenantId: string): Promise<Subscription[]>
  findByStatus(status: string): Promise<Subscription[]>
  findActiveByCustomerId(customerId: string): Promise<Subscription[]>
  update(subscription: Subscription): Promise<Subscription>
  delete(id: string): Promise<void>
  list(): Promise<Subscription[]>
}
