export interface ISubscription {
  id?: string
  tenantId: string
  customerId: string
  planName: string
  amount: number
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED'
  startDate: Date
  nextBillingDate: Date
  cancelledAt?: Date
  createdAt?: Date
  updatedAt?: Date
}
