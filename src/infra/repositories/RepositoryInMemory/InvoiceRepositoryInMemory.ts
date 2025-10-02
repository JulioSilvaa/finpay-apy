import type { Invoice } from '../../../core/entities/Invoice'
import type { IInvoiceRepository } from '../../../core/repositories'

export class InvoiceRepositoryInMemory implements IInvoiceRepository {
  private invoices: Invoice[] = []

  async create(invoice: Invoice): Promise<Invoice> {
    this.invoices.push(invoice)
    return invoice
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoices.find((i) => i.id === id) || null
  }

  async findByCustomerId(customerId: string): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.customerId === customerId)
  }

  async findByTenantId(tenantId: string): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.tenantId === tenantId)
  }

  async findByStatus(status: string): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.status === status)
  }

  async findOverdue(): Promise<Invoice[]> {
    const now = new Date()
    return this.invoices.filter(
      (i) => i.status === 'PENDING' && i.dueDate < now
    )
  }

  async update(invoice: Invoice): Promise<Invoice> {
    const index = this.invoices.findIndex((i) => i.id === invoice.id)
    if (index === -1) {
      throw new Error('Invoice not found')
    }
    this.invoices[index] = invoice
    return invoice
  }

  async delete(id: string): Promise<void> {
    const index = this.invoices.findIndex((i) => i.id === id)
    if (index === -1) {
      throw new Error('Invoice not found')
    }
    this.invoices.splice(index, 1)
  }

  async list(): Promise<Invoice[]> {
    return this.invoices
  }

  // Helper method for tests
  clear(): void {
    this.invoices = []
  }
}
