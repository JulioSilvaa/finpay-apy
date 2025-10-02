export interface IPayment {
  id?: string
  invoiceId: string
  tenantId: string
  customerId: string
  amount: number
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
  paymentDate?: Date
  confirmedAt?: Date
  asaasPaymentId?: string
  createdAt?: Date
  updatedAt?: Date
}
