import type CustomerEntity from "../../entities/customerEntity.ts";
import type CustomerRepository from "../../repositories/CustomerRepository.js";

export default class UpdateCustomerUseCase {
  private customerRepository: CustomerRepository;

  constructor(customerRepository: CustomerRepository) {
    this.customerRepository = customerRepository;
  }

  async execute(id: string, data: CustomerEntity): Promise<CustomerEntity> {
    const customerUpdated = await this.customerRepository.update(id, data);
    return customerUpdated;
  }
}
