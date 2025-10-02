import type { Subscription } from '../../../core/entities/Subscription'
import type { ISubscriptionRepository } from '../../../core/repositories'

export class SubscriptionRepositoryInMemory implements ISubscriptionRepository {
  private subscriptions: Subscription[] = []

  async create(subscription: Subscription): Promise<Subscription> {
    this.subscriptions.push(subscription)
    return subscription
  }

  async findById(id: string): Promise<Subscription | null> {
    return this.subscriptions.find((s) => s.id === id) || null
  }

  async findByCustomerId(customerId: string): Promise<Subscription[]> {
    return this.subscriptions.filter((s) => s.customerId === customerId)
  }

  async findByTenantId(tenantId: string): Promise<Subscription[]> {
    return this.subscriptions.filter((s) => s.tenantId === tenantId)
  }

  async findByStatus(status: string): Promise<Subscription[]> {
    return this.subscriptions.filter((s) => s.status === status)
  }

  async findActiveByCustomerId(customerId: string): Promise<Subscription[]> {
    return this.subscriptions.filter(
      (s) => s.customerId === customerId && s.status === 'ACTIVE'
    )
  }

  async update(subscription: Subscription): Promise<Subscription> {
    const index = this.subscriptions.findIndex((s) => s.id === subscription.id)
    if (index === -1) {
      throw new Error('Subscription not found')
    }
    this.subscriptions[index] = subscription
    return subscription
  }

  async delete(id: string): Promise<void> {
    const index = this.subscriptions.findIndex((s) => s.id === id)
    if (index === -1) {
      throw new Error('Subscription not found')
    }
    this.subscriptions.splice(index, 1)
  }

  async list(): Promise<Subscription[]> {
    return this.subscriptions
  }

  // Helper method for tests
  clear(): void {
    this.subscriptions = []
  }
}
