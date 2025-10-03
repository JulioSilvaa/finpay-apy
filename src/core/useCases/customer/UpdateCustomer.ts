import { EntityNotFoundError } from '../../../shared/errors'
import type { Customer } from '../../entities/Customer'
import type { ICustomerRepository } from '../../repositories/ICustomerRepository'

interface UpdateCustomerInput {
  email?: string
  phone?: string
}

export class UpdateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string, input: UpdateCustomerInput): Promise<Customer> {
    const customer = await this.customerRepository.findById(customerId)

    if (!customer) {
      throw new EntityNotFoundError('Customer', customerId)
    }

    if (input.email && input.phone) {
      customer.updateContactInfo(input.email, input.phone)
    }

    return await this.customerRepository.update(customer)
  }
}
