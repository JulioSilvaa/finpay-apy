import { EntityNotFoundError } from '../../../shared/errors'
import type { ICustomerRepository } from '../../repositories/ICustomerRepository'

export class DeleteCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId)

    if (!customer) {
      throw new EntityNotFoundError('Customer', customerId)
    }

    await this.customerRepository.delete(customerId)
  }
}
