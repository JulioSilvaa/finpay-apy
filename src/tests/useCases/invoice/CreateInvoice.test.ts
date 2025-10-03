import { beforeEach,describe, expect, it } from 'vitest'

import { Invoice } from '../../../core/entities/Invoice'
import { Tenant } from '../../../core/entities/Tenant'
import type { IInvoiceRepository } from '../../../core/repositories/IInvoiceRepository'
import type { ITenantRepository } from '../../../core/repositories/ITenantRepository'
import { CreateInvoiceUseCase } from '../../../core/useCases/invoice/CreateInvoice'
import { EntityNotFoundError } from '../../../shared/errors'

class InMemoryInvoiceRepository implements IInvoiceRepository {
  public invoices: Invoice[] = []

  async save(invoice: Invoice): Promise<void> {
    const index = this.invoices.findIndex((i) => i.id === invoice.id)
    if (index >= 0) {
      this.invoices[index] = invoice
    } else {
      this.invoices.push(invoice)
    }
  }

  async create(invoice: Invoice): Promise<Invoice> {
    this.invoices.push(invoice)
    return invoice
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoices.find((i) => i.id === id) || null
  }

  async findByTenantId(tenantId: string): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.tenantId === tenantId)
  }

  async findByCustomerId(customerId: string): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.customerId === customerId)
  }

  async findOverdue(): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.isOverdue())
  }
}

class InMemoryTenantRepository implements ITenantRepository {
  public tenants: Tenant[] = []

  async save(tenant: Tenant): Promise<void> {
    const index = this.tenants.findIndex((t) => t.id === tenant.id)
    if (index >= 0) {
      this.tenants[index] = tenant
    } else {
      this.tenants.push(tenant)
    }
  }

  async create(tenant: Tenant): Promise<Tenant> {
    this.tenants.push(tenant)
    return tenant
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.id === id) || null
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.email === email) || null
  }

  async findByDocument(document: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.document === document) || null
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenants
  }

  async delete(id: string): Promise<void> {
    this.tenants = this.tenants.filter((t) => t.id !== id)
  }
}

describe('CreateInvoiceUseCase', () => {
  let invoiceRepository: InMemoryInvoiceRepository
  let tenantRepository: InMemoryTenantRepository
  let createInvoice: CreateInvoiceUseCase
  let tenant: Tenant

  beforeEach(() => {
    invoiceRepository = new InMemoryInvoiceRepository()
    tenantRepository = new InMemoryTenantRepository()
    createInvoice = new CreateInvoiceUseCase(invoiceRepository, tenantRepository)

    tenant = Tenant.create({
      name: 'Tenant Test',
      email: 'tenant@test.com',
      asaasWalletId: 'wallet-123',
    })

    tenantRepository.tenants.push(tenant)
  })

  it('deve criar uma invoice com PIX', async () => {
    const invoice = await createInvoice.execute({
      tenantId: tenant.id,
      customerId: 'customer-123',
      amount: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethod: 'PIX',
    })

    expect(invoice.id).toBeDefined()
    expect(invoice.amount).toBe(100)
    expect(invoice.platformFee).toBe(1.5) // 1.5% de 100
    expect(invoice.asaasFee).toBe(0) // PIX é grátis (env padrão)
    expect(invoice.tenantReceives).toBe(98.5) // 100 - 1.5 - 0
    expect(invoice.status).toBe('PENDING')
    expect(invoiceRepository.invoices).toHaveLength(1)
  })

  it('deve criar uma invoice com BOLETO', async () => {
    const invoice = await createInvoice.execute({
      tenantId: tenant.id,
      customerId: 'customer-123',
      amount: 200,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethod: 'BOLETO',
    })

    expect(invoice.platformFee).toBe(3) // 1.5% de 200
    expect(invoice.asaasFee).toBe(3.49) // Taxa fixa Boleto
    expect(invoice.tenantReceives).toBe(193.51) // 200 - 3 - 3.49
  })

  it('deve criar uma invoice com CREDIT_CARD', async () => {
    const invoice = await createInvoice.execute({
      tenantId: tenant.id,
      customerId: 'customer-123',
      amount: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethod: 'CREDIT_CARD',
    })

    expect(invoice.platformFee).toBe(1.5) // 1.5% de 100
    expect(invoice.asaasFee).toBe(4.99) // 4.99% de 100 (env padrão)
    expect(invoice.tenantReceives).toBe(93.51) // 100 - 1.5 - 4.99
  })

  it('deve criar invoice com subscriptionId', async () => {
    const invoice = await createInvoice.execute({
      tenantId: tenant.id,
      customerId: 'customer-123',
      subscriptionId: 'subscription-123',
      amount: 99.9,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentMethod: 'PIX',
    })

    expect(invoice.subscriptionId).toBe('subscription-123')
  })

  it('deve lançar erro se tenant não existir', async () => {
    await expect(
      createInvoice.execute({
        tenantId: 'invalid-id',
        customerId: 'customer-123',
        amount: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        paymentMethod: 'PIX',
      }),
    ).rejects.toThrow(EntityNotFoundError)
  })

  it('deve lançar erro se valor for zero ou negativo', async () => {
    await expect(
      createInvoice.execute({
        tenantId: tenant.id,
        customerId: 'customer-123',
        amount: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        paymentMethod: 'PIX',
      }),
    ).rejects.toThrow('Valor deve ser maior que zero')
  })

  it('deve lançar erro se data de vencimento for passada', async () => {
    await expect(
      createInvoice.execute({
        tenantId: tenant.id,
        customerId: 'customer-123',
        amount: 100,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // ontem
        paymentMethod: 'PIX',
      }),
    ).rejects.toThrow('Data de vencimento deve ser futura')
  })
})
