import type { Subscription } from '../../entities/Subscription'
import type { ISubscriptionRepository } from '../../repositories/ISubscriptionRepository'

interface UpdateSubscriptionAmountInput {
  subscriptionId: string
  newAmount: number
}

export class UpdateSubscriptionAmount {
  constructor(private subscriptionRepository: ISubscriptionRepository) {}

  async execute(input: UpdateSubscriptionAmountInput): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(input.subscriptionId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    subscription.updateAmount(input.newAmount)
    await this.subscriptionRepository.save(subscription)

    return subscription
  }
}
