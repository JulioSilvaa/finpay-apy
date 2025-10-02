import { DomainError } from '../../shared/errors'
import type { PaymentMethod } from './Invoice'

export type BillingCycle = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'OVERDUE'

export interface SubscriptionProps {
  id: string
  tenantId: string
  customerId: string
  description?: string
  amount: number
  billingCycle: BillingCycle
  paymentMethod: PaymentMethod
  status: SubscriptionStatus
  startDate: Date
  nextBillingDate: Date
  lastBillingDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

export class Subscription {
  private constructor(private props: SubscriptionProps) {}

  static create(
    data: Omit<SubscriptionProps, 'id' | 'status' | 'nextBillingDate' | 'createdAt' | 'updatedAt'>,
  ): Subscription {
    if (data.amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero')
    }

    if (!data.tenantId || !data.customerId) {
      throw new DomainError('TenantId e CustomerId são obrigatórios')
    }

    // Calcular primeira data de cobrança
    const nextBillingDate = this.calculateNextBillingDate(data.startDate, data.billingCycle)

    return new Subscription({
      id: crypto.randomUUID(),
      ...data,
      status: 'ACTIVE',
      nextBillingDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: SubscriptionProps): Subscription {
    return new Subscription(props)
  }

  // Métodos de negócio
  private static calculateNextBillingDate(currentDate: Date, cycle: BillingCycle): Date {
    const next = new Date(currentDate)

    switch (cycle) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7)
        break
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14)
        break
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1)
        break
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3)
        break
      case 'ANNUAL':
        next.setFullYear(next.getFullYear() + 1)
        break
    }

    return next
  }

  advanceToNextBillingCycle(): void {
    this.props.lastBillingDate = this.props.nextBillingDate
    this.props.nextBillingDate = Subscription.calculateNextBillingDate(this.props.nextBillingDate, this.props.billingCycle)
    this.props.updatedAt = new Date()
  }

  pause(): void {
    if (this.props.status === 'CANCELED') {
      throw new DomainError('Assinatura cancelada não pode ser pausada')
    }
    this.props.status = 'PAUSED'
    this.props.updatedAt = new Date()
  }

  resume(): void {
    if (this.props.status !== 'PAUSED') {
      throw new DomainError('Apenas assinaturas pausadas podem ser retomadas')
    }
    this.props.status = 'ACTIVE'
    this.props.updatedAt = new Date()
  }

  cancel(): void {
    this.props.status = 'CANCELED'
    this.props.endDate = new Date()
    this.props.updatedAt = new Date()
  }

  markAsOverdue(): void {
    if (this.props.status === 'ACTIVE') {
      this.props.status = 'OVERDUE'
      this.props.updatedAt = new Date()
    }
  }

  updateAmount(newAmount: number): void {
    if (newAmount <= 0) {
      throw new DomainError('Valor deve ser maior que zero')
    }
    this.props.amount = newAmount
    this.props.updatedAt = new Date()
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE'
  }

  shouldGenerateInvoice(): boolean {
    return this.props.status === 'ACTIVE' && new Date() >= this.props.nextBillingDate
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

  get description(): string | undefined {
    return this.props.description
  }

  get amount(): number {
    return this.props.amount
  }

  get billingCycle(): BillingCycle {
    return this.props.billingCycle
  }

  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod
  }

  get status(): SubscriptionStatus {
    return this.props.status
  }

  get startDate(): Date {
    return this.props.startDate
  }

  get nextBillingDate(): Date {
    return this.props.nextBillingDate
  }

  get lastBillingDate(): Date | undefined {
    return this.props.lastBillingDate
  }

  get endDate(): Date | undefined {
    return this.props.endDate
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
      description: this.description,
      amount: this.amount,
      billingCycle: this.billingCycle,
      paymentMethod: this.paymentMethod,
      status: this.status,
      startDate: this.startDate,
      nextBillingDate: this.nextBillingDate,
      lastBillingDate: this.lastBillingDate,
      endDate: this.endDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
