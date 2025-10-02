describe('CreateInvoiceUseCase', () => {
  let useCase: CreateInvoiceUseCase;
  let invoiceRepository: InMemoryInvoiceRepository;
  let tenantRepository: InMemoryTenantRepository;
  let customerRepository: InMemoryCustomerRepository;
  let asaasService: MockAsaasService;
  let emailService: MockEmailService;

  beforeEach(() => {
    invoiceRepository = new InMemoryInvoiceRepository();
    tenantRepository = new InMemoryTenantRepository();
    customerRepository = new InMemoryCustomerRepository();
    asaasService = new MockAsaasService();
    emailService = new MockEmailService();

    useCase = new CreateInvoiceUseCase(
      invoiceRepository,
      tenantRepository,
      customerRepository,
      asaasService,
      emailService
    );

    // Setup inicial
    const tenant = Tenant.create({
      email: 'tenant@example.com',
      name: 'Test Tenant',
      asaasCustomerId: 'cus_123'
    });
    tenantRepository.items.push(tenant);

    const customer = Customer.create({
      tenantId: tenant.id,
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '11999999999'
    });
    customerRepository.items.push(customer);
  });

  it('should create invoice successfully', async () => {
    const tenant = tenantRepository.items[0];
    const customer = customerRepository.items[0];

    const invoice = await useCase.execute({
      tenantId: tenant.id,
      customerId: customer.id,
      amount: 100,
      dueDate: new Date('2025-12-31'),
      paymentMethod: 'PIX'
    });

    expect(invoice.id).toBeDefined();
    expect(invoice.amount).toBe(100);
    expect(invoice.platformFee).toBe(1.5);
    expect(invoice.tenantReceives).toBe(98.5);
    expect(invoiceRepository.items).toHaveLength(1);
    expect(asaasService.createChargeCalled).toBe(true);
    expect(emailService.sendInvoiceCreatedCalled).toBe(true);
  });

  it('should throw error if tenant not found', async () => {
    await expect(
      useCase.execute({
        tenantId: 'invalid-id',
        customerId: 'customer-123',
        amount: 100,
        dueDate: new Date('2025-12-31'),
        paymentMethod: 'PIX'
      })
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('should throw error if customer not found', async () => {
    const tenant = tenantRepository.items[0];

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        customerId: 'invalid-id',
        amount: 100,
        dueDate: new Date('2025-12-31'),
        paymentMethod: 'PIX'
      })
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('should calculate correct invoice number', async () => {
    const tenant = tenantRepository.items[0];
    const customer = customerRepository.items[0];

    const invoice1 = await useCase.execute({
      tenantId: tenant.id,
      customerId: customer.id,
      amount: 100,
      dueDate: new Date('2025-12-31'),
      paymentMethod: 'PIX'
    });

    const invoice2 = await useCase.execute({
      tenantId: tenant.id,
      customerId: customer.id,
      amount: 150,
      dueDate: new Date('2025-12-31'),
      paymentMethod: 'PIX'
    });

    expect(invoice1.invoiceNumber).toBe('INV-2025-0001');
    expect(invoice2.invoiceNumber).toBe('INV-2025-0002');
  });
});
```

---

### 10.3 Mocks para Testes

```typescript
// tests/mocks/InMemoryInvoiceRepository.ts

import { Invoice } from '../../src/domain/entities/Invoice';
import { IInvoiceRepository } from '../../src/domain/repositories/IInvoiceRepository';

export class InMemoryInvoiceRepository implements IInvoiceRepository {
  public items: Invoice[] = [];

  async findById(id: string): Promise<Invoice | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async findByAsaasChargeId(chargeId: string): Promise<Invoice | null> {
    return this.items.find(item => item.asaasChargeId === chargeId) || null;
  }

  async save(invoice: Invoice): Promise<void> {
    this.items.push(invoice);
  }

  async update(invoice: Invoice): Promise<void> {
    const index = this.items.findIndex(item => item.id === invoice.id);
    if (index >= 0) {
      this.items[index] = invoice;
    }
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.items.filter(item => item.tenantId === tenantId).length;
  }

  async findAllByTenant(tenantId: string, filters: any): Promise<any> {
    const filtered = this.items.filter(item => item.tenantId === tenantId);
    return { invoices: filtered, total: filtered.length };
  }
}

// tests/mocks/MockAsaasService.ts

import { IAsaasService, CreateChargeDTO, AsaasChargeResponse } from '../../src/application/services/IAsaasService';

export class MockAsaasService implements IAsaasService {
  public createChargeCalled = false;

  async createCharge(data: CreateChargeDTO): Promise<AsaasChargeResponse> {
    this.createChargeCalled = true;
    return {
      id: 'pay_mock_123',
      invoiceUrl: 'https://pay.asaas.com/mock',
      pixQrCode: 'mock_qr_code',
      pixCopyPaste: 'mock_pix_copy_paste'
    };
  }

  async createCustomer(data: any): Promise<{ id: string; walletId: string }> {
    return {
      id: 'cus_mock_123',
      walletId: 'wallet_mock_123'
    };
  }
}
```

---

## 11. Checklist de Implementação MVP

### Prioridade ALTA (Semana 1-2)

**Domain Layer**
- [ ] Tenant.ts
- [ ] Customer.ts
- [ ] Invoice.ts
- [ ] DomainError.ts
- [ ] ITenantRepository.ts
- [ ] ICustomerRepository.ts
- [ ] IInvoiceRepository.ts

**Application Layer**
- [ ] CreateCustomerUseCase.ts
- [ ] CreateInvoiceUseCase.ts
- [ ] IAsaasService.ts (interface)

**Infrastructure**
- [ ] PrismaCustomerRepository.ts
- [ ] PrismaInvoiceRepository.ts
- [ ] PrismaTenantRepository.ts
- [ ] AsaasService.ts (implementação)
- [ ] Schema Prisma atualizado

**HTTP**
- [ ] CustomerController.ts
- [ ] InvoiceController.ts
- [ ] Routes básicas
- [ ] Auth middleware

---

### Prioridade MÉDIA (Semana 3)

**Domain Layer**
- [ ] Payment.ts
- [ ] Transaction.ts
- [ ] IPaymentRepository.ts
- [ ] ITransactionRepository.ts

**Application Layer**
- [ ] ProcessPaymentWebhookUseCase.ts
- [ ] IEmailService.ts (interface)

**Infrastructure**
- [ ] PrismaPaymentRepository.ts
- [ ] PrismaTransactionRepository.ts
- [ ] EmailService.ts (implementação)
- [ ] WebhookController.ts

---

### Prioridade BAIXA (Semana 4+)

**Domain Layer**
- [ ] Subscription.ts
- [ ] ISubscriptionRepository.ts

**Application Layer**
- [ ] CreateSubscriptionUseCase.ts
- [ ] GenerateInvoicesFromSubscriptionsUseCase.ts

**Infrastructure**
- [ ] PrismaSubscriptionRepository.ts
- [ ] Cron jobs
- [ ] Dashboard endpoints

---

## 12. Comandos Úteis

```bash
# Inicializar projeto
npm init -y
npm install express prisma @prisma/client
npm install -D typescript @types/express @types/node ts-node-dev

# Configurar Prisma
npx prisma init
npx prisma migrate dev --name init
npx prisma generate

# Rodar desenvolvimento
npm run dev

# Testes
npm install -D jest @types/jest ts-jest
npm test

# Build
npm run build
npm start
```

---

## 13. Exemplo de main.ts

```typescript
// src/main.ts

import express from 'express';
import { Container } from './infrastructure/di/container';
import { createInvoiceRoutes } from './infrastructure/http/routes/invoice.routes';
import { createCustomerRoutes } from './infrastructure/http/routes/customer.routes';
import { createWebhookRoutes } from './infrastructure/http/routes/webhook.routes';
import { errorHandler } from './infrastructure/http/middlewares/errorHandler';

const app = express();
const container = Container.getInstance();

// Middlewares globais
app.use(express.json());

// Routes
app.use('/api/v1/customers', createCustomerRoutes(container.getCustomerController()));
app.use('/api/v1/invoices', createInvoiceRoutes(container.getInvoiceController()));
app.use('/api/v1/webhooks', createWebhookRoutes(container.getWebhookController()));

// Error handler (sempre por último)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/v1/docs`);
});
```

---

## 14. Benefícios da Clean Architecture no MVP

### Testabilidade
- Entidades isoladas e testáveis unitariamente
- Use cases testáveis com mocks
- 80%+ de cobertura de testes possível

### Manutenibilidade
- Código organizado e fácil de navegar
- Regras de negócio centralizadas
- Fácil adicionar novas features

### Flexibilidade
- Trocar Prisma por TypeORM: só mudar repositories
- Trocar Asaas por Stripe: só mudar service
- Trocar Express por Fastify: só mudar presentation layer

### Escalabilidade
- Preparado para crescer
- Fácil adicionar microserviços depois
- Domain fica intacto ao escalar

---

## 15. Resumo Executivo

**Para o MVP, você precisa de:**

1. **6 Entidades**: Tenant, Customer, Invoice, Subscription, Payment, Transaction
2. **6 Repositórios**: Interfaces + Implementações Prisma
3. **4 Use Cases essenciais**: CreateCustomer, CreateInvoice, ProcessPaymentWebhook, GenerateInvoicesFromSubscriptions
4. **2 Serviços Externos**: AsaasService, EmailService
5. **3 Controllers**: Customer, Invoice, Webhook

**Tempo estimado**: 3-4 semanas para um desenvolvedor experiente

**Ordem de implementação**:
1. Domain entities (Semana 1)
2. Repositories + Use Cases (Semana 2)
3. HTTP + Webhooks (Semana 3)
4. Subscriptions + Cron (Semana 4)

**Próximo passo**: Começar implementando `Tenant.ts`, `Customer.ts` e `Invoice.ts` com seus testes unitários.

---

**Versão**: 1.0  
**Data**: Outubro 2025  
**Arquitetura**: Clean Architecture + DDD  
**Stack**: Node.js + TypeScript + Prisma + PostgreSQL    // 2. Buscar customer
    const customer = await this.customerRepository.findById(dto.customerId);
    if (!customer) {
      throw new EntityNotFoundError('Customer', dto.customerId);
    }

    // 3. Gerar número da fatura
    const invoiceCount = await this.invoiceRepository.countByTenant(dto.tenantId);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

    // 4. Criar entidade Invoice (cálculo de fees acontece aqui)
    const invoice = Invoice.create(
      {
        tenantId: dto.tenantId,
        customerId: dto.customerId,
        subscriptionId: dto.subscriptionId,
        invoiceNumber,
        amount: dto.amount,
        dueDate: dto.dueDate
      },
      tenant,
      dto.paymentMethod
    );

    // 5. Criar cobrança no Asaas com split de 1.5%
    const asaasCharge = await this.asaasService.createCharge({
      customer: tenant.asaasCustomerId!,
      billingType: dto.paymentMethod,
      value: dto.amount,
      dueDate: dto.dueDate,
      description: dto.description,
      externalReference: invoice.id,
      split: [{
        walletId: process.env.ASAAS_WALLET_ID!,
        fixedValue: invoice.platformFee
      }]
    });

    // 6. Vincular dados do Asaas à invoice
    invoice.linkAsaasCharge(
      asaasCharge.id,
      asaasCharge.invoiceUrl,
      asaasCharge.pixQrCode,
      asaasCharge.pixCopyPaste
    );

    // 7. Persistir
    await this.invoiceRepository.save(invoice);

    // 8. Enviar notificação por email
    await this.emailService.sendInvoiceCreated({
      to: customer.email,
      customerName: customer.name,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      paymentLink: invoice.paymentLink!
    });

    return invoice;
  }
}
```

---

### 5.3 ProcessPaymentWebhookUseCase

```typescript
// src/application/use-cases/ProcessPaymentWebhookUseCase.ts

import { Invoice } from '../../domain/entities/Invoice';
import { Payment } from '../../domain/entities/Payment';
import { Transaction } from '../../domain/entities/Transaction';
import { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { ITransactionRepository } from '../../domain/repositories/ITransactionRepository';
import { IEmailService } from '../services/IEmailService';
import { EntityNotFoundError } from '../../domain/errors/DomainError';

export interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    customer: string;
    billingType: PaymentMethod;
    value: number;
    netValue: number;
    status: string;
    paymentDate: string;
    confirmedDate?: string;
    externalReference?: string;
  };
}

export class ProcessPaymentWebhookUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(payload: AsaasWebhookPayload): Promise<void> {
    // 1. Buscar invoice pelo asaasChargeId
    const invoice = await this.invoiceRepository.findByAsaasChargeId(
      payload.payment.id
    );

    if (!invoice) {
      throw new EntityNotFoundError('Invoice', payload.payment.id);
    }

    // 2. Verificar se já foi processado
    if (invoice.isPaid()) {
      console.log(`Invoice ${invoice.id} já foi processada`);
      return;
    }

    // 3. Marcar invoice como paga
    invoice.markAsPaid(new Date(payload.payment.paymentDate));
    await this.invoiceRepository.update(invoice);

    // 4. Criar Payment
    const payment = Payment.create({
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      amount: invoice.amount,
      paymentMethod: payload.payment.billingType,
      paymentDate: new Date(payload.payment.paymentDate),
      asaasPaymentId: payload.payment.id
    });
    await this.paymentRepository.save(payment);

    // 5. Registrar Transaction (nossa receita)
    const transaction = Transaction.createPlatformFee(
      invoice.tenantId,
      invoice.id,
      invoice
    );
    await this.transactionRepository.save(transaction);

    // 6. Enviar notificação ao tenant
    await this.emailService.sendPaymentReceived({
      tenantId: invoice.tenantId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      netAmount: invoice.tenantReceives
    });
  }
}
```

---

### 5.4 GenerateInvoicesFromSubscriptionsUseCase

```typescript
// src/application/use-cases/GenerateInvoicesFromSubscriptionsUseCase.ts

export class GenerateInvoicesFromSubscriptionsUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly createInvoiceUseCase: CreateInvoiceUseCase
  ) {}

  async execute(): Promise<{ generated: number; errors: string[] }> {
    const errors: string[] = [];
    let generated = 0;

    // Buscar assinaturas que devem gerar fatura hoje
    const subscriptions = await this.subscriptionRepository.findActiveByTenantDueToday();

    for (const subscription of subscriptions) {
      try {
        // Validar se deve gerar
        if (!subscription.shouldGenerateInvoice()) {
          continue;
        }

        // Criar invoice usando o use case existente
        await this.createInvoiceUseCase.execute({
          tenantId: subscription.tenantId,
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          amount: subscription.amount,
          dueDate: subscription.nextBillingDate,
          paymentMethod: subscription.paymentMethod,
          description: subscription.description
        });

        // Avançar para próximo ciclo
        subscription.advanceToNextBillingCycle();
        await this.subscriptionRepository.update(subscription);

        generated++;
      } catch (error) {
        errors.push(`Subscription ${subscription.id}: ${error.message}`);
      }
    }

    return { generated, errors };
  }
}
```

---

## 6. Infraestrutura

### 6.1 Implementação de Repositório (Prisma)

```typescript
// src/infrastructure/database/repositories/PrismaInvoiceRepository.ts

import { PrismaClient } from '@prisma/client';
import { Invoice } from '../../../domain/entities/Invoice';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Invoice | null> {
    const data = await this.prisma.invoice.findUnique({
      where: { id }
    });

    if (!data) return null;

    return Invoice.reconstitute({
      id: data.id,
      tenantId: data.tenantId,
      customerId: data.customerId,
      subscriptionId: data.subscriptionId || undefined,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount.toNumber(),
      platformFee: data.platformFee.toNumber(),
      asaasFee: data.asaasFee.toNumber(),
      tenantReceives: data.tenantReceives.toNumber(),
      dueDate: data.dueDate,
      status: data.status as any,
      paymentLink: data.paymentLink || undefined,
      pixQrCode: data.pixQrCode || undefined,
      pixCopyPaste: data.pixCopyPaste || undefined,
      asaasChargeId: data.asaasChargeId || undefined,
      paidDate: data.paidDate || undefined,
      createdAt: data.createdAt
    });
  }

  async findByAsaasChargeId(chargeId: string): Promise<Invoice | null> {
    const data = await this.prisma.invoice.findUnique({
      where: { asaasChargeId: chargeId }
    });

    if (!data) return null;

    return this.toDomain(data);
  }

  async save(invoice: Invoice): Promise<void> {
    await this.prisma.invoice.create({
      data: {
        id: invoice.id,
        tenantId: invoice.tenantId,
        customerId: invoice.customerId,
        subscriptionId: invoice.subscriptionId,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        platformFee: invoice.platformFee,
        asaasFee: invoice.asaasFee,
        tenantReceives: invoice.tenantReceives,
        dueDate: invoice.dueDate,
        status: invoice.status,
        paymentLink: invoice.paymentLink,
        pixQrCode: invoice.pixQrCode,
        pixCopyPaste: invoice.pixCopyPaste,
        asaasChargeId: invoice.asaasChargeId,
        createdAt: invoice.createdAt
      }
    });
  }

  async update(invoice: Invoice): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: invoice.status,
        paidDate: invoice.paidDate,
        paymentLink: invoice.paymentLink,
        pixQrCode: invoice.pixQrCode,
        pixCopyPaste: invoice.pixCopyPaste,
        asaasChargeId: invoice.asaasChargeId
      }
    });
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.invoice.count({
      where: { tenantId }
    });
  }

  private toDomain(data: any): Invoice {
    return Invoice.reconstitute({
      id: data.id,
      tenantId: data.tenantId,
      customerId: data.customerId,
      subscriptionId: data.subscriptionId || undefined,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount.toNumber(),
      platformFee: data.platformFee.toNumber(),
      asaasFee: data.asaasFee.toNumber(),
      tenantReceives: data.tenantReceives.toNumber(),
      dueDate: data.dueDate,
      status: data.status as any,
      paymentLink: data.paymentLink || undefined,
      pixQrCode: data.pixQrCode || undefined,
      pixCopyPaste: data.pixCopyPaste || undefined,
      asaasChargeId: data.asaasChargeId || undefined,
      paidDate: data.paidDate || undefined,
      createdAt: data.createdAt
    });
  }
}
```

---

### 6.2 Serviço Externo (Asaas)

```typescript
// src/application/services/IAsaasService.ts (Interface)

export interface CreateChargeDTO {
  customer: string;
  billingType: PaymentMethod;
  value: number;
  dueDate: Date;
  description?: string;
  externalReference?: string;
  split: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
}

export interface AsaasChargeResponse {
  id: string;
  invoiceUrl: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
}

export interface IAsaasService {
  createCharge(data: CreateChargeDTO): Promise<AsaasChargeResponse>;
  createCustomer(data: CreateCustomerDTO): Promise<{ id: string; walletId: string }>;
}

// src/infrastructure/external-services/AsaasService.ts (Implementação)

import axios, { AxiosInstance } from 'axios';

export class AsaasService implements IAsaasService {
  private readonly client: AxiosInstance;

  constructor(apiKey: string, baseURL: string = 'https://api.asaas.com/v3') {
    this.client = axios.create({
      baseURL,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async createCharge(data: CreateChargeDTO): Promise<AsaasChargeResponse> {
    const response = await this.client.post('/payments', {
      customer: data.customer,
      billingType: data.billingType,
      value: data.value,
      dueDate: data.dueDate.toISOString().split('T')[0],
      description: data.description,
      externalReference: data.externalReference,
      split: data.split
    });

    return {
      id: response.data.id,
      invoiceUrl: response.data.invoiceUrl,
      pixQrCode: response.data.pixQrCode,
      pixCopyPaste: response.data.pixCopyAndPaste
    };
  }

  async createCustomer(data: any): Promise<{ id: string; walletId: string }> {
    const response = await this.client.post('/customers', data);
    return {
      id: response.data.id,
      walletId: response.data.walletId
    };
  }
}
```

---

## 7. Apresentação

### 7.1 Controller

```typescript
// src/infrastructure/http/controllers/InvoiceController.ts

import { Request, Response } from 'express';
import { CreateInvoiceUseCase } from '../../../application/use-cases/CreateInvoiceUseCase';
import { DomainError } from '../../../domain/errors/DomainError';

export class InvoiceController {
  constructor(
    private readonly createInvoiceUseCase: CreateInvoiceUseCase
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const { customerId, amount, dueDate, paymentMethod, description } = req.body;
      const tenantId = req.user.tenantId; // Vem do middleware de auth

      const invoice = await this.createInvoiceUseCase.execute({
        tenantId,
        customerId,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        paymentMethod,
        description
      });

      return res.status(201).json({
        success: true,
        data: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          platformFee: invoice.platformFee,
          asaasFee: invoice.asaasFee,
          tenantReceives: invoice.tenantReceives,
          dueDate: invoice.dueDate,
          status: invoice.status,
          paymentLink: invoice.paymentLink,
          pixQrCode: invoice.pixQrCode,
          pixCopyPaste: invoice.pixCopyPaste
        },
        message: 'Fatura criada com sucesso'
      });
    } catch (error) {
      if (error instanceof DomainError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DOMAIN_ERROR',
            message: error.message
          }
        });
      }

      console.error('Error creating invoice:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao criar fatura'
        }
      });
    }
  }
}
```

---

### 7.2 Routes

```typescript
// src/infrastructure/http/routes/invoice.routes.ts

import { Router } from 'express';
import { InvoiceController } from '../controllers/InvoiceController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createInvoiceSchema } from '../validators/invoiceSchemas';

export function createInvoiceRoutes(invoiceController: InvoiceController): Router {
  const router = Router();

  router.post(
    '/',
    authMiddleware,
    validateRequest(createInvoiceSchema),
    (req, res) => invoiceController.create(req, res)
  );

  // Outras rotas...

  return router;
}
```

---

### 7.3 Dependency Injection (Manual)

```typescript
// src/infrastructure/di/container.ts

import { PrismaClient } from '@prisma/client';
import { PrismaInvoiceRepository } from '../database/repositories/PrismaInvoiceRepository';
import { PrismaTenantRepository } from '../database/repositories/PrismaTenantRepository';
import { PrismaCustomerRepository } from '../database/repositories/PrismaCustomerRepository';
import { AsaasService } from '../external-services/AsaasService';
import { EmailService } from '../external-services/EmailService';
import { CreateInvoiceUseCase } from '../../application/use-cases/CreateInvoiceUseCase';
import { InvoiceController } from '../http/controllers/InvoiceController';

export class Container {
  private static instance: Container;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  // Repositories
  getInvoiceRepository() {
    return new PrismaInvoiceRepository(this.prisma);
  }

  getTenantRepository() {
    return new PrismaTenantRepository(this.prisma);
  }

  getCustomerRepository() {
    return new PrismaCustomerRepository(this.prisma);
  }

  // Services
  getAsaasService() {
    return new AsaasService(process.env.ASAAS_API_KEY!);
  }

  getEmailService() {
    return new EmailService(process.env.MAILERSEND_API_KEY!);
  }

  // Use Cases
  getCreateInvoiceUseCase() {
    return new CreateInvoiceUseCase(
      this.getInvoiceRepository(),
      this.getTenantRepository(),
      this.getCustomerRepository(),
      this.getAsaasService(),
      this.getEmailService()
    );
  }

  // Controllers
  getInvoiceController() {
    return new InvoiceController(
      this.getCreateInvoiceUseCase()
    );
  }
}
```

---

## 8. Estrutura de Pastas Completa

```
src/
├── domain/                           # Camada de Domínio (Core)
│   ├── entities/
│   │   ├── Tenant.ts                ✅ Entidade principal
│   │   ├── Customer.ts              ✅ Entidade principal
│   │   ├── Invoice.ts               ✅ Entidade principal
│   │   ├── Subscription.ts          ✅ Entidade principal
│   │   ├── Payment.ts               ✅ Entidade principal
│   │   └── Transaction.ts           ✅ Entidade principal
│   │
│   ├── value-objects/               (Opcional para MVP)
│   │   ├── Email.ts
│   │   ├── Money.ts
│   │   └── CPF.ts
│   │
│   ├── repositories/                # Interfaces (contratos)
│   │   ├── ITenantRepository.ts     ✅
│   │   ├── ICustomerRepository.ts   ✅
│   │   ├── IInvoiceRepository.ts    ✅
│   │   ├── ISubscriptionRepository.ts ✅
│   │   ├── IPaymentRepository.ts    ✅
│   │   └── ITransactionRepository.ts ✅
│   │
│   └── errors/
│       ├── DomainError.ts           ✅
│       ├── EntityNotFoundError.ts   ✅
│       └── BusinessRuleViolationError.ts ✅
│
├── application/                      # Casos de Uso
│   ├── use-cases/
│   │   ├── CreateCustomerUseCase.ts       ✅ ESSENCIAL
│   │   ├── CreateInvoiceUseCase.ts        ✅ ESSENCIAL
│   │   ├── CreateSubscriptionUseCase.ts   ✅
│   │   ├── ProcessPaymentWebhookUseCase.ts ✅ ESSENCIAL
│   │   └── GenerateInvoicesFromSubscriptionsUseCase.ts ✅
│   │
│   ├── dtos/
│   │   ├── CreateCustomerDTO.ts
│   │   ├── CreateInvoiceDTO.ts
│   │   └── AsaasWebhookPayload.ts
│   │
│   └── services/                     # Interfaces de serviços externos
│       ├── IAsaasService.ts         ✅
│       └── IEmailService.ts         ✅
│
├── infrastructure/                   # Adaptadores e Implementações
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma        ✅
│   │   │   └── client.ts
│   │   │
│   │   └── repositories/            # Implementações concretas
│   │       ├── PrismaTenantRepository.ts       ✅
│   │       ├── PrismaCustomerRepository.ts     ✅
│   │       ├── PrismaInvoiceRepository.ts      ✅
│   │       ├── PrismaSubscriptionRepository.ts ✅
│   │       ├── PrismaPaymentRepository.ts      ✅
│   │       └── PrismaTransactionRepository.ts  ✅
│   │
│   ├── external-services/
│   │   ├── AsaasService.ts          ✅ Implementação
│   │   └── EmailService.ts          ✅ Implementação
│   │
│   ├── http/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── customer.routes.ts
│   │   │   ├── invoice.routes.ts
│   │   │   ├── subscription.routes.ts
│   │   │   └── webhook.routes.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── AuthController.ts
│   │   │   ├── CustomerController.ts
│   │   │   ├── InvoiceController.ts
│   │   │   ├── SubscriptionController.ts
│   │   │   └── WebhookController.ts
│   │   │
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validateRequest.ts
│   │   │
│   │   └── validators/
│   │       ├── customerSchemas.ts
│   │       └── invoiceSchemas.ts
│   │
│   ├── jobs/
│   │   └── cron.ts                  ✅ Jobs automáticos
│   │
│   └── di/
│       └── container.ts             ✅ Dependency Injection
│
├── shared/                          # Utilitários
│   ├── utils/
│   │   ├── generateId.ts
│   │   └── dateHelpers.ts
│   │
│   └── errors/
│       └── AppError.ts
│
└── main.ts                          ✅ Entry point
```

---

## 9. Implementação Passo a Passo

### Semana 1: Domain Layer

**Dia 1-2: Entidades Core**
```bash
✅ Tenant.ts
✅ Customer.ts
✅ Invoice.ts
```

**Dia 3-4: Entidades Complementares**
```bash
✅ Subscription.ts
✅ Payment.ts
✅ Transaction.ts
```

**Dia 5: Repositórios e Erros**
```bash
✅ Interfaces de repositórios
✅ DomainError e derivados
```

---

### Semana 2: Application + Infrastructure

**Dia 1-2: Use Cases Essenciais**
```bash
✅ CreateCustomerUseCase
✅ CreateInvoiceUseCase
```

**Dia 3-4: Repositórios Prisma**
```bash
✅ PrismaCustomerRepository
✅ PrismaInvoiceRepository
✅ PrismaTenantRepository
```

**Dia 5: Asaas Integration**
```bash
✅ IAsaasService (interface)
✅ AsaasService (implementação)
✅ Testar criação de cobrança
```

---

### Semana 3: HTTP + Webhooks

**Dia 1-2: Controllers e Routes**
```bash
✅ CustomerController + routes
✅ InvoiceController + routes
```

**Dia 3-4: Webhook Handler**
```bash
✅ ProcessPaymentWebhookUseCase
✅ WebhookController
✅ Testar com webhook do Asaas
```

**Dia 5: DI Container**
```bash
✅ Container manual
✅ Conectar tudo
✅ Testar fluxo completo
```

---

## 10. Testes Unitários

### 10.1 Teste de Entidade

```typescript
// tests/domain/entities/Invoice.spec.ts

import { Invoice } from '../../../src/domain/entities/Invoice';
import { Tenant } from '../../../src/domain/entities/Tenant';
import { DomainError } from '../../../src/domain/errors/DomainError';

describe('Invoice Entity', () => {
  let tenant: Tenant;

  beforeEach(() => {
    tenant = Tenant.create({
      email: 'test@example.com',
      name: 'Test Tenant',
      feePercentage: 1.5
    });
  });

  it('should create an invoice with correct fees for PIX', () => {
    const invoice = Invoice.create(
      {
        tenantId: tenant.id,
        customerId: 'customer-123',
        invoiceNumber: 'INV-2025-001',
        amount: 100,
        dueDate: new Date('2025-12-31')
      },
      tenant,
      'PIX'
    );

    expect(invoice.amount).toBe(100);
    expect(invoice.platformFee).toBe(1.5); // 1.5% de 100
    expect(invoice.asaasFee).toBe(0); // PIX é grátis
    expect(invoice.tenantReceives).toBe(98.5); // 100 - 1.5 - 0
  });

  it('should create an invoice with correct fees for BOLETO', () => {
    const invoice = Invoice.create(
      {
        tenantId: tenant.id,
        customerId: 'customer-123',
        invoiceNumber: 'INV-2025-001',
        amount: 100,
        dueDate: new Date('2025-12-31')
      },
      tenant,
      'BOLETO'
    );

    expect(invoice.platformFee).toBe(1.5);
    expect(invoice.asaasFee).toBe(3.49);
    expect(invoice.tenantReceives).toBe(95.01); // 100 - 1.5 - 3.49
  });

  it('should throw error for negative amount', () => {
    expect(() => {
      Invoice.create(
        {
          tenantId: tenant.id,
          customerId: 'customer-123',
          invoiceNumber: 'INV-2025-001',
          amount: -100,
          dueDate: new Date('2025-12-31')
        },
        tenant,
        'PIX'
      );
    }).toThrow(DomainError);
  });

  it('should mark invoice as paid', () => {
    const invoice = Invoice.create(
      {
        tenantId: tenant.id,
        customerId: 'customer-123',
        invoiceNumber: 'INV-2025-001',
        amount: 100,
        dueDate: new Date('2025-12-31')
      },
      tenant,
      'PIX'
    );

    const paidDate = new Date();
    invoice.markAsPaid(paidDate);

    expect(invoice.status).toBe('PAID');
    expect(invoice.paidDate).toEqual(paidDate);
  });

  it('should not allow marking paid invoice as paid again', () => {
    const invoice = Invoice.create(
      {
        tenantId: tenant.id,
        customerId: 'customer-123',
        invoiceNumber: 'INV-2025-001',
        amount: 100,
        dueDate: new Date('2025-12-31')
      },
      tenant,
      'PIX'
    );

    invoice.markAsPaid(new Date());

    expect(() => {
      invoice.markAsPaid(new Date());
    }).toThrow(DomainError);
  });
});
```

---

### 10.2 Teste de Use Case

```typescript
// tests/application/use-cases/CreateInvoiceUseCase.spec.ts

import { CreateInvoiceUseCase } from '../../../src/application/use-cases/CreateInvoiceUseCase';
import { InMemoryInvoiceRepository } from '../../mocks/InMemoryInvoiceRepository';
import { InMemoryTenantRepository } from '../../mocks/InMemoryTenantRepository';
import { InMemoryCustomerRepository } from '../../mocks/InMemoryCustomerRepository';
import { MockAsaasService } from '../../mocks/MockAsaasService';
import { MockEmailService } from '../../mocks/MockEmailService';
import { Tenant } from '../../../src/domain/entities/Tenant';
import { Customer } from '../../../src/domain/entities/Customer';

describe('CreateInvoiceUseCase', () => {
  let useCase: CreateInvoiceUseCase;
  let invoiceRepository: InMemoryInvoiceRepository;
  let tenantRepository: InMemoryTenantRepository;
  let customerRepository: InMemoryCustomerRepository;
  let asaasService: MockAsaasService;
  let emailService: MockEmailService;

  beforeEach(() => {
    invoiceRepository =# Clean Architecture - MVP CobrançaFácil
## Guia Completo de Implementação com Domain-Driven Design

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Camadas da Aplicação](#2-camadas-da-aplicação)
3. [Entidades de Domínio (Domain Layer)](#3-entidades-de-domínio)
4. [Repositórios (Interfaces)](#4-repositórios-interfaces)
5. [Casos de Uso (Application Layer)](#5-casos-de-uso)
6. [Infraestrutura (Infrastructure Layer)](#6-infraestrutura)
7. [Apresentação (Presentation Layer)](#7-apresentação)
8. [Estrutura de Pastas Completa](#8-estrutura-de-pastas-completa)
9. [Implementação Passo a Passo](#9-implementação-passo-a-passo)
10. [Testes Unitários](#10-testes-unitários)

---

## 1. Visão Geral da Arquitetura

### 1.1 Princípios Clean Architecture

```
┌─────────────────────────────────────────┐
│         External (Framework)            │  ← Infrastructure
├─────────────────────────────────────────┤
│       Interface Adapters               │  ← Controllers, Gateways
├─────────────────────────────────────────┤
│         Application Layer               │  ← Use Cases
├─────────────────────────────────────────┤
│          Domain Layer                   │  ← Entities, Business Rules
└─────────────────────────────────────────┘

Regra de Dependência: Camadas internas NÃO conhecem camadas externas
```

### 1.2 Benefícios para o MVP

- **Testabilidade**: Lógica de negócio isolada e testável
- **Independência de Framework**: Fácil trocar Prisma, Express, etc
- **Independência de Banco**: Fácil migrar de PostgreSQL para outro
- **Manutenibilidade**: Código organizado e fácil de evoluir
- **Regras de Negócio Claras**: Centralizadas nas entidades

---

## 2. Camadas da Aplicação

### 2.1 Domain Layer (Núcleo)

**O que contém:**
- Entidades com regras de negócio
- Value Objects
- Interfaces de Repositórios
- Exceções de Domínio

**Não depende de nada externo**

### 2.2 Application Layer (Casos de Uso)

**O que contém:**
- Use Cases (orquestração de lógica)
- DTOs (Data Transfer Objects)
- Interfaces de Serviços Externos

**Depende apenas do Domain**

### 2.3 Infrastructure Layer (Adaptadores)

**O que contém:**
- Implementação de Repositórios (Prisma)
- Serviços Externos (Asaas, Email)
- Configurações de Banco

**Depende de Domain e Application**

### 2.4 Presentation Layer (HTTP)

**O que contém:**
- Controllers
- Routes
- Middlewares
- Validações de Request

**Depende de Application e Infrastructure**

---

## 3. Entidades de Domínio

### 3.1 Tenant (Autônomo/Profissional)

```typescript
// src/domain/entities/Tenant.ts

export interface TenantProps {
  id: string;
  email: string;
  name: string;
  phone?: string;
  document?: string;
  businessType?: string;
  asaasCustomerId?: string;
  feePercentage?: number;
  isActive?: boolean;
  createdAt?: Date;
}

export class Tenant {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _name: string;
  private readonly _phone?: string;
  private readonly _document?: string;
  private readonly _businessType?: string;
  private _asaasCustomerId?: string;
  private readonly _feePercentage: number;
  private _isActive: boolean;
  private readonly _createdAt: Date;

  private constructor(props: TenantProps) {
    this._id = props.id;
    this._email = props.email;
    this._name = props.name;
    this._phone = props.phone;
    this._document = props.document;
    this._businessType = props.businessType;
    this._asaasCustomerId = props.asaasCustomerId;
    this._feePercentage = props.feePercentage || 1.5;
    this._isActive = props.isActive !== undefined ? props.isActive : true;
    this._createdAt = props.createdAt || new Date();
  }

  // Factory Method
  static create(props: Omit<TenantProps, 'id' | 'createdAt'>): Tenant {
    const id = crypto.randomUUID();
    
    // Validações de domínio
    if (!props.email || !props.email.includes('@')) {
      throw new DomainError('Email inválido');
    }

    if (!props.name || props.name.length < 3) {
      throw new DomainError('Nome deve ter pelo menos 3 caracteres');
    }

    if (props.feePercentage && (props.feePercentage < 0 || props.feePercentage > 10)) {
      throw new DomainError('Taxa deve estar entre 0% e 10%');
    }

    return new Tenant({ ...props, id });
  }

  // Reconstituir de persistência
  static reconstitute(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  // Métodos de negócio
  calculatePlatformFee(amount: number): number {
    if (amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero');
    }
    return amount * (this._feePercentage / 100);
  }

  linkAsaasAccount(customerId: string): void {
    if (!customerId) {
      throw new DomainError('ID do Asaas é obrigatório');
    }
    this._asaasCustomerId = customerId;
  }

  deactivate(): void {
    this._isActive = false;
  }

  activate(): void {
    this._isActive = true;
  }

  // Getters
  get id(): string { return this._id; }
  get email(): string { return this._email; }
  get name(): string { return this._name; }
  get phone(): string | undefined { return this._phone; }
  get document(): string | undefined { return this._document; }
  get businessType(): string | undefined { return this._businessType; }
  get asaasCustomerId(): string | undefined { return this._asaasCustomerId; }
  get feePercentage(): number { return this._feePercentage; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return this._createdAt; }
}
```

---

### 3.2 Customer (Cliente do Autônomo)

```typescript
// src/domain/entities/Customer.ts

export interface CustomerProps {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  document?: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  isActive?: boolean;
  createdAt?: Date;
}

export class Customer {
  private readonly _id: string;
  private readonly _tenantId: string;
  private _name: string;
  private _email: string;
  private _phone: string;
  private _document?: string;
  private _address?: CustomerProps['address'];
  private _isActive: boolean;
  private readonly _createdAt: Date;

  private constructor(props: CustomerProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._name = props.name;
    this._email = props.email;
    this._phone = props.phone;
    this._document = props.document;
    this._address = props.address;
    this._isActive = props.isActive !== undefined ? props.isActive : true;
    this._createdAt = props.createdAt || new Date();
  }

  static create(props: Omit<CustomerProps, 'id' | 'createdAt'>): Customer {
    const id = crypto.randomUUID();

    // Validações
    if (!props.name || props.name.length < 3) {
      throw new DomainError('Nome deve ter pelo menos 3 caracteres');
    }

    if (!props.email || !props.email.includes('@')) {
      throw new DomainError('Email inválido');
    }

    if (!props.phone || props.phone.length < 10) {
      throw new DomainError('Telefone inválido');
    }

    return new Customer({ ...props, id });
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  // Métodos de negócio
  updateContactInfo(email: string, phone: string): void {
    if (!email.includes('@')) {
      throw new DomainError('Email inválido');
    }
    this._email = email;
    this._phone = phone;
  }

  deactivate(): void {
    this._isActive = false;
  }

  // Getters
  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get name(): string { return this._name; }
  get email(): string { return this._email; }
  get phone(): string { return this._phone; }
  get document(): string | undefined { return this._document; }
  get address(): CustomerProps['address'] | undefined { return this._address; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return this._createdAt; }
}
```

---

### 3.3 Invoice (Fatura)

```typescript
// src/domain/entities/Invoice.ts

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
export type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export interface InvoiceProps {
  id: string;
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  amount: number;
  platformFee: number;
  asaasFee: number;
  tenantReceives: number;
  dueDate: Date;
  status: InvoiceStatus;
  paymentLink?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  asaasChargeId?: string;
  paidDate?: Date;
  createdAt?: Date;
}

export class Invoice {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _customerId: string;
  private readonly _subscriptionId?: string;
  private readonly _invoiceNumber: string;
  private readonly _amount: number;
  private readonly _platformFee: number;
  private readonly _asaasFee: number;
  private readonly _tenantReceives: number;
  private readonly _dueDate: Date;
  private _status: InvoiceStatus;
  private _paymentLink?: string;
  private _pixQrCode?: string;
  private _pixCopyPaste?: string;
  private _asaasChargeId?: string;
  private _paidDate?: Date;
  private readonly _createdAt: Date;

  private constructor(props: InvoiceProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._customerId = props.customerId;
    this._subscriptionId = props.subscriptionId;
    this._invoiceNumber = props.invoiceNumber;
    this._amount = props.amount;
    this._platformFee = props.platformFee;
    this._asaasFee = props.asaasFee;
    this._tenantReceives = props.tenantReceives;
    this._dueDate = props.dueDate;
    this._status = props.status;
    this._paymentLink = props.paymentLink;
    this._pixQrCode = props.pixQrCode;
    this._pixCopyPaste = props.pixCopyPaste;
    this._asaasChargeId = props.asaasChargeId;
    this._paidDate = props.paidDate;
    this._createdAt = props.createdAt || new Date();
  }

  static create(
    props: Omit<InvoiceProps, 'id' | 'platformFee' | 'asaasFee' | 'tenantReceives' | 'status' | 'createdAt'>,
    tenant: Tenant,
    paymentMethod: PaymentMethod
  ): Invoice {
    const id = crypto.randomUUID();

    // Validações
    if (props.amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero');
    }

    if (props.dueDate < new Date()) {
      throw new DomainError('Data de vencimento deve ser futura');
    }

    // Cálculo de taxas (REGRA DE NEGÓCIO)
    const platformFee = tenant.calculatePlatformFee(props.amount);
    
    let asaasFee = 0;
    switch (paymentMethod) {
      case 'PIX':
        asaasFee = 0; // PIX é grátis no Asaas
        break;
      case 'BOLETO':
        asaasFee = 3.49; // Taxa fixa do boleto
        break;
      case 'CREDIT_CARD':
        asaasFee = props.amount * 0.0499; // 4.99% do cartão
        break;
    }

    const tenantReceives = props.amount - platformFee - asaasFee;

    return new Invoice({
      ...props,
      id,
      platformFee,
      asaasFee,
      tenantReceives,
      status: 'PENDING'
    });
  }

  static reconstitute(props: InvoiceProps): Invoice {
    return new Invoice(props);
  }

  // Métodos de negócio
  markAsPaid(paidDate: Date): void {
    if (this._status === 'PAID') {
      throw new DomainError('Fatura já foi paga');
    }
    if (this._status === 'CANCELED') {
      throw new DomainError('Fatura cancelada não pode ser paga');
    }
    this._status = 'PAID';
    this._paidDate = paidDate;
  }

  markAsOverdue(): void {
    if (this._status !== 'PENDING') {
      return; // Só marca como vencido se estiver pendente
    }
    this._status = 'OVERDUE';
  }

  cancel(): void {
    if (this._status === 'PAID') {
      throw new DomainError('Não é possível cancelar fatura paga');
    }
    this._status = 'CANCELED';
  }

  linkAsaasCharge(chargeId: string, paymentLink: string, pixQrCode?: string, pixCopyPaste?: string): void {
    this._asaasChargeId = chargeId;
    this._paymentLink = paymentLink;
    this._pixQrCode = pixQrCode;
    this._pixCopyPaste = pixCopyPaste;
  }

  isOverdue(): boolean {
    return this._status === 'PENDING' && new Date() > this._dueDate;
  }

  isPaid(): boolean {
    return this._status === 'PAID';
  }

  // Getters
  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get customerId(): string { return this._customerId; }
  get subscriptionId(): string | undefined { return this._subscriptionId; }
  get invoiceNumber(): string { return this._invoiceNumber; }
  get amount(): number { return this._amount; }
  get platformFee(): number { return this._platformFee; }
  get asaasFee(): number { return this._asaasFee; }
  get tenantReceives(): number { return this._tenantReceives; }
  get dueDate(): Date { return this._dueDate; }
  get status(): InvoiceStatus { return this._status; }
  get paymentLink(): string | undefined { return this._paymentLink; }
  get pixQrCode(): string | undefined { return this._pixQrCode; }
  get pixCopyPaste(): string | undefined { return this._pixCopyPaste; }
  get asaasChargeId(): string | undefined { return this._asaasChargeId; }
  get paidDate(): Date | undefined { return this._paidDate; }
  get createdAt(): Date { return this._createdAt; }
}
```

---

### 3.4 Subscription (Assinatura)

```typescript
// src/domain/entities/Subscription.ts

export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'OVERDUE';

export interface SubscriptionProps {
  id: string;
  tenantId: string;
  customerId: string;
  description?: string;
  amount: number;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  status: SubscriptionStatus;
  startDate: Date;
  nextBillingDate: Date;
  lastBillingDate?: Date;
  endDate?: Date;
  createdAt?: Date;
}

export class Subscription {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _customerId: string;
  private _description?: string;
  private _amount: number;
  private readonly _billingCycle: BillingCycle;
  private readonly _paymentMethod: PaymentMethod;
  private _status: SubscriptionStatus;
  private readonly _startDate: Date;
  private _nextBillingDate: Date;
  private _lastBillingDate?: Date;
  private _endDate?: Date;
  private readonly _createdAt: Date;

  private constructor(props: SubscriptionProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._customerId = props.customerId;
    this._description = props.description;
    this._amount = props.amount;
    this._billingCycle = props.billingCycle;
    this._paymentMethod = props.paymentMethod;
    this._status = props.status;
    this._startDate = props.startDate;
    this._nextBillingDate = props.nextBillingDate;
    this._lastBillingDate = props.lastBillingDate;
    this._endDate = props.endDate;
    this._createdAt = props.createdAt || new Date();
  }

  static create(
    props: Omit<SubscriptionProps, 'id' | 'status' | 'nextBillingDate' | 'createdAt'>
  ): Subscription {
    const id = crypto.randomUUID();

    if (props.amount <= 0) {
      throw new DomainError('Valor deve ser maior que zero');
    }

    // Calcular primeira data de cobrança
    const nextBillingDate = this.calculateNextBillingDate(props.startDate, props.billingCycle);

    return new Subscription({
      ...props,
      id,
      status: 'ACTIVE',
      nextBillingDate
    });
  }

  static reconstitute(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  // Métodos de negócio
  private static calculateNextBillingDate(currentDate: Date, cycle: BillingCycle): Date {
    const next = new Date(currentDate);
    
    switch (cycle) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'ANNUAL':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    
    return next;
  }

  advanceToNextBillingCycle(): void {
    this._lastBillingDate = this._nextBillingDate;
    this._nextBillingDate = Subscription.calculateNextBillingDate(
      this._nextBillingDate,
      this._billingCycle
    );
  }

  pause(): void {
    if (this._status === 'CANCELED') {
      throw new DomainError('Assinatura cancelada não pode ser pausada');
    }
    this._status = 'PAUSED';
  }

  resume(): void {
    if (this._status !== 'PAUSED') {
      throw new DomainError('Apenas assinaturas pausadas podem ser retomadas');
    }
    this._status = 'ACTIVE';
  }

  cancel(): void {
    this._status = 'CANCELED';
    this._endDate = new Date();
  }

  markAsOverdue(): void {
    if (this._status === 'ACTIVE') {
      this._status = 'OVERDUE';
    }
  }

  updateAmount(newAmount: number): void {
    if (newAmount <= 0) {
      throw new DomainError('Valor deve ser maior que zero');
    }
    this._amount = newAmount;
  }

  isActive(): boolean {
    return this._status === 'ACTIVE';
  }

  shouldGenerateInvoice(): boolean {
    return this._status === 'ACTIVE' && new Date() >= this._nextBillingDate;
  }

  // Getters
  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get customerId(): string { return this._customerId; }
  get description(): string | undefined { return this._description; }
  get amount(): number { return this._amount; }
  get billingCycle(): BillingCycle { return this._billingCycle; }
  get paymentMethod(): PaymentMethod { return this._paymentMethod; }
  get status(): SubscriptionStatus { return this._status; }
  get startDate(): Date { return this._startDate; }
  get nextBillingDate(): Date { return this._nextBillingDate; }
  get lastBillingDate(): Date | undefined { return this._lastBillingDate; }
  get endDate(): Date | undefined { return this._endDate; }
  get createdAt(): Date { return this._createdAt; }
}
```

---

### 3.5 Payment e Transaction

```typescript
// src/domain/entities/Payment.ts

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

export interface PaymentProps {
  id: string;
  invoiceId: string;
  tenantId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: Date;
  confirmedAt?: Date;
  asaasPaymentId?: string;
  createdAt?: Date;
}

export class Payment {
  // Implementação similar às outras entidades
  // Foco em métodos: create, reconstitute, confirm, fail, refund
}

// src/domain/entities/Transaction.ts

export type TransactionType = 'PLATFORM_FEE' | 'REFUND' | 'ADJUSTMENT';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface TransactionProps {
  id: string;
  tenantId: string;
  invoiceId: string;
  type: TransactionType;
  amount: number;
  percentage: number;
  baseAmount: number;
  status: TransactionStatus;
  processedAt?: Date;
  createdAt?: Date;
}

export class Transaction {
  // Factory específico para taxa da plataforma
  static createPlatformFee(
    tenantId: string,
    invoiceId: string,
    invoice: Invoice
  ): Transaction {
    return new Transaction({
      id: crypto.randomUUID(),
      tenantId,
      invoiceId,
      type: 'PLATFORM_FEE',
      amount: invoice.platformFee,
      percentage: 1.5,
      baseAmount: invoice.amount,
      status: 'COMPLETED',
      processedAt: new Date()
    });
  }
}
```

---

### 3.6 Exceções de Domínio

```typescript
// src/domain/errors/DomainError.ts

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} com ID ${id} não encontrado`);
    this.name = 'EntityNotFoundError';
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(rule: string) {
    super(`Violação de regra de negócio: ${rule}`);
    this.name = 'BusinessRuleViolationError';
  }
}
```

---

## 4. Repositórios (Interfaces)

```typescript
// src/domain/repositories/ITenantRepository.ts

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findByEmail(email: string): Promise<Tenant | null>;
  save(tenant: Tenant): Promise<void>;
  update(tenant: Tenant): Promise<void>;
}

// src/domain/repositories/ICustomerRepository.ts

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByEmail(tenantId: string, email: string): Promise<Customer | null>;
  findAllByTenant(tenantId: string, page: number, limit: number): Promise<{ customers: Customer[]; total: number }>;
  save(customer: Customer): Promise<void>;
  update(customer: Customer): Promise<void>;
  delete(id: string): Promise<void>;
}

// src/domain/repositories/IInvoiceRepository.ts

export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  findByAsaasChargeId(chargeId: string): Promise<Invoice | null>;
  findAllByTenant(tenantId: string, filters: InvoiceFilters): Promise<{ invoices: Invoice[]; total: number }>;
  countByTenant(tenantId: string): Promise<number>;
  save(invoice: Invoice): Promise<void>;
  update(invoice: Invoice): Promise<void>;
}

// src/domain/repositories/ISubscriptionRepository.ts

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findActiveByTenantDueToday(tenantId: string): Promise<Subscription[]>;
  findAllByTenant(tenantId: string): Promise<Subscription[]>;
  save(subscription: Subscription): Promise<void>;
  update(subscription: Subscription): Promise<void>;
}
```

---

## 5. Casos de Uso

### 5.1 CreateCustomerUseCase

```typescript
// src/application/use-cases/CreateCustomerUseCase.ts

import { Customer } from '../../domain/entities/Customer';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { DomainError } from '../../domain/errors/DomainError';

export interface CreateCustomerDTO {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  document?: string;
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository
  ) {}

  async execute(dto: CreateCustomerDTO): Promise<Customer> {
    // 1. Verificar se email já existe
    const existingCustomer = await this.customerRepository.findByEmail(
      dto.tenantId,
      dto.email
    );

    if (existingCustomer) {
      throw new DomainError('Já existe um cliente com este email');
    }

    // 2. Criar entidade (validações de domínio acontecem aqui)
    const customer = Customer.create({
      tenantId: dto.tenantId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      document: dto.document,
      address: dto.address
    });

    // 3. Persistir
    await this.customerRepository.save(customer);

    return customer;
  }
}
```

---

### 5.2 CreateInvoiceUseCase

```typescript
// src/application/use-cases/CreateInvoiceUseCase.ts

import { Invoice } from '../../domain/entities/Invoice';
import { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository';
import { IAsaasService } from '../services/IAsaasService';
import { IEmailService } from '../services/IEmailService';
import { EntityNotFoundError } from '../../domain/errors/DomainError';

export interface CreateInvoiceDTO {
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  amount: number;
  dueDate: Date;
  paymentMethod: PaymentMethod;
  description?: string;
}

export class CreateInvoiceUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly asaasService: IAsaasService,
    private readonly emailService: IEmailService
  ) {}

  async execute(dto: CreateInvoiceDTO): Promise<Invoice> {
    // 1. Buscar tenant
    const tenant = await this.tenantRepository.findById(dto.tenantId);
    if (!tenant) {
      throw new EntityNotFoundError('Tenant', dto.tenantId);
    }

    // 2. Buscar customer
    const customer = await this.customerRepository.findById(dto.customerId);
    if (!customer) {
      throw new