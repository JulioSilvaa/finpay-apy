import type { Transaction } from '../entities/Transaction'

export interface ITransactionRepository {
  create(transaction: Transaction): Promise<Transaction>
  findById(id: string): Promise<Transaction | null>
  findByInvoiceId(invoiceId: string): Promise<Transaction[]>
  findByTenantId(tenantId: string): Promise<Transaction[]>
  findByType(type: string): Promise<Transaction[]>
  findByStatus(status: string): Promise<Transaction[]>
  findPendingByTenantId(tenantId: string): Promise<Transaction[]>
  update(transaction: Transaction): Promise<Transaction>
  delete(id: string): Promise<void>
  list(): Promise<Transaction[]>
}
