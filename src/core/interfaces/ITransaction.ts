export interface ITransaction {
  id?: string
  tenantId: string
  invoiceId: string
  type: 'PLATFORM_FEE' | 'GATEWAY_FEE' | 'TENANT_REVENUE'
  amount: number
  percentage: number
  baseAmount: number
  status: 'PENDING' | 'PROCESSED' | 'CANCELLED'
  processedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}
