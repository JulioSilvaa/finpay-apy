import type { Transaction } from '../../entities/Transaction'
import type { ITransactionRepository } from '../../repositories/ITransactionRepository'

interface FindTransactionsByInvoiceInput {
  invoiceId: string
}

export class FindTransactionsByInvoice {
  constructor(private transactionRepository: ITransactionRepository) {}

  async execute(input: FindTransactionsByInvoiceInput): Promise<Transaction[]> {
    return await this.transactionRepository.findByInvoiceId(input.invoiceId)
  }
}
