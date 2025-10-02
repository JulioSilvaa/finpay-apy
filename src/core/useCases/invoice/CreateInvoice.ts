import { EntityNotFoundError } from '../../../shared/errors'
import { Invoice, type PaymentMethod } from '../../entities/Invoice'
import type { IInvoiceRepository, ITenantRepository } from '../../repositories'

interface CreateInvoiceInput {
  tenantId: string
  customerId: string
  subscriptionId?: string
  amount: number
  description?: string
  dueDate: Date
  paymentMethod: PaymentMethod
}

export class CreateInvoiceUseCase {
  constructor(
    private invoiceRepository: IInvoiceRepository,
    private tenantRepository: ITenantRepository
  ) {}

  async execute(input: CreateInvoiceInput): Promise<Invoice> {
    const tenant = await this.tenantRepository.findById(input.tenantId)

    if (!tenant) {
      throw new EntityNotFoundError('Tenant', input.tenantId)
    }

    const invoice = Invoice.create(
      {
        customerId: input.customerId,
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        description: input.description,
        dueDate: input.dueDate,
      },
      tenant,
      input.paymentMethod
    )

    return await this.invoiceRepository.create(invoice)
  }
}
