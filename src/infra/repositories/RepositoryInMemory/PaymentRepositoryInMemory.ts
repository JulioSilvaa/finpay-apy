import type { Payment } from '../../../core/entities/Payment'
import type { IPaymentRepository } from '../../../core/repositories'

export class PaymentRepositoryInMemory implements IPaymentRepository {
  private payments: Payment[] = []

  async create(payment: Payment): Promise<Payment> {
    this.payments.push(payment)
    return payment
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

  async findByTenantId(tenantId: string): Promise<Payment[]> {
    return this.payments.filter((p) => p.tenantId === tenantId)
  }

  async findByStatus(status: string): Promise<Payment[]> {
    return this.payments.filter((p) => p.status === status)
  }

  async findByExternalId(externalId: string): Promise<Payment | null> {
    return this.payments.find((p) => p.asaasPaymentId === externalId) || null
  }

  async update(payment: Payment): Promise<Payment> {
    const index = this.payments.findIndex((p) => p.id === payment.id)
    if (index === -1) {
      throw new Error('Payment not found')
    }
    this.payments[index] = payment
    return payment
  }

  async delete(id: string): Promise<void> {
    const index = this.payments.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error('Payment not found')
    }
    this.payments.splice(index, 1)
  }

  async list(): Promise<Payment[]> {
    return this.payments
  }

  // Helper method for tests
  clear(): void {
    this.payments = []
  }
}
