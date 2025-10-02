import type { Customer } from '../../../core/entities/Customer'
import type { ICustomerRepository } from '../../../core/repositories'

export class CustomerRepositoryInMemory implements ICustomerRepository {
  private customers: Customer[] = []

  async create(customer: Customer): Promise<Customer> {
    this.customers.push(customer)
    return customer
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customers.find((c) => c.id === id) || null
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customers.find((c) => c.email === email) || null
  }

  async findByDocument(document: string): Promise<Customer | null> {
    return this.customers.find((c) => c.document === document) || null
  }

  async findByTenantId(tenantId: string): Promise<Customer[]> {
    return this.customers.filter((c) => c.tenantId === tenantId)
  }

  async update(customer: Customer): Promise<Customer> {
    const index = this.customers.findIndex((c) => c.id === customer.id)
    if (index === -1) {
      throw new Error('Customer not found')
    }
    this.customers[index] = customer
    return customer
  }

  async delete(id: string): Promise<void> {
    const index = this.customers.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error('Customer not found')
    }
    this.customers.splice(index, 1)
  }

  async activate(id: string): Promise<void> {
    const customer = await this.findById(id)
    if (!customer) {
      throw new Error('Customer not found')
    }
    customer.activate()
    await this.update(customer)
  }

  async deactivate(id: string): Promise<void> {
    const customer = await this.findById(id)
    if (!customer) {
      throw new Error('Customer not found')
    }
    customer.deactivate()
    await this.update(customer)
  }

  async list(): Promise<Customer[]> {
    return this.customers
  }

  // Helper method for tests
  clear(): void {
    this.customers = []
  }
}
