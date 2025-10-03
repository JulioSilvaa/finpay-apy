import { Transaction, type TransactionType } from '../../entities/Transaction'
import type { ITransactionRepository } from '../../repositories/ITransactionRepository'

interface CreateTransactionInput {
  tenantId: string
  invoiceId: string
  type: TransactionType
  amount: number
  percentage: number
  baseAmount: number
}

export class CreateTransaction {
  constructor(private transactionRepository: ITransactionRepository) {}

  async execute(input: CreateTransactionInput): Promise<Transaction> {
    const transaction = Transaction.create({
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      type: input.type,
      amount: input.amount,
      percentage: input.percentage,
      baseAmount: input.baseAmount,
    })

    await this.transactionRepository.save(transaction)

    return transaction
  }
}
