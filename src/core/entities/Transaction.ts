import { DomainError } from '../../shared/errors'
import type { Invoice } from './Invoice'

export type TransactionType = 'PLATFORM_FEE' | 'REFUND' | 'ADJUSTMENT'
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface TransactionProps {
  id: string
  tenantId: string
  invoiceId: string
  type: TransactionType
  amount: number
  percentage: number
  baseAmount: number
  status: TransactionStatus
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class Transaction {
  private constructor(private props: TransactionProps) {}

  static create(data: Omit<TransactionProps, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Transaction {
    if (data.amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero')
    }

    if (!data.tenantId || !data.invoiceId) {
      throw new DomainError('TenantId e InvoiceId são obrigatórios')
    }

    return new Transaction({
      id: crypto.randomUUID(),
      ...data,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  // Factory específico para taxa da plataforma (1.5%)
  static createPlatformFee(tenantId: string, invoiceId: string, invoice: Invoice): Transaction {
    return new Transaction({
      id: crypto.randomUUID(),
      tenantId,
      invoiceId,
      type: 'PLATFORM_FEE',
      amount: invoice.platformFee,
      percentage: 1.5,
      baseAmount: invoice.amount,
      status: 'COMPLETED',
      processedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: TransactionProps): Transaction {
    return new Transaction(props)
  }

  // Métodos de negócio
  complete(processedAt: Date): void {
    if (this.props.status === 'COMPLETED') {
      throw new DomainError('Transação já foi completada')
    }
    if (this.props.status === 'FAILED') {
      throw new DomainError('Transação falhou e não pode ser completada')
    }
    this.props.status = 'COMPLETED'
    this.props.processedAt = processedAt
    this.props.updatedAt = new Date()
  }

  fail(): void {
    if (this.props.status === 'COMPLETED') {
      throw new DomainError('Não é possível marcar como falha uma transação completada')
    }
    this.props.status = 'FAILED'
    this.props.updatedAt = new Date()
  }

  isCompleted(): boolean {
    return this.props.status === 'COMPLETED'
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get invoiceId(): string {
    return this.props.invoiceId
  }

  get type(): TransactionType {
    return this.props.type
  }

  get amount(): number {
    return this.props.amount
  }

  get percentage(): number {
    return this.props.percentage
  }

  get baseAmount(): number {
    return this.props.baseAmount
  }

  get status(): TransactionStatus {
    return this.props.status
  }

  get processedAt(): Date | undefined {
    return this.props.processedAt
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
      invoiceId: this.invoiceId,
      type: this.type,
      amount: this.amount,
      percentage: this.percentage,
      baseAmount: this.baseAmount,
      status: this.status,
      processedAt: this.processedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
