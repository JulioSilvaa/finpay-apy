import { beforeEach,describe, expect, it } from 'vitest'

import { Invoice } from '../../../core/entities/Invoice'
import type { Payment } from '../../../core/entities/Payment'
import { Tenant } from '../../../core/entities/Tenant'
import type { IInvoiceRepository } from '../../../core/repositories/IInvoiceRepository'
import type { IPaymentRepository } from '../../../core/repositories/IPaymentRepository'
import { CreatePayment } from '../../../core/useCases/payment/CreatePayment'

class InMemoryPaymentRepository implements IPaymentRepository {
  public payments: Payment[] = []

  async save(payment: Payment): Promise<void> {
    this.payments.push(payment)
  }

  async findById(id: string): Promise<Payment | null> {
    return this.payments.find((p) => p.id === id) || null
  }

  async findByInvoiceId(invoiceId: string): Promise<Payment[]> {
    return this.payments.filter((p) => p.invoiceId === invoiceId)
  }

  async findByCustomerId(customerId: string): Promise<Payment[]> {
    return this.payments.filter((p) => p.customerId === customerId)
  }
}

class InMemoryInvoiceRepository implements IInvoiceRepository {
  public invoices: Invoice[] = []

  async save(invoice: Invoice): Promise<void> {
    this.invoices.push(invoice)
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

describe('CreatePayment', () => {
  let paymentRepository: InMemoryPaymentRepository
  let invoiceRepository: InMemoryInvoiceRepository
  let createPayment: CreatePayment
  let invoice: Invoice

  beforeEach(() => {
    paymentRepository = new InMemoryPaymentRepository()
    invoiceRepository = new InMemoryInvoiceRepository()
    createPayment = new CreatePayment(paymentRepository, invoiceRepository)

    const tenant = Tenant.create({
      name: 'Tenant Test',
      email: 'tenant@test.com',
      asaasWalletId: 'wallet-123',
    })

    invoice = Invoice.create(
      {
        tenantId: tenant.id,
        customerId: 'customer-123',
        invoiceNumber: 'INV-001',
        amount: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      tenant,
      'PIX',
    )

    invoiceRepository.invoices.push(invoice)
  })

  it('deve criar um pagamento', async () => {
    const payment = await createPayment.execute({
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      amount: 100,
      paymentMethod: 'PIX',
    })

    expect(payment.id).toBeDefined()
    expect(payment.amount).toBe(100)
    expect(payment.status).toBe('PENDING')
    expect(paymentRepository.payments).toHaveLength(1)
  })

  it('deve lançar erro se invoice não existir', async () => {
    await expect(
      createPayment.execute({
        invoiceId: 'invalid-id',
        tenantId: 'tenant-123',
        customerId: 'customer-123',
        amount: 100,
        paymentMethod: 'PIX',
      }),
    ).rejects.toThrow('Invoice não encontrada')
  })

  it('deve criar pagamento com asaasPaymentId', async () => {
    const payment = await createPayment.execute({
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      amount: 100,
      paymentMethod: 'PIX',
      asaasPaymentId: 'asaas-123',
    })

    expect(payment.asaasPaymentId).toBe('asaas-123')
  })
})
