# Arquitetura Pattern Agendaki - CobrançaFácil
## Core (Domain + Use Cases) + Modules (Infraestrutura)

---

## 1. Estrutura de Pastas Completa

```
src/
├── core/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Tenant.ts
│   │   │   ├── Customer.ts
│   │   │   ├── Invoice.ts
│   │   │   ├── Subscription.ts
│   │   │   ├── Payment.ts
│   │   │   └── Transaction.ts
│   │   │
│   │   ├── repositories/           # Interfaces (contratos)
│   │   │   ├── ITenantRepository.ts
│   │   │   ├── ICustomerRepository.ts
│   │   │   ├── IInvoiceRepository.ts
│   │   │   ├── ISubscriptionRepository.ts
│   │   │   ├── IPaymentRepository.ts
│   │   │   └── ITransactionRepository.ts
│   │   │
│   │   └── errors/
│   │       ├── DomainError.ts
│   │       └── EntityNotFoundError.ts
│   │
│   └── application/
│       └── use-cases/              # <-- USE CASES AQUI
│           ├── auth/
│           │   ├── RegisterTenantUseCase.ts
│           │   └── LoginTenantUseCase.ts
│           │
│           ├── customers/
│           │   ├── CreateCustomerUseCase.ts
│           │   ├── ListCustomersUseCase.ts
│           │   ├── GetCustomerUseCase.ts
│           │   ├── UpdateCustomerUseCase.ts
│           │   └── DeleteCustomerUseCase.ts
│           │
│           ├── invoices/
│           │   ├── CreateInvoiceUseCase.ts
│           │   ├── ListInvoicesUseCase.ts
│           │   └── GetInvoiceUseCase.ts
│           │
│           ├── subscriptions/
│           │   ├── CreateSubscriptionUseCase.ts
│           │   └── GenerateInvoicesFromSubscriptionsUseCase.ts
│           │
│           └── webhooks/
│               └── ProcessPaymentWebhookUseCase.ts
│
├── modules/                        # Infraestrutura
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.routes.ts
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   │
│   ├── customers/
│   │   ├── customer.controller.ts
│   │   ├── customer.repository.ts  # Implementação Prisma
│   │   ├── customer.routes.ts
│   │   └── dto/
│   │       ├── create-customer.dto.ts
│   │       └── update-customer.dto.ts
│   │
│   ├── invoices/
│   │   ├── invoice.controller.ts
│   │   ├── invoice.repository.ts
│   │   ├── invoice.routes.ts
│   │   └── dto/
│   │       └── create-invoice.dto.ts
│   │
│   ├── subscriptions/
│   │   ├── subscription.controller.ts
│   │   ├── subscription.repository.ts
│   │   ├── subscription.routes.ts
│   │   └── dto/
│   │
│   ├── payments/
│   │   ├── payment.repository.ts
│   │   └── transaction.repository.ts
│   │
│   └── webhooks/
│       ├── webhook.controller.ts
│       └── webhook.routes.ts
│
├── shared/
│   ├── database/
│   │   └── prisma.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   └── validate.middleware.ts
│   │
│   ├── services/
│   │   ├── asaas.service.ts
│   │   ├── email.service.ts
│   │   └── jwt.service.ts
│   │
│   ├── errors/
│   │   └── AppError.ts
│   │
│   └── utils/
│       └── validators.ts
│
├── config/
│   └── env.ts
│
├── jobs/
│   └── cron.ts
│
└── main.ts
```

---

## 2. Core Layer

### 2.1 Domain - Entities

```typescript
// src/core/domain/entities/Invoice.ts

import { DomainError } from '../errors/DomainError';
import { Tenant } from './Tenant';

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
    this._asaasChargeId = props.asaasChargeId;
    this._paidDate = props.paidDate;
    this._createdAt = props.createdAt || new Date();
  }

  // Factory method com cálculo de fees
  static create(
    props: Omit<InvoiceProps, 'id' | 'platformFee' | 'asaasFee' | 'tenantReceives' | 'status' | 'createdAt'>,
    tenant: Tenant,
    paymentMethod: PaymentMethod
  ): Invoice {
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
        asaasFee = 0;
        break;
      case 'BOLETO':
        asaasFee = 3.49;
        break;
      case 'CREDIT_CARD':
        asaasFee = props.amount * 0.0499;
        break;
    }

    const tenantReceives = props.amount - platformFee - asaasFee;

    return new Invoice({
      ...props,
      id: crypto.randomUUID(),
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
    this._status = 'PAID';
    this._paidDate = paidDate;
  }

  linkAsaasCharge(chargeId: string, paymentLink: string, pixQrCode?: string): void {
    this._asaasChargeId = chargeId;
    this._paymentLink = paymentLink;
    this._pixQrCode = pixQrCode;
  }

  isOverdue(): boolean {
    return this._status === 'PENDING' && new Date() > this._dueDate;
  }

  // Getters
  get id() { return this._id; }
  get tenantId() { return this._tenantId; }
  get customerId() { return this._customerId; }
  get subscriptionId() { return this._subscriptionId; }
  get invoiceNumber() { return this._invoiceNumber; }
  get amount() { return this._amount; }
  get platformFee() { return this._platformFee; }
  get asaasFee() { return this._asaasFee; }
  get tenantReceives() { return this._tenantReceives; }
  get dueDate() { return this._dueDate; }
  get status() { return this._status; }
  get paymentLink() { return this._paymentLink; }
  get pixQrCode() { return this._pixQrCode; }
  get asaasChargeId() { return this._asaasChargeId; }
  get paidDate() { return this._paidDate; }
  get createdAt() { return this._createdAt; }
}
```

---

### 2.2 Domain - Repository Interfaces

```typescript
// src/core/domain/repositories/IInvoiceRepository.ts

import { Invoice } from '../entities/Invoice';

export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  findByAsaasChargeId(chargeId: string): Promise<Invoice | null>;
  findAllByTenant(tenantId: string, page: number, limit: number): Promise<{
    invoices: Invoice[];
    total: number;
  }>;
  countByTenant(tenantId: string): Promise<number>;
  save(invoice: Invoice): Promise<void>;
  update(invoice: Invoice): Promise<void>;
}
```

---

### 2.3 Application - Use Cases

```typescript
// src/core/application/use-cases/invoices/CreateInvoiceUseCase.ts

import { Invoice } from '../../../domain/entities/Invoice';
import { ITenantRepository } from '../../../domain/repositories/ITenantRepository';
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { EntityNotFoundError, DomainError } from '../../../domain/errors/DomainError';
import { AsaasService } from '../../../../shared/services/asaas.service';
import { EmailService } from '../../../../shared/services/email.service';

export interface CreateInvoiceDTO {
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  amount: number;
  dueDate: Date;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  description?: string;
}

export class CreateInvoiceUseCase {
  constructor(
    private invoiceRepository: IInvoiceRepository,
    private tenantRepository: ITenantRepository,
    private customerRepository: ICustomerRepository,
    private asaasService: AsaasService,
    private emailService: EmailService
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
      throw new EntityNotFoundError('Customer', dto.customerId);
    }

    // Validar que o customer pertence ao tenant
    if (customer.tenantId !== dto.tenantId) {
      throw new DomainError('Cliente não pertence a este tenant');
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
      dueDate: dto.dueDate.toISOString().split('T')[0],
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
      asaasCharge.pixQrCode
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

```typescript
// src/core/application/use-cases/customers/CreateCustomerUseCase.ts

import { Customer } from '../../../domain/entities/Customer';
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { DomainError } from '../../../domain/errors/DomainError';

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
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(dto: CreateCustomerDTO): Promise<Customer> {
    // Validar duplicidade
    const exists = await this.customerRepository.findByEmail(
      dto.tenantId,
      dto.email
    );

    if (exists) {
      throw new DomainError('Cliente com este email já existe');
    }

    // Criar entidade (validações de domínio acontecem aqui)
    const customer = Customer.create({
      tenantId: dto.tenantId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      document: dto.document,
      address: dto.address
    });

    // Persistir
    await this.customerRepository.save(customer);

    return customer;
  }
}
```

---

```typescript
// src/core/application/use-cases/webhooks/ProcessPaymentWebhookUseCase.ts

import { Invoice } from '../../../domain/entities/Invoice';
import { Payment } from '../../../domain/entities/Payment';
import { Transaction } from '../../../domain/entities/Transaction';
import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { IPaymentRepository } from '../../../domain/repositories/IPaymentRepository';
import { ITransactionRepository } from '../../../domain/repositories/ITransactionRepository';
import { EntityNotFoundError } from '../../../domain/errors/DomainError';
import { EmailService } from '../../../../shared/services/email.service';

export interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    paymentDate: string;
    externalReference?: string;
  };
}

export class ProcessPaymentWebhookUseCase {
  constructor(
    private invoiceRepository: IInvoiceRepository,
    private paymentRepository: IPaymentRepository,
    private transactionRepository: ITransactionRepository,
    private emailService: EmailService
  ) {}

  async execute(payload: AsaasWebhookPayload): Promise<void> {
    // 1. Buscar invoice
    const invoice = await this.invoiceRepository.findByAsaasChargeId(
      payload.payment.id
    );

    if (!invoice) {
      throw new EntityNotFoundError('Invoice', payload.payment.id);
    }

    // 2. Marcar invoice como paga
    invoice.markAsPaid(new Date(payload.payment.paymentDate));
    await this.invoiceRepository.update(invoice);

    // 3. Criar Payment
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

    // 4. Registrar Transaction (nossa receita)
    const transaction = Transaction.createPlatformFee(
      invoice.tenantId,
      invoice.id,
      invoice
    );
    await this.transactionRepository.save(transaction);

    // 5. Enviar notificação
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

## 3. Modules Layer (Infraestrutura)

### 3.1 Repository Implementation (Prisma)

```typescript
// src/modules/invoices/invoice.repository.ts

import { PrismaClient } from '@prisma/client';
import { Invoice } from '../../core/domain/entities/Invoice';
import { IInvoiceRepository } from '../../core/domain/repositories/IInvoiceRepository';

export class InvoiceRepository implements IInvoiceRepository {
  constructor(private prisma: PrismaClient) {}

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

  async findAllByTenant(tenantId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.invoice.count({ where: { tenantId } })
    ]);

    return {
      invoices: invoices.map(this.toDomain),
      total
    };
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.invoice.count({ where: { tenantId } });
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
        asaasChargeId: invoice.asaasChargeId
      }
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
      asaasChargeId: data.asaasChargeId || undefined,
      paidDate: data.paidDate || undefined,
      createdAt: data.createdAt
    });
  }
}
```

---

### 3.2 Controller

```typescript
// src/modules/invoices/invoice.controller.ts

import { Request, Response, NextFunction } from 'express';
import { CreateInvoiceUseCase } from '../../core/application/use-cases/invoices/CreateInvoiceUseCase';
import { ListInvoicesUseCase } from '../../core/application/use-cases/invoices/ListInvoicesUseCase';
import { DomainError } from '../../core/domain/errors/DomainError';

export class InvoiceController {
  constructor(
    private createInvoiceUseCase: CreateInvoiceUseCase,
    private listInvoicesUseCase: ListInvoicesUseCase
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user.tenantId;
      const { customerId, amount, dueDate, paymentMethod, description } = req.body;

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
          pixQrCode: invoice.pixQrCode
        },
        message: 'Fatura criada com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user.tenantId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.listInvoicesUseCase.execute(tenantId, page, limit);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

### 3.3 Routes

```typescript
// src/modules/invoices/invoice.routes.ts

import { Router } from 'express';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { TenantRepository } from '../auth/tenant.repository';
import { CustomerRepository } from '../customers/customer.repository';
import { CreateInvoiceUseCase } from '../../core/application/use-cases/invoices/CreateInvoiceUseCase';
import { ListInvoicesUseCase } from '../../core/application/use-cases/invoices/ListInvoicesUseCase';
import { AsaasService } from '../../shared/services/asaas.service';
import { EmailService } from '../../shared/services/email.service';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { validateRequest } from '../../shared/middlewares/validate.middleware';
import { createInvoiceSchema } from './dto/create-invoice.dto';
import { prisma } from '../../shared/database/prisma';

const router = Router();

// Dependency Injection Manual
const invoiceRepository = new InvoiceRepository(prisma);
const tenantRepository = new TenantRepository(prisma);
const customerRepository = new CustomerRepository(prisma);
const asaasService = new AsaasService();
const emailService = new EmailService();

const createInvoiceUseCase = new CreateInvoiceUseCase(
  invoiceRepository,
  tenantRepository,
  customerRepository,
  asaasService,
  emailService
);

const listInvoicesUseCase = new ListInvoicesUseCase(invoiceRepository);

const invoiceController = new InvoiceController(
  createInvoiceUseCase,
  listInvoicesUseCase
);

// Routes
router.use(authMiddleware);

router.post(
  '/',
  validateRequest(createInvoiceSchema),
  invoiceController.create
);

router.get('/', invoiceController.list);

export default router;
```

---

## 4. Fluxo de Dados

```
Request HTTP
    ↓
Routes (modules/invoices/invoice.routes.ts)
    ↓
Controller (modules/invoices/invoice.controller.ts)
    ↓
UseCase (core/application/use-cases/invoices/CreateInvoiceUseCase.ts)
    ↓
├─→ Repository Interface (core/domain/repositories/IInvoiceRepository.ts)
│       ↓
│   Repository Implementation (modules/invoices/invoice.repository.ts)
│       ↓
│   Prisma → PostgreSQL
│
├─→ Entity (core/domain/entities/Invoice.ts)
│   └─→ Regras de negócio (cálculo de fees)
│
└─→ External Services (shared/services/asaas.service.ts)
```

---

## 5. Vantagens desta Arquitetura

1. **Core isolado**: Entidades e Use Cases não dependem de nada externo
2. **Testável**: Use Cases podem ser testados com mocks dos repositories
3. **Organizado**: Fácil navegar por feature nos modules
4. **Escalável**: Adicionar nova feature = novo módulo + use cases
5. **Regras de negócio centralizadas**: Tudo em entities

---

## 6. Checklist de Implementação

**Semana 1: Core**
- [ ] Entities (Tenant, Customer, Invoice)
- [ ] Repository Interfaces
- [ ] Errors

**Semana 2: Use Cases + Auth**
- [ ] CreateCustomerUseCase
- [ ] CreateInvoiceUseCase
- [ ] RegisterTenantUseCase
- [ ] LoginTenantUseCase

**Semana 3: Modules**
- [ ] Customers (repository + controller + routes)
- [ ] Invoices (repository + controller + routes)
- [ ] Auth (controller + routes)

**Semana 4: Webhooks + Jobs**
- [ ] ProcessPaymentWebhookUseCase
- [ ] Webhook module
- [ ] Cron jobs

---

**Padrão Agendaki completo implementado!**