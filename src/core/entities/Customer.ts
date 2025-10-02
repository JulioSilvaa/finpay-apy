import { DomainError } from '../../shared/errors'

export interface Address {
  street: string
  number: string
  city: string
  state: string
  zipCode: string
  complement?: string
}

export interface CustomerProps {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string
  document?: string
  address?: Address
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class Customer {
  private constructor(private props: CustomerProps) {}

  static create(data: Omit<CustomerProps, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Customer {
    // Validações
    if (!data.name || data.name.length < 3) {
      throw new DomainError('Nome deve ter pelo menos 3 caracteres')
    }

    if (!data.email || !data.email.includes('@')) {
      throw new DomainError('Email inválido')
    }

    if (!data.phone || data.phone.length < 10) {
      throw new DomainError('Telefone inválido')
    }

    if (!data.tenantId) {
      throw new DomainError('TenantId é obrigatório')
    }

    return new Customer({
      id: crypto.randomUUID(),
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props)
  }

  // Métodos de negócio
  updateContactInfo(email: string, phone: string): void {
    if (!email.includes('@')) {
      throw new DomainError('Email inválido')
    }
    if (!phone || phone.length < 10) {
      throw new DomainError('Telefone inválido')
    }

    this.props.email = email
    this.props.phone = phone
    this.props.updatedAt = new Date()
  }

  updateAddress(address: Address): void {
    this.props.address = address
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

  get tenantId(): string {
    return this.props.tenantId
  }

  get name(): string {
    return this.props.name
  }

  get email(): string {
    return this.props.email
  }

  get phone(): string {
    return this.props.phone
  }

  get document(): string | undefined {
    return this.props.document
  }

  get address(): Address | undefined {
    return this.props.address
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
      tenantId: this.tenantId,
      name: this.name,
      email: this.email,
      phone: this.phone,
      document: this.document,
      address: this.address,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
