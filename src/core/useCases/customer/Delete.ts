import type CustomerEntity from "../../entities/customerEntity.ts";
import type ICustomerRepository from "../../repositories/CustomerRepository.js";

export default class DeleteCustomerUseCase {
  private customerRepository: ICustomerRepository;

  constructor(customerRepository: ICustomerRepository) {
    this.customerRepository = customerRepository;
  }

  async execute(id: string): Promise<CustomerEntity> {
    const customerDeleted = await this.customerRepository.delete(id);
    return customerDeleted;
  }
}
