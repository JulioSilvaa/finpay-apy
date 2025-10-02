import type { Transaction } from '../../../core/entities/Transaction'
import type { ITransactionRepository } from '../../../core/repositories'

export class TransactionRepositoryInMemory implements ITransactionRepository {
  private transactions: Transaction[] = []

  async create(transaction: Transaction): Promise<Transaction> {
    this.transactions.push(transaction)
    return transaction
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.find((t) => t.id === id) || null
  }

  async findByInvoiceId(invoiceId: string): Promise<Transaction[]> {
    return this.transactions.filter((t) => t.invoiceId === invoiceId)
  }

  async findByTenantId(tenantId: string): Promise<Transaction[]> {
    return this.transactions.filter((t) => t.tenantId === tenantId)
  }

  async findByType(type: string): Promise<Transaction[]> {
    return this.transactions.filter((t) => t.type === type)
  }

  async findByStatus(status: string): Promise<Transaction[]> {
    return this.transactions.filter((t) => t.status === status)
  }

  async findPendingByTenantId(tenantId: string): Promise<Transaction[]> {
    return this.transactions.filter(
      (t) => t.tenantId === tenantId && t.status === 'PENDING'
    )
  }

  async update(transaction: Transaction): Promise<Transaction> {
    const index = this.transactions.findIndex((t) => t.id === transaction.id)
    if (index === -1) {
      throw new Error('Transaction not found')
    }
    this.transactions[index] = transaction
    return transaction
  }

  async delete(id: string): Promise<void> {
    const index = this.transactions.findIndex((t) => t.id === id)
    if (index === -1) {
      throw new Error('Transaction not found')
    }
    this.transactions.splice(index, 1)
  }

  async list(): Promise<Transaction[]> {
    return this.transactions
  }

  // Helper method for tests
  clear(): void {
    this.transactions = []
  }
}
