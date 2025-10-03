import type { PaymentMethod } from '../../entities/Invoice'
import { Payment } from '../../entities/Payment'
import type { IInvoiceRepository } from '../../repositories/IInvoiceRepository'
import type { IPaymentRepository } from '../../repositories/IPaymentRepository'

interface CreatePaymentInput {
  invoiceId: string
  tenantId: string
  customerId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate?: Date
  asaasPaymentId?: string
}

export class CreatePayment {
  constructor(
    private paymentRepository: IPaymentRepository,
    private invoiceRepository: IInvoiceRepository,
  ) {}

  async execute(input: CreatePaymentInput): Promise<Payment> {
    // Verificar se a invoice existe
    const invoice = await this.invoiceRepository.findById(input.invoiceId)
    if (!invoice) {
      throw new Error('Invoice não encontrada')
    }

    // Criar o pagamento
    const payment = Payment.create({
      invoiceId: input.invoiceId,
      tenantId: input.tenantId,
      customerId: input.customerId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: input.paymentDate,
      asaasPaymentId: input.asaasPaymentId,
    })

    // Salvar
    await this.paymentRepository.save(payment)

    return payment
  }
}
