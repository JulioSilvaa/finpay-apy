import type ICustomer from "../../interfaces/CustomerInterface.ts";
import type ICustomerRepository from "../../repositories/CustomerRepository.js";

export default class FindAllCustomerUseCase {
  private customerRepository: ICustomerRepository;

  constructor(customerRepository: ICustomerRepository) {
    this.customerRepository = customerRepository;
  }

  async execute(): Promise<ICustomer[]> {
    const customers = await this.customerRepository.findAll();
    if (customers.length === 0) {
      return [];
    }
    return customers;
  }
}
