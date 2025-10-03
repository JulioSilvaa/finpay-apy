import type { Subscription } from '../../entities/Subscription'
import type { ISubscriptionRepository } from '../../repositories/ISubscriptionRepository'

interface PauseSubscriptionInput {
  subscriptionId: string
}

export class PauseSubscription {
  constructor(private subscriptionRepository: ISubscriptionRepository) {}

  async execute(input: PauseSubscriptionInput): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(input.subscriptionId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    subscription.pause()
    await this.subscriptionRepository.save(subscription)

    return subscription
  }
}
