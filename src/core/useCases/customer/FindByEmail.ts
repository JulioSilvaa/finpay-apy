import type CustomerEntity from "../../entities/customerEntity.ts";
import type ICustomerRepository from "../../repositories/CustomerRepository.js";

export default class FindCustomerByEmailUseCase {
  private customerRepository: ICustomerRepository;

  constructor(customerRepository: ICustomerRepository) {
    this.customerRepository = customerRepository;
  }

  async execute(email: string): Promise<CustomerEntity | null> {
    return await this.customerRepository.findByEmail(email);
  }
}
