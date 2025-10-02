import CustomerEntity from "../core/entities/customerEntity.ts";

export default class CustomerAdapter {
  static async Dto({ email, name, phone }: CustomerEntity) {
    return new CustomerEntity({ email, name, phone });
  }
}
