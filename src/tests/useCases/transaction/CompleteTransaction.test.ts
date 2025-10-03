import { beforeEach,describe, expect, it } from 'vitest'

import { Transaction } from '../../../core/entities/Transaction'
import type { ITransactionRepository } from '../../../core/repositories/ITransactionRepository'
import { CompleteTransaction } from '../../../core/useCases/transaction/CompleteTransaction'

class InMemoryTransactionRepository implements ITransactionRepository {
  public transactions: Transaction[] = []

  async save(transaction: Transaction): Promise<void> {
    const index = this.transactions.findIndex((t) => t.id === transaction.id)
    if (index >= 0) {
      this.transactions[index] = transaction
    } else {
      this.transactions.push(transaction)
    }
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

describe('CompleteTransaction', () => {
  let transactionRepository: InMemoryTransactionRepository
  let completeTransaction: CompleteTransaction
  let transaction: Transaction

  beforeEach(() => {
    transactionRepository = new InMemoryTransactionRepository()
    completeTransaction = new CompleteTransaction(transactionRepository)

    transaction = Transaction.create({
      tenantId: 'tenant-123',
      invoiceId: 'invoice-123',
      type: 'PLATFORM_FEE',
      amount: 1.5,
      percentage: 1.5,
      baseAmount: 100,
    })

    transactionRepository.transactions.push(transaction)
  })

  it('deve completar uma transação', async () => {
    const completed = await completeTransaction.execute({
      transactionId: transaction.id,
    })

    expect(completed.status).toBe('COMPLETED')
    expect(completed.processedAt).toBeDefined()
    expect(completed.isCompleted()).toBe(true)
  })

  it('deve usar data customizada de processamento', async () => {
    const customDate = new Date('2024-01-15')
    const completed = await completeTransaction.execute({
      transactionId: transaction.id,
      processedAt: customDate,
    })

    expect(completed.processedAt).toEqual(customDate)
  })

  it('deve lançar erro se transação não existir', async () => {
    await expect(
      completeTransaction.execute({
        transactionId: 'invalid-id',
      }),
    ).rejects.toThrow('Transação não encontrada')
  })

  it('deve lançar erro ao tentar completar transação já completada', async () => {
    await completeTransaction.execute({
      transactionId: transaction.id,
    })

    await expect(
      completeTransaction.execute({
        transactionId: transaction.id,
      }),
    ).rejects.toThrow('Transação já foi completada')
  })
})
