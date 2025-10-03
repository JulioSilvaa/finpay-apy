import type { Subscription } from '../../entities/Subscription'
import type { ISubscriptionRepository } from '../../repositories/ISubscriptionRepository'

interface FindSubscriptionsByCustomerInput {
  customerId: string
}

export class FindSubscriptionsByCustomer {
  constructor(private subscriptionRepository: ISubscriptionRepository) {}

  async execute(input: FindSubscriptionsByCustomerInput): Promise<Subscription[]> {
    return await this.subscriptionRepository.findByCustomerId(input.customerId)
  }
}
