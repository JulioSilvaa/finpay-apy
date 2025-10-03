import type { Subscription } from '../../entities/Subscription'
import type { ISubscriptionRepository } from '../../repositories/ISubscriptionRepository'

interface ResumeSubscriptionInput {
  subscriptionId: string
}

export class ResumeSubscription {
  constructor(private subscriptionRepository: ISubscriptionRepository) {}

  async execute(input: ResumeSubscriptionInput): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findById(input.subscriptionId)
    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    subscription.resume()
    await this.subscriptionRepository.save(subscription)

    return subscription
  }
}
