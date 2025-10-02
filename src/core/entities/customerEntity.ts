import type ICustomer from "../interfaces/CustomerInterface.js";

export default class CustomerEntity {
  id?: string | undefined;
  name: string;
  email: string;
  phone: string;

  constructor(props: ICustomer) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
  }
}
