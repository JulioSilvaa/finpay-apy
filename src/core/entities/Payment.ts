
import type { PaymentMethod } from './Invoice'

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'

export interface PaymentProps {
  id: string
  invoiceId: string
  tenantId: string
  customerId: string
  amount: number
  paymentMethod: PaymentMethod
  status: PaymentStatus
  paymentDate?: Date
  confirmedAt?: Date
  asaasPaymentId?: string
  createdAt: Date
  updatedAt: Date
}

export class Payment {
  private constructor(private props: PaymentProps) {}

  static create(data: Omit<PaymentProps, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Payment {
    if (data.amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero')
    }

    if (!data.invoiceId || !data.tenantId || !data.customerId) {
      throw new DomainError('InvoiceId, TenantId e CustomerId são obrigatórios')
    }

    return new Payment({
      id: crypto.randomUUID(),
      ...data,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props)
  }

  // Métodos de negócio
  confirm(confirmedAt: Date): void {
    if (this.props.status === 'CONFIRMED') {
      throw new DomainError('Pagamento já foi confirmado')
    }
    if (this.props.status === 'FAILED') {
      throw new DomainError('Pagamento falhou e não pode ser confirmado')
    }
    this.props.status = 'CONFIRMED'
    this.props.confirmedAt = confirmedAt
    this.props.updatedAt = new Date()
  }

  fail(): void {
    if (this.props.status === 'CONFIRMED') {
      throw new DomainError('Não é possível marcar como falho um pagamento confirmado')
    }
    this.props.status = 'FAILED'
    this.props.updatedAt = new Date()
  }

  refund(): void {
    if (this.props.status !== 'CONFIRMED') {
      throw new DomainError('Apenas pagamentos confirmados podem ser estornados')
    }
    this.props.status = 'REFUNDED'
    this.props.updatedAt = new Date()
  }

  linkAsaasPayment(asaasPaymentId: string): void {
    this.props.asaasPaymentId = asaasPaymentId
    this.props.updatedAt = new Date()
  }

  isConfirmed(): boolean {
    return this.props.status === 'CONFIRMED'
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get invoiceId(): string {
    return this.props.invoiceId
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get customerId(): string {
    return this.props.customerId
  }

  get amount(): number {
    return this.props.amount
  }

  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod
  }

  get status(): PaymentStatus {
    return this.props.status
  }

  get paymentDate(): Date | undefined {
    return this.props.paymentDate
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt
  }

  get asaasPaymentId(): string | undefined {
    return this.props.asaasPaymentId
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
      invoiceId: this.invoiceId,
      tenantId: this.tenantId,
      customerId: this.customerId,
      amount: this.amount,
      paymentMethod: this.paymentMethod,
      status: this.status,
      paymentDate: this.paymentDate,
      confirmedAt: this.confirmedAt,
      asaasPaymentId: this.asaasPaymentId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
