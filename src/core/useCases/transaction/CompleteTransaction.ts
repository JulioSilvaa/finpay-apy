import type { Transaction } from '../../entities/Transaction'
import type { ITransactionRepository } from '../../repositories/ITransactionRepository'

interface CompleteTransactionInput {
  transactionId: string
  processedAt?: Date
}

export class CompleteTransaction {
  constructor(private transactionRepository: ITransactionRepository) {}

  async execute(input: CompleteTransactionInput): Promise<Transaction> {
    const transaction = await this.transactionRepository.findById(input.transactionId)
    if (!transaction) {
      throw new Error('Transação não encontrada')
    }

    transaction.complete(input.processedAt || new Date())
    await this.transactionRepository.save(transaction)

    return transaction
  }
}
