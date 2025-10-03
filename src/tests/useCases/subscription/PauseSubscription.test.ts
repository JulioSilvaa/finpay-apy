import { beforeEach,describe, expect, it } from 'vitest'

import type { Subscription as SubscriptionType } from '../../../core/entities/Subscription'
import { Subscription } from '../../../core/entities/Subscription'
import type { ISubscriptionRepository } from '../../../core/repositories/ISubscriptionRepository'
import { PauseSubscription } from '../../../core/useCases/subscription/PauseSubscription'
import { ResumeSubscription } from '../../../core/useCases/subscription/ResumeSubscription'

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

describe('PauseSubscription and ResumeSubscription', () => {
  let subscriptionRepository: InMemorySubscriptionRepository
  let pauseSubscription: PauseSubscription
  let resumeSubscription: ResumeSubscription
  let subscription: SubscriptionType

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository()
    pauseSubscription = new PauseSubscription(subscriptionRepository)
    resumeSubscription = new ResumeSubscription(subscriptionRepository)

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

  it('deve pausar uma assinatura ativa', async () => {
    const paused = await pauseSubscription.execute({
      subscriptionId: subscription.id,
    })

    expect(paused.status).toBe('PAUSED')
  })

  it('deve retomar uma assinatura pausada', async () => {
    await pauseSubscription.execute({
      subscriptionId: subscription.id,
    })

    const resumed = await resumeSubscription.execute({
      subscriptionId: subscription.id,
    })

    expect(resumed.status).toBe('ACTIVE')
  })

  it('deve lançar erro ao pausar assinatura cancelada', async () => {
    subscription.cancel()
    await subscriptionRepository.save(subscription)

    await expect(
      pauseSubscription.execute({
        subscriptionId: subscription.id,
      }),
    ).rejects.toThrow('Assinatura cancelada não pode ser pausada')
  })

  it('deve lançar erro ao retomar assinatura que não está pausada', async () => {
    await expect(
      resumeSubscription.execute({
        subscriptionId: subscription.id,
      }),
    ).rejects.toThrow('Apenas assinaturas pausadas podem ser retomadas')
  })

  it('deve lançar erro se assinatura não existir', async () => {
    await expect(
      pauseSubscription.execute({
        subscriptionId: 'invalid-id',
      }),
    ).rejects.toThrow('Assinatura não encontrada')
  })
})
