import type { Payment } from '../entities/Payment'

export interface IPaymentRepository {
  create(payment: Payment): Promise<Payment>
  findById(id: string): Promise<Payment | null>
  findByInvoiceId(invoiceId: string): Promise<Payment[]>
  findByCustomerId(customerId: string): Promise<Payment[]>
  findByTenantId(tenantId: string): Promise<Payment[]>
  findByStatus(status: string): Promise<Payment[]>
  findByExternalId(externalId: string): Promise<Payment | null>
  update(payment: Payment): Promise<Payment>
  delete(id: string): Promise<void>
  list(): Promise<Payment[]>
}
