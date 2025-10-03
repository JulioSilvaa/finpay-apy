import type { Payment } from '../../entities/Payment'
import type { IInvoiceRepository } from '../../repositories/IInvoiceRepository'
import type { IPaymentRepository } from '../../repositories/IPaymentRepository'

interface ConfirmPaymentInput {
  paymentId: string
  confirmedAt?: Date
}

export class ConfirmPayment {
  constructor(
    private paymentRepository: IPaymentRepository,
    private invoiceRepository: IInvoiceRepository,
  ) {}

  async execute(input: ConfirmPaymentInput): Promise<Payment> {
    const payment = await this.paymentRepository.findById(input.paymentId)
    if (!payment) {
      throw new Error('Pagamento não encontrado')
    }

    // Confirmar o pagamento
    payment.confirm(input.confirmedAt || new Date())
    await this.paymentRepository.save(payment)

    // Marcar a invoice como paga
    const invoice = await this.invoiceRepository.findById(payment.invoiceId)
    if (invoice) {
      invoice.markAsPaid(input.confirmedAt || new Date())
      await this.invoiceRepository.save(invoice)
    }

    return payment
  }
}
