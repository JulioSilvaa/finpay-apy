import { DomainError } from '../../shared/errors'

export interface TenantProps {
  id: string
  email: string
  name: string
  phone?: string
  document?: string
  businessType?: string
  asaasCustomerId?: string
  asaasWalletId?: string
  feePercentage: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class Tenant {
  private constructor(private props: TenantProps) {}

  static create(data: Omit<TenantProps, 'id' | 'feePercentage' | 'isActive' | 'createdAt' | 'updatedAt'>): Tenant {
    // Validações
    if (!data.email || !data.email.includes('@')) {
      throw new DomainError('Email inválido')
    }

    if (!data.name || data.name.length < 3) {
      throw new DomainError('Nome deve ter pelo menos 3 caracteres')
    }

    return new Tenant({
      id: crypto.randomUUID(),
      ...data,
      feePercentage: 1.5, // Taxa padrão da plataforma
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: TenantProps): Tenant {
    return new Tenant(props)
  }

  // Métodos de negócio
  calculatePlatformFee(amount: number): number {
    if (amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero')
    }
    return amount * (this.props.feePercentage / 100)
  }

  linkAsaasAccount(customerId: string, walletId: string): void {
    if (!customerId || !walletId) {
      throw new DomainError('IDs do Asaas são obrigatórios')
    }
    this.props.asaasCustomerId = customerId
    this.props.asaasWalletId = walletId
    this.props.updatedAt = new Date()
  }

  deactivate(): void {
    this.props.isActive = false
    this.props.updatedAt = new Date()
  }

  activate(): void {
    this.props.isActive = true
    this.props.updatedAt = new Date()
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get email(): string {
    return this.props.email
  }

  get name(): string {
    return this.props.name
  }

  get phone(): string | undefined {
    return this.props.phone
  }

  get document(): string | undefined {
    return this.props.document
  }

  get businessType(): string | undefined {
    return this.props.businessType
  }

  get asaasCustomerId(): string | undefined {
    return this.props.asaasCustomerId
  }

  get asaasWalletId(): string | undefined {
    return this.props.asaasWalletId
  }

  get feePercentage(): number {
    return this.props.feePercentage
  }

  get isActive(): boolean {
    return this.props.isActive
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
      email: this.email,
      name: this.name,
      phone: this.phone,
      document: this.document,
      businessType: this.businessType,
      asaasCustomerId: this.asaasCustomerId,
      asaasWalletId: this.asaasWalletId,
      feePercentage: this.feePercentage,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
