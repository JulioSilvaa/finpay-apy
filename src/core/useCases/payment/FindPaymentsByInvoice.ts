import type { Payment } from '../../entities/Payment'
import type { IPaymentRepository } from '../../repositories/IPaymentRepository'

interface FindPaymentsByInvoiceInput {
  invoiceId: string
}

export class FindPaymentsByInvoice {
  constructor(private paymentRepository: IPaymentRepository) {}

  async execute(input: FindPaymentsByInvoiceInput): Promise<Payment[]> {
    return await this.paymentRepository.findByInvoiceId(input.invoiceId)
  }
}
