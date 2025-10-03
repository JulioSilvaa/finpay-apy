import type { Subscription } from '../../entities/Subscription'
import type { ISubscriptionRepository } from '../../repositories/ISubscriptionRepository'

interface CancelSubscriptionInput {
  subscriptionId: string
}

export class CancelSubscription {
  constructor(private subscriptionRepository: ISubscriptionRepository) {}

  async execute(input: CancelSubscriptionInput): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(input.subscriptionId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    subscription.cancel()
    await this.subscriptionRepository.save(subscription)

    return subscription
  }
}
