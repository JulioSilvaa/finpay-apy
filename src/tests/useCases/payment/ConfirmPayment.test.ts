import { beforeEach,describe, expect, it } from 'vitest'

import { Invoice } from '../../../core/entities/Invoice'
import { Payment } from '../../../core/entities/Payment'
import { Tenant } from '../../../core/entities/Tenant'
import type { IInvoiceRepository } from '../../../core/repositories/IInvoiceRepository'
import type { IPaymentRepository } from '../../../core/repositories/IPaymentRepository'
import { ConfirmPayment } from '../../../core/useCases/payment/ConfirmPayment'

class InMemoryPaymentRepository implements IPaymentRepository {
  public payments: Payment[] = []

  async save(payment: Payment): Promise<void> {
    const index = this.payments.findIndex((p) => p.id === payment.id)
    if (index >= 0) {
      this.payments[index] = payment
    } else {
      this.payments.push(payment)
    }
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
    const index = this.invoices.findIndex((i) => i.id === invoice.id)
    if (index >= 0) {
      this.invoices[index] = invoice
    } else {
      this.invoices.push(invoice)
    }
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

describe('ConfirmPayment', () => {
  let paymentRepository: InMemoryPaymentRepository
  let invoiceRepository: InMemoryInvoiceRepository
  let confirmPayment: ConfirmPayment
  let payment: Payment
  let invoice: Invoice

  beforeEach(() => {
    paymentRepository = new InMemoryPaymentRepository()
    invoiceRepository = new InMemoryInvoiceRepository()
    confirmPayment = new ConfirmPayment(paymentRepository, invoiceRepository)

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

    payment = Payment.create({
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      amount: 100,
      paymentMethod: 'PIX',
    })

    paymentRepository.payments.push(payment)
    invoiceRepository.invoices.push(invoice)
  })

  it('deve confirmar um pagamento', async () => {
    const confirmedPayment = await confirmPayment.execute({
      paymentId: payment.id,
    })

    expect(confirmedPayment.status).toBe('CONFIRMED')
    expect(confirmedPayment.confirmedAt).toBeDefined()
    expect(confirmedPayment.isConfirmed()).toBe(true)
  })

  it('deve marcar a invoice como paga ao confirmar o pagamento', async () => {
    await confirmPayment.execute({
      paymentId: payment.id,
    })

    const updatedInvoice = await invoiceRepository.findById(invoice.id)
    expect(updatedInvoice?.status).toBe('PAID')
    expect(updatedInvoice?.isPaid()).toBe(true)
  })

  it('deve lançar erro se pagamento não existir', async () => {
    await expect(
      confirmPayment.execute({
        paymentId: 'invalid-id',
      }),
    ).rejects.toThrow('Pagamento não encontrado')
  })

  it('deve usar data customizada de confirmação', async () => {
    const customDate = new Date('2024-01-15')
    const confirmedPayment = await confirmPayment.execute({
      paymentId: payment.id,
      confirmedAt: customDate,
    })

    expect(confirmedPayment.confirmedAt).toEqual(customDate)
  })
})
