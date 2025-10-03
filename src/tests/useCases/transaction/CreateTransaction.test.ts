import { beforeEach,describe, expect, it } from 'vitest'

import type { Transaction } from '../../../core/entities/Transaction'
import type { ITransactionRepository } from '../../../core/repositories/ITransactionRepository'
import { CreateTransaction } from '../../../core/useCases/transaction/CreateTransaction'

class InMemoryTransactionRepository implements ITransactionRepository {
  public transactions: Transaction[] = []

  async save(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction)
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.find((t) => t.id === id) || null
  }

  async findByInvoiceId(invoiceId: string): Promise<Transaction[]> {
    return this.transactions.filter((t) => t.invoiceId === invoiceId)
  }

  async findByTenantId(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Transaction[]> {
    let filtered = this.transactions.filter((t) => t.tenantId === tenantId)

    if (startDate) {
      filtered = filtered.filter((t) => t.createdAt >= startDate)
    }

    if (endDate) {
      filtered = filtered.filter((t) => t.createdAt <= endDate)
    }

    return filtered
  }
}

describe('CreateTransaction', () => {
  let transactionRepository: InMemoryTransactionRepository
  let createTransaction: CreateTransaction

  beforeEach(() => {
    transactionRepository = new InMemoryTransactionRepository()
    createTransaction = new CreateTransaction(transactionRepository)
  })

  it('deve criar uma transação de taxa de plataforma', async () => {
    const transaction = await createTransaction.execute({
      tenantId: 'tenant-123',
      invoiceId: 'invoice-123',
      type: 'PLATFORM_FEE',
      amount: 1.5,
      percentage: 1.5,
      baseAmount: 100,
    })

    expect(transaction.id).toBeDefined()
    expect(transaction.type).toBe('PLATFORM_FEE')
    expect(transaction.amount).toBe(1.5)
    expect(transaction.status).toBe('PENDING')
    expect(transactionRepository.transactions).toHaveLength(1)
  })

  it('deve criar uma transação de reembolso', async () => {
    const transaction = await createTransaction.execute({
      tenantId: 'tenant-123',
      invoiceId: 'invoice-123',
      type: 'REFUND',
      amount: 50,
      percentage: 0,
      baseAmount: 100,
    })

    expect(transaction.type).toBe('REFUND')
    expect(transaction.amount).toBe(50)
  })

  it('deve criar uma transação de ajuste', async () => {
    const transaction = await createTransaction.execute({
      tenantId: 'tenant-123',
      invoiceId: 'invoice-123',
      type: 'ADJUSTMENT',
      amount: 10,
      percentage: 0,
      baseAmount: 100,
    })

    expect(transaction.type).toBe('ADJUSTMENT')
    expect(transaction.amount).toBe(10)
  })

  it('deve lançar erro se valor for zero ou negativo', async () => {
    await expect(
      createTransaction.execute({
        tenantId: 'tenant-123',
        invoiceId: 'invoice-123',
        type: 'PLATFORM_FEE',
        amount: 0,
        percentage: 1.5,
        baseAmount: 100,
      }),
    ).rejects.toThrow('Valor deve ser maior que zero')
  })
})
