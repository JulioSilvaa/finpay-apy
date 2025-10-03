import { beforeEach,describe, expect, it } from 'vitest'

import type { Subscription as SubscriptionType } from '../../../core/entities/Subscription'
import { Subscription } from '../../../core/entities/Subscription'
import type { ISubscriptionRepository } from '../../../core/repositories/ISubscriptionRepository'
import { CancelSubscription } from '../../../core/useCases/subscription/CancelSubscription'

class InMemorySubscriptionRepository implements ISubscriptionRepository {
  public subscriptions: SubscriptionType[] = []

  async save(subscription: SubscriptionType): Promise<void> {
    const index = this.subscriptions.findIndex((s) => s.id === subscription.id)
    if (index >= 0) {
      this.subscriptions[index] = subscription
    } else {
      this.subscriptions.push(subscription)
    }
  }

  async findById(id: string): Promise<SubscriptionType | null> {
    return this.subscriptions.find((s) => s.id === id) || null
  }

  async findByCustomerId(customerId: string): Promise<SubscriptionType[]> {
    return this.subscriptions.filter((s) => s.customerId === customerId)
  }

  async findByTenantId(tenantId: string): Promise<SubscriptionType[]> {
    return this.subscriptions.filter((s) => s.tenantId === tenantId)
  }

  async findActiveSubscriptionsDueForBilling(): Promise<SubscriptionType[]> {
    return this.subscriptions.filter((s) => s.shouldGenerateInvoice())
  }
}

describe('CancelSubscription', () => {
  let subscriptionRepository: InMemorySubscriptionRepository
  let cancelSubscription: CancelSubscription
  let subscription: SubscriptionType

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository()
    cancelSubscription = new CancelSubscription(subscriptionRepository)

    subscription = Subscription.create({
      tenantId: 'tenant-123',
      customerId: 'customer-123',
      description: 'Assinatura Premium',
      amount: 99.9,
      billingCycle: 'MONTHLY',
      paymentMethod: 'PIX',
      startDate: new Date(),
    })

    subscriptionRepository.subscriptions.push(subscription)
  })

  it('deve cancelar uma assinatura', async () => {
    const canceled = await cancelSubscription.execute({
      subscriptionId: subscription.id,
    })

    expect(canceled.status).toBe('CANCELED')
    expect(canceled.endDate).toBeDefined()
  })

  it('deve lançar erro se assinatura não existir', async () => {
    await expect(
      cancelSubscription.execute({
        subscriptionId: 'invalid-id',
      }),
    ).rejects.toThrow('Assinatura não encontrada')
  })

  it('deve permitir cancelar assinatura pausada', async () => {
    subscription.pause()
    await subscriptionRepository.save(subscription)

    const canceled = await cancelSubscription.execute({
      subscriptionId: subscription.id,
    })

    expect(canceled.status).toBe('CANCELED')
  })
})
