import type { Transaction } from '../../entities/Transaction'
import type { ITransactionRepository } from '../../repositories/ITransactionRepository'

interface FindTransactionsByTenantInput {
  tenantId: string
  startDate?: Date
  endDate?: Date
}

export class FindTransactionsByTenant {
  constructor(private transactionRepository: ITransactionRepository) {}

  async execute(input: FindTransactionsByTenantInput): Promise<Transaction[]> {
    return await this.transactionRepository.findByTenantId(
      input.tenantId,
      input.startDate,
      input.endDate,
    )
  }
}
