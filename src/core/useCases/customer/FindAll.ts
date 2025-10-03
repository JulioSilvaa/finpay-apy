import { ICustomer } from "../../interfaces";
import { ICustomerRepository } from "../../repositories";


export default class FindAllCustomerUseCase {
  private customerRepository: ICustomerRepository;

  constructor(customerRepository: ICustomerRepository) {
    this.customerRepository = customerRepository;
  }

  async execute(): Promise<ICustomer[]> {
    const customers = await this.customerRepository.list();
    if (customers.length === 0) {
      return [];
    }
    return customers;
  }
}
