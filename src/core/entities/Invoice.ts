import { env } from '../../config'
import { DomainError } from '../../shared/errors'
import type { Tenant } from './Tenant'

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED'
export type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export interface InvoiceProps {
  id: string
  tenantId: string
  customerId: string
  subscriptionId?: string
  invoiceNumber: string
  amount: number
  platformFee: number
  asaasFee: number
  tenantReceives: number
  dueDate: Date
  status: InvoiceStatus
  paymentLink?: string
  pixQrCode?: string
  pixCopyPaste?: string
  asaasChargeId?: string
  paidDate?: Date
  createdAt: Date
  updatedAt: Date
}

export class Invoice {
  private constructor(private props: InvoiceProps) {}

  static create(
    data: Omit<InvoiceProps, 'id' | 'platformFee' | 'asaasFee' | 'tenantReceives' | 'status' | 'createdAt' | 'updatedAt'>,
    tenant: Tenant,
    paymentMethod: PaymentMethod,
  ): Invoice {
    // Validações
    if (data.amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero')
    }

    if (data.dueDate < new Date()) {
      throw new DomainError('Data de vencimento deve ser futura')
    }

    // Cálculo de taxas (REGRA DE NEGÓCIO CRÍTICA)
    const platformFee = tenant.calculatePlatformFee(data.amount)

    let asaasFee = 0
    switch (paymentMethod) {
      case 'PIX':
        asaasFee = env.fees.asaas.pix
        break
      case 'BOLETO':
        asaasFee = env.fees.asaas.boleto
        break
      case 'CREDIT_CARD':
        asaasFee = data.amount * (env.fees.asaas.creditCard / 100)
        break
    }

    const tenantReceives = data.amount - platformFee - asaasFee

    return new Invoice({
      id: crypto.randomUUID(),
      ...data,
      platformFee: Number(platformFee.toFixed(2)),
      asaasFee: Number(asaasFee.toFixed(2)),
      tenantReceives: Number(tenantReceives.toFixed(2)),
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: InvoiceProps): Invoice {
    return new Invoice(props)
  }

  // Métodos de negócio
  markAsPaid(paidDate: Date): void {
    if (this.props.status === 'PAID') {
      throw new DomainError('Fatura já foi paga')
    }
    if (this.props.status === 'CANCELED') {
      throw new DomainError('Fatura cancelada não pode ser paga')
    }
    this.props.status = 'PAID'
    this.props.paidDate = paidDate
    this.props.updatedAt = new Date()
  }

  markAsOverdue(): void {
    if (this.props.status !== 'PENDING') {
      return // Só marca como vencido se estiver pendente
    }
    this.props.status = 'OVERDUE'
    this.props.updatedAt = new Date()
  }

  cancel(): void {
    if (this.props.status === 'PAID') {
      throw new DomainError('Não é possível cancelar fatura paga')
    }
    this.props.status = 'CANCELED'
    this.props.updatedAt = new Date()
  }

  linkAsaasCharge(chargeId: string, paymentLink: string, pixQrCode?: string, pixCopyPaste?: string): void {
    this.props.asaasChargeId = chargeId
    this.props.paymentLink = paymentLink
    this.props.pixQrCode = pixQrCode
    this.props.pixCopyPaste = pixCopyPaste
    this.props.updatedAt = new Date()
  }

  isOverdue(): boolean {
    return this.props.status === 'PENDING' && new Date() > this.props.dueDate
  }

  isPaid(): boolean {
    return this.props.status === 'PAID'
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get customerId(): string {
    return this.props.customerId
  }

  get subscriptionId(): string | undefined {
    return this.props.subscriptionId
  }

  get invoiceNumber(): string {
    return this.props.invoiceNumber
  }

  get amount(): number {
    return this.props.amount
  }

  get platformFee(): number {
    return this.props.platformFee
  }

  get asaasFee(): number {
    return this.props.asaasFee
  }

  get tenantReceives(): number {
    return this.props.tenantReceives
  }

  get dueDate(): Date {
    return this.props.dueDate
  }

  get status(): InvoiceStatus {
    return this.props.status
  }

  get paymentLink(): string | undefined {
    return this.props.paymentLink
  }

  get pixQrCode(): string | undefined {
    return this.props.pixQrCode
  }

  get pixCopyPaste(): string | undefined {
    return this.props.pixCopyPaste
  }

  get asaasChargeId(): string | undefined {
    return this.props.asaasChargeId
  }

  get paidDate(): Date | undefined {
    return this.props.paidDate
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      customerId: this.customerId,
      subscriptionId: this.subscriptionId,
      invoiceNumber: this.invoiceNumber,
      amount: this.amount,
      platformFee: this.platformFee,
      asaasFee: this.asaasFee,
      tenantReceives: this.tenantReceives,
      dueDate: this.dueDate,
      status: this.status,
      paymentLink: this.paymentLink,
      pixQrCode: this.pixQrCode,
      pixCopyPaste: this.pixCopyPaste,
      asaasChargeId: this.asaasChargeId,
      paidDate: this.paidDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
