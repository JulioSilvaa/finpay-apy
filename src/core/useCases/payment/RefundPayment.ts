import type { Payment } from '../../entities/Payment'
import type { IPaymentRepository } from '../../repositories/IPaymentRepository'

interface RefundPaymentInput {
  paymentId: string
}

export class RefundPayment {
  constructor(private paymentRepository: IPaymentRepository) {}

  async execute(input: RefundPaymentInput): Promise<Payment> {
    const payment = await this.paymentRepository.findById(input.paymentId)
    if (!payment) {
      throw new Error('Pagamento não encontrado')
    }

    payment.refund()
    await this.paymentRepository.save(payment)

    return payment
  }
}
