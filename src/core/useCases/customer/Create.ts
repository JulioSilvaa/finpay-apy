import type ICustomer from "../../interfaces/CustomerInterface.ts";
import type CustomerRepository from "../../repositories/CustomerRepository.ts";

export default class CreateCustomerUseCase {
  private customerRepository: CustomerRepository;

  constructor(customerRepository: CustomerRepository) {
    this.customerRepository = customerRepository;
  }

  async execute({ name, phone, email }: ICustomer): Promise<ICustomer> {
    const user = await this.customerRepository.save({ name, phone, email });
    return user;
  }
}
