export interface ITenant {
  id?: string
  email: string
  name: string
  phone?: string
  document?: string
  businessType?: string
  asaasCustomerId?: string
  asaasWalletId?: string
  feePercentage?: number
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}
