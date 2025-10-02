import type CustomerEntity from "../../entities/customerEntity.ts";
import type CustomerRepository from "../../repositories/CustomerRepository.ts";

export default class FindByIdCustomerUseCase {
  private customerUseCase: CustomerRepository;

  constructor(customerRepository: CustomerRepository) {
    this.customerUseCase = customerRepository;
  }

  async execute(id: string): Promise<CustomerEntity> {
    const customer = await this.customerUseCase.findByID(id);
    return customer;
  }
}
