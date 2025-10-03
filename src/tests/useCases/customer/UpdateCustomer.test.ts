import { beforeEach,describe, expect, it } from 'vitest'

import { Customer } from '../../../core/entities/Customer'
import type { ICustomerRepository } from '../../../core/repositories/ICustomerRepository'
import { UpdateCustomerUseCase } from '../../../core/useCases/customer/UpdateCustomer'
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

describe('UpdateCustomerUseCase', () => {
  let customerRepository: InMemoryCustomerRepository
  let updateCustomer: UpdateCustomerUseCase
  let customer: Customer

  beforeEach(() => {
    customerRepository = new InMemoryCustomerRepository()
    updateCustomer = new UpdateCustomerUseCase(customerRepository)

    customer = Customer.create({
      tenantId: 'tenant-123',
      name: 'João Silva',
      email: 'joao@test.com',
      phone: '11999999999',
    })

    customerRepository.customers.push(customer)
  })

  it('deve atualizar informações de contato do customer', async () => {
    const updated = await updateCustomer.execute(customer.id, {
      email: 'joao.novo@test.com',
      phone: '11988888888',
    })

    expect(updated.email).toBe('joao.novo@test.com')
    expect(updated.phone).toBe('11988888888')
  })

  it('deve lançar erro se customer não existir', async () => {
    await expect(
      updateCustomer.execute('invalid-id', {
        email: 'novo@test.com',
        phone: '11988888888',
      }),
    ).rejects.toThrow(EntityNotFoundError)
  })

  it('deve lançar erro se email for inválido', async () => {
    await expect(
      updateCustomer.execute(customer.id, {
        email: 'email-invalido',
        phone: '11988888888',
      }),
    ).rejects.toThrow('Email inválido')
  })

  it('deve lançar erro se telefone for inválido', async () => {
    await expect(
      updateCustomer.execute(customer.id, {
        email: 'joao@test.com',
        phone: '123',
      }),
    ).rejects.toThrow('Telefone inválido')
  })
})
