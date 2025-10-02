export interface IInvoice {
  id?: string
  tenantId: string
  customerId: string
  subscriptionId?: string
  amount: number
  description?: string
  dueDate: Date
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE'
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  platformFee: number
  asaasFee: number
  tenantReceives: number
  paidAt?: Date
  cancelledAt?: Date
  createdAt?: Date
  updatedAt?: Date
}
