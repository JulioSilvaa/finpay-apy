import { beforeEach,describe, expect, it } from 'vitest'

import { Customer } from '../../../core/entities/Customer'
import type { Subscription } from '../../../core/entities/Subscription'
import type { ICustomerRepository } from '../../../core/repositories/ICustomerRepository'
import type { ISubscriptionRepository } from '../../../core/repositories/ISubscriptionRepository'
import { CreateSubscription } from '../../../core/useCases/subscription/CreateSubscription'

class InMemorySubscriptionRepository implements ISubscriptionRepository {
  public subscriptions: Subscription[] = []

  async save(subscription: Subscription): Promise<void> {
    this.subscriptions.push(subscription)
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

  async findActiveSubscriptionsDueForBilling(): Promise<Subscription[]> {
    return this.subscriptions.filter((s) => s.shouldGenerateInvoice())
  }
}

class InMemoryCustomerRepository implements ICustomerRepository {
  public customers: Customer[] = []

  async save(customer: Customer): Promise<void> {
    this.customers.push(customer)
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customers.find((c) => c.id === id) || null
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customers.find((c) => c.email === email) || null
  }

  async findByTenantId(tenantId: string): Promise<Customer[]> {
    return this.customers.filter((c) => c.tenantId === tenantId)
  }

  async delete(id: string): Promise<void> {
    this.customers = this.customers.filter((c) => c.id !== id)
  }
}

describe('CreateSubscription', () => {
  let subscriptionRepository: InMemorySubscriptionRepository
  let customerRepository: InMemoryCustomerRepository
  let createSubscription: CreateSubscription
  let customer: Customer

  beforeEach(() => {
    subscriptionRepository = new InMemorySubscriptionRepository()
    customerRepository = new InMemoryCustomerRepository()
    createSubscription = new CreateSubscription(subscriptionRepository, customerRepository)

    customer = Customer.create({
      tenantId: 'tenant-123',
      name: 'John Doe',
      email: 'john@test.com',
      document: '12345678900',
      phone: '11999999999',
    })

    customerRepository.customers.push(customer)
  })

  it('deve criar uma assinatura mensal', async () => {
    const subscription = await createSubscription.execute({
      tenantId: customer.tenantId,
      customerId: customer.id,
      description: 'Assinatura Premium',
      amount: 99.9,
      billingCycle: 'MONTHLY',
      paymentMethod: 'PIX',
      startDate: new Date(),
    })

    expect(subscription.id).toBeDefined()
    expect(subscription.amount).toBe(99.9)
    expect(subscription.status).toBe('ACTIVE')
    expect(subscription.billingCycle).toBe('MONTHLY')
    expect(subscription.nextBillingDate).toBeDefined()
    expect(subscriptionRepository.subscriptions).toHaveLength(1)
  })

  it('deve criar assinatura com diferentes ciclos de cobrança', async () => {
    const weekly = await createSubscription.execute({
      tenantId: customer.tenantId,
      customerId: customer.id,
      amount: 25,
      billingCycle: 'WEEKLY',
      paymentMethod: 'PIX',
      startDate: new Date(),
    })

    const annual = await createSubscription.execute({
      tenantId: customer.tenantId,
      customerId: customer.id,
      amount: 1200,
      billingCycle: 'ANNUAL',
      paymentMethod: 'CREDIT_CARD',
      startDate: new Date(),
    })

    expect(weekly.billingCycle).toBe('WEEKLY')
    expect(annual.billingCycle).toBe('ANNUAL')
    expect(subscriptionRepository.subscriptions).toHaveLength(2)
  })

  it('deve lançar erro se cliente não existir', async () => {
    await expect(
      createSubscription.execute({
        tenantId: 'tenant-123',
        customerId: 'invalid-id',
        amount: 100,
        billingCycle: 'MONTHLY',
        paymentMethod: 'PIX',
        startDate: new Date(),
      }),
    ).rejects.toThrow('Cliente não encontrado')
  })

  it('deve calcular próxima data de cobrança corretamente', async () => {
    const startDate = new Date('2024-01-01')
    const subscription = await createSubscription.execute({
      tenantId: customer.tenantId,
      customerId: customer.id,
      amount: 50,
      billingCycle: 'MONTHLY',
      paymentMethod: 'PIX',
      startDate,
    })

    const expectedNextBilling = new Date('2024-02-01')
    expect(subscription.nextBillingDate.toDateString()).toBe(expectedNextBilling.toDateString())
  })
})
