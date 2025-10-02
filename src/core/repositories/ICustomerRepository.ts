import type { Customer } from '../entities/Customer'

export interface ICustomerRepository {
  create(customer: Customer): Promise<Customer>
  findById(id: string): Promise<Customer | null>
  findByEmail(email: string): Promise<Customer | null>
  findByDocument(document: string): Promise<Customer | null>
  findByTenantId(tenantId: string): Promise<Customer[]>
  update(customer: Customer): Promise<Customer>
  delete(id: string): Promise<void>
  activate(id: string): Promise<void>
  deactivate(id: string): Promise<void>
  list(): Promise<Customer[]>
}
