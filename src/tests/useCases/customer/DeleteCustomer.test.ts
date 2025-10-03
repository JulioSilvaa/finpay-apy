import { beforeEach,describe, expect, it } from 'vitest'

import { Customer } from '../../../core/entities/Customer'
import type { ICustomerRepository } from '../../../core/repositories/ICustomerRepository'
import { DeleteCustomerUseCase } from '../../../core/useCases/customer/DeleteCustomer'
import { EntityNotFoundError } from '../../../shared/errors'

class InMemoryCustomerRepository implements ICustomerRepository {
  public customers: Customer[] = []

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
    if (index >= 0) {
      this.customers[index] = customer
    }
    return customer
  }

  async delete(id: string): Promise<void> {
    this.customers = this.customers.filter((c) => c.id !== id)
  }

  async activate(id: string): Promise<void> {
    const customer = await this.findById(id)
    if (customer) {
      customer.activate()
    }
  }

  async deactivate(id: string): Promise<void> {
    const customer = await this.findById(id)
    if (customer) {
      customer.deactivate()
    }
  }

  async list(): Promise<Customer[]> {
    return this.customers
  }
}

describe('DeleteCustomerUseCase', () => {
  let customerRepository: InMemoryCustomerRepository
  let deleteCustomer: DeleteCustomerUseCase
  let customer: Customer

  beforeEach(() => {
    customerRepository = new InMemoryCustomerRepository()
    deleteCustomer = new DeleteCustomerUseCase(customerRepository)

    customer = Customer.create({
      tenantId: 'tenant-123',
      name: 'João Silva',
      email: 'joao@test.com',
      phone: '11999999999',
    })

    customerRepository.customers.push(customer)
  })

  it('deve deletar um customer', async () => {
    await deleteCustomer.execute(customer.id)

    const found = await customerRepository.findById(customer.id)
    expect(found).toBeNull()
    expect(customerRepository.customers).toHaveLength(0)
  })

  it('deve lançar erro se customer não existir', async () => {
    await expect(deleteCustomer.execute('invalid-id')).rejects.toThrow(
      EntityNotFoundError,
    )
  })
})
