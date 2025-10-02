export interface ICustomer {
  id?: string
  tenantId: string
  name: string
  email: string
  phone: string
  document?: string
  address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zipCode?: string
  }
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}
