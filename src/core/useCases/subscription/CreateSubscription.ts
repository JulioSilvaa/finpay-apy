import type { PaymentMethod } from '../../entities/Invoice'
import { type BillingCycle,Subscription } from '../../entities/Subscription'
import type { ICustomerRepository } from '../../repositories/ICustomerRepository'
import type { ISubscriptionRepository } from '../../repositories/ISubscriptionRepository'

interface CreateSubscriptionInput {
  tenantId: string
  customerId: string
  description?: string
  amount: number
  billingCycle: BillingCycle
  paymentMethod: PaymentMethod
  startDate: Date
}

export class CreateSubscription {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private customerRepository: ICustomerRepository,
  ) {}

  async execute(input: CreateSubscriptionInput): Promise<Subscription> {
    // Verificar se o cliente existe
    const customer = await this.customerRepository.findById(input.customerId)
    if (!customer) {
      throw new Error('Cliente não encontrado')
    }

    // Criar a assinatura
    const subscription = Subscription.create({
      tenantId: input.tenantId,
      customerId: input.customerId,
      description: input.description,
      amount: input.amount,
      billingCycle: input.billingCycle,
      paymentMethod: input.paymentMethod,
      startDate: input.startDate,
    })

    // Salvar
    await this.subscriptionRepository.save(subscription)

    return subscription
  }
}
