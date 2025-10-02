import type { Invoice } from '../entities/Invoice'

export interface IInvoiceRepository {
  create(invoice: Invoice): Promise<Invoice>
  findById(id: string): Promise<Invoice | null>
  findByCustomerId(customerId: string): Promise<Invoice[]>
  findByTenantId(tenantId: string): Promise<Invoice[]>
  findByStatus(status: string): Promise<Invoice[]>
  findOverdue(): Promise<Invoice[]>
  update(invoice: Invoice): Promise<Invoice>
  delete(id: string): Promise<void>
  list(): Promise<Invoice[]>
}
