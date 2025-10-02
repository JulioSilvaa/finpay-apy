#### 7.1.2 Criar Cobrança com Split

**POST** `/payments`

**Request**:
```json
{
  "customer": "cus_abc123",
  "billingType": "PIX",
  "value": 150.00,
  "dueDate": "2025-10-15",
  "description": "Consulta mensal",
  "externalReference": "invoice_uuid_123",
  "split": [
    {
      "walletId": "wallet_cobrancafacil",
      "fixedValue": 2.25,
      "percentualValue": null,
      "status": "PENDING"
    }
  ]
}
```

**Response**:
```json
{
  "object": "payment",
  "id": "pay_abc123",
  "customer": "cus_abc123",
  "billingType": "PIX",
  "value": 150.00,
  "netValue": 147.75,
  "status": "PENDING",
  "dueDate": "2025-10-15",
  "invoiceUrl": "https://pay.asaas.com/abc123",
  "bankSlipUrl": null,
  "invoiceNumber": "000123",
  "externalReference": "invoice_uuid_123",
  "pixQrCodeId": "qr_xyz789",
  "pixCopyAndPaste": "00020126580014br.gov.bcb.pix..."
}
```

---

#### 7.1.3 Consultar QR Code PIX

**GET** `/pix/qrCodes/{qrCodeId}`

**Response**:
```json
{
  "encodedImage": "iVBORw0KGgoAAAANSUhEUgAA...",
  "payload": "00020126580014br.gov.bcb.pix...",
  "expirationDate": "2025-10-15T23:59:59Z"
}
```

---

#### 7.1.4 Webhooks do Asaas

Eventos que recebemos:

| Evento | Descrição | Ação |
|--------|-----------|------|
| `PAYMENT_CREATED` | Cobrança criada | Log apenas |
| `PAYMENT_AWAITING_PAYMENT` | Aguardando pagamento | Atualizar status |
| `PAYMENT_RECEIVED` | Pagamento recebido | Confirmar no sistema |
| `PAYMENT_CONFIRMED` | Pagamento confirmado | **Processar pagamento** |
| `PAYMENT_OVERDUE` | Cobrança vencida | Marcar como OVERDUE |
| `PAYMENT_DELETED` | Cobrança deletada | Atualizar status |
| `PAYMENT_REFUNDED` | Pagamento estornado | Processar estorno |

---

### 7.2 Email (MailerSend)

**Base URL**: `https://api.mailersend.com/v1`

**Autenticação**:
```http
Authorization: Bearer {mailersend_api_key}
```

#### 7.2.1 Enviar Email

**POST** `/email`

**Request**:
```json
{
  "from": {
    "email": "noreply@cobrancafacil.com",
    "name": "CobrançaFácil"
  },
  "to": [
    {
      "email": "maria@exemplo.com",
      "name": "Maria Santos"
    }
  ],
  "subject": "Nova cobrança disponível",
  "text": "Olá Maria, você tem uma nova cobrança de R$ 150,00...",
  "html": "<html>...</html>",
  "template_id": "template_xyz789",
  "variables": [
    {
      "email": "maria@exemplo.com",
      "substitutions": [
        {
          "var": "customer_name",
          "value": "Maria"
        },
        {
          "var": "amount",
          "value": "150.00"
        },
        {
          "var": "due_date",
          "value": "15/10/2025"
        },
        {
          "var": "payment_link",
          "value": "https://pay.asaas.com/abc123"
        }
      ]
    }
  ]
}
```

**Response**:
```json
{
  "message_id": "msg_abc123",
  "status": "queued"
}
```

---

### 7.3 WhatsApp (Futuro - Z-API ou Twilio)

**Base URL**: `https://api.z-api.io`

**POST** `/instances/{instance_id}/token/{token}/send-text`

**Request**:
```json
{
  "phone": "5511988888888",
  "message": "Olá Maria! 👋\n\nVocê tem uma nova cobrança:\n\n💰 Valor: R$ 150,00\n📅 Vencimento: 15/10/2025\n\n👉 Clique para pagar: https://pay.asaas.com/abc123"
}
```

---

## 8. Fluxo de Dados Completo

### 8.1 Ciclo de Vida de uma Cobrança

```mermaid
stateDiagram-v2
    [*] --> CRIADA: Tenant cria cobrança
    CRIADA --> PENDENTE: Gera no Asaas
    PENDENTE --> PAGA: Cliente paga
    PENDENTE --> VENCIDA: Data vence
    VENCIDA --> PAGA: Cliente paga atrasado
    VENCIDA --> CANCELADA: Tenant cancela
    PAGA --> [*]
    CANCELADA --> [*]
    
    note right of CRIADA
        - Calcular valores
        - Gerar invoiceNumber
    end note
    
    note right of PENDENTE
        - Criar no Asaas
        - Enviar notificação
        - Aguardar pagamento
    end note
    
    note right of PAGA
        - Webhook confirma
        - Criar Payment
        - Criar Transaction
        - Atualizar Customer
    end note
    
    note right of VENCIDA
        - Cron job detecta
        - Enviar lembrete
        - Atualizar Subscription
    end note
```

---

### 8.2 Fluxo de Dados: Criação até Pagamento

```mermaid
sequenceDiagram
    participant T as Tenant (Frontend)
    participant API as Backend API
    participant DB as PostgreSQL
    participant A as Asaas API
    participant C as Cliente Final
    participant W as Webhook Asaas
    
    T->>API: POST /invoices {amount: 150}
    API->>API: Calcular fees (1.5%)
    API->>DB: INSERT Invoice
    API->>A: POST /payments {split: 2.25}
    A-->>API: {id, paymentLink, pixQrCode}
    API->>DB: UPDATE Invoice asaasChargeId
    API->>C: Enviar email com link
    API-->>T: 201 Created {invoice data}
    
    Note over C: Cliente acessa link e paga
    
    C->>A: Paga via PIX
    A->>A: Processa pagamento
    A->>API: POST /webhooks/asaas {PAYMENT_CONFIRMED}
    API->>DB: BEGIN TRANSACTION
    API->>DB: UPDATE Invoice status=PAID
    API->>DB: INSERT Payment
    API->>DB: INSERT Transaction (nossa receita)
    API->>DB: UPDATE Customer totalPaid
    API->>DB: COMMIT TRANSACTION
    API->>T: Enviar notificação (webhook/realtime)
    API-->>A: 200 OK
```

---

### 8.3 Fluxo de Dados: Jobs Automáticos

```mermaid
sequenceDiagram
    participant Cron as Cron Job (00:00)
    participant API as Backend
    participant DB as PostgreSQL
    participant A as Asaas API
    participant C as Clientes
    
    Note over Cron: Job 1: Gerar faturas
    Cron->>DB: SELECT Subscriptions WHERE nextBillingDate = TODAY
    DB-->>Cron: [sub1, sub2, sub3]
    
    loop Para cada subscription
        Cron->>API: Gerar invoice
        API->>DB: INSERT Invoice
        API->>A: POST /payments
        A-->>API: {id, paymentLink}
        API->>C: Enviar notificação
        API->>DB: UPDATE Subscription nextBillingDate
    end
    
    Note over Cron: Job 2: Enviar lembretes
    Cron->>DB: SELECT Invoices WHERE dueDate = TODAY + 3
    DB-->>Cron: [inv1, inv2]
    
    loop Para cada invoice
        Cron->>C: Enviar lembrete
        Cron->>DB: INSERT Notification
    end
    
    Note over Cron: Job 3: Marcar vencidas
    Cron->>DB: SELECT Invoices WHERE status=PENDING AND dueDate < TODAY
    DB-->>Cron: [inv3, inv4]
    
    loop Para cada invoice
        Cron->>DB: UPDATE Invoice status=OVERDUE
        Cron->>DB: UPDATE Subscription status=OVERDUE
        Cron->>C: Enviar notificação atraso
    end
    
    Note over Cron: Job 4: Atualizar summaries
    Cron->>DB: SELECT * FROM Tenants
    DB-->>Cron: [tenant1, tenant2, ...]
    
    loop Para cada tenant
        Cron->>DB: Calcular métricas agregadas
        Cron->>DB: UPSERT FinancialSummary
    end
```

---

## 9. Segurança e Autenticação

### 9.1 JWT Token Structure

**Payload**:
```json
{
  "sub": "user_uuid",
  "tenantId": "tenant_uuid",
  "email": "joao@exemplo.com",
  "role": "ADMIN",
  "iat": 1696118400,
  "exp": 1696204800
}
```

**Geração**:
```javascript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {
    sub: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);
```

**Validação**:
```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token not provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

### 9.2 Multi-Tenancy Security

**Filtro automático por tenant**:
```javascript
// Middleware para adicionar tenantId em todas queries
const tenantFilter = (req, res, next) => {
  req.tenantId = req.user.tenantId;
  next();
};

// Exemplo de uso
app.get('/customers', authMiddleware, tenantFilter, async (req, res) => {
  const customers = await prisma.customer.findMany({
    where: { tenantId: req.tenantId } // Sempre filtrar por tenant
  });
  
  res.json({ success: true, data: customers });
});
```

**Validação de acesso**:
```javascript
// Verificar se recurso pertence ao tenant
const checkResourceOwnership = async (resourceId, tenantId, model) => {
  const resource = await prisma[model].findUnique({
    where: { id: resourceId },
    select: { tenantId: true }
  });
  
  if (!resource || resource.tenantId !== tenantId) {
    throw new Error('Resource not found or access denied');
  }
  
  return true;
};

// Uso
app.delete('/customers/:id', authMiddleware, async (req, res) => {
  await checkResourceOwnership(req.params.id, req.user.tenantId, 'customer');
  
  await prisma.customer.delete({
    where: { id: req.params.id }
  });
  
  res.json({ success: true });
});
```

---

### 9.3 Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

// Limitar requisições por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests
  message: 'Muitas requisições, tente novamente mais tarde'
});

app.use('/api/', limiter);

// Limitar tentativas de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 tentativas
  skipSuccessfulRequests: true
});

app.post('/auth/login', loginLimiter, loginHandler);
```

---

### 9.4 Validação de Dados (Zod)

```typescript
import { z } from 'zod';

// Schema de validação
const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive().max(100000),
  dueDate: z.string().datetime(),
  paymentMethod: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']),
  description: z.string().max(500).optional()
});

// Middleware de validação
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.errors
        }
      });
    }
  };
};

// Uso
app.post('/invoices', 
  authMiddleware, 
  validate(createInvoiceSchema), 
  createInvoiceHandler
);
```

---

### 9.5 Proteção de Dados Sensíveis

**Criptografia**:
```javascript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY; // 32 bytes

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

const decrypt = (encrypted, iv, authTag) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Uso para asaasApiKey
const saveApiKey = async (tenantId, apiKey) => {
  const encrypted = encrypt(apiKey);
  
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      asaasApiKey: JSON.stringify(encrypted)
    }
  });
};
```

---

## 10. Jobs e Automações

### 10.1 Cron Jobs com Node-Cron

```javascript
import cron from 'node-cron';

// Job 1: Gerar faturas de assinaturas (todo dia às 00:00)
cron.schedule('0 0 * * *', async () => {
  console.log('Running job: Generate invoices');
  
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      nextBillingDate: {
        lte: new Date()
      }
    },
    include: {
      customer: true,
      tenant: true
    }
  });
  
  for (const sub of subscriptions) {
    try {
      await generateInvoiceFromSubscription(sub);
    } catch (error) {
      console.error(`Error generating invoice for sub ${sub.id}:`, error);
    }
  }
});

// Job 2: Enviar lembretes (todo dia às 09:00)
cron.schedule('0 9 * * *', async () => {
  console.log('Running job: Send reminders');
  
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true }
  });
  
  for (const tenant of tenants) {
    const daysBeforeReminder = tenant.reminderDaysBefore || 3;
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + daysBeforeReminder);
    
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: tenant.id,
        status: 'PENDING',
        dueDate: {
          gte: new Date(reminderDate.setHours(0, 0, 0, 0)),
          lte: new Date(reminderDate.setHours(23, 59, 59, 999))
        }
      },
      include: { customer: true }
    });
    
    for (const invoice of invoices) {
      await sendReminderNotification(invoice);
    }
  }
});

// Job 3: Marcar faturas vencidas (todo dia às 00:10)
cron.schedule('10 0 * * *', async () => {
  console.log('Running job: Mark overdue invoices');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PENDING',
      dueDate: {
        lte: yesterday
      }
    }
  });
  
  for (const invoice of overdueInvoices) {
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' }
      }),
      prisma.subscription.updateMany({
        where: { id: invoice.subscriptionId },
        data: { status: 'OVERDUE' }
      })
    ]);
    
    await sendOverdueNotification(invoice);
  }
});

// Job 4: Atualizar summaries financeiros (todo dia às 01:00)
cron.schedule('0 1 * * *', async () => {
  console.log('Running job: Update financial summaries');
  
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true }
  });
  
  for (const tenant of tenants) {
    await updateFinancialSummary(tenant.id);
  }
});
```

---

### 10.2 Funções de Jobs

```javascript
// Gerar invoice a partir de subscription
async function generateInvoiceFromSubscription(subscription) {
  const { tenant, customer } = subscription;
  
  // Calcular valores
  const amount = subscription.amount;
  const platformFee = amount * 0.015;
  let asaasFee = 0;
  
  if (subscription.paymentMethod === 'BOLETO') asaasFee = 3.49;
  if (subscription.paymentMethod === 'CREDIT_CARD') asaasFee = amount * 0.0499;
  
  const tenantReceives = amount - platformFee - asaasFee;
  
  // Gerar número da fatura
  const count = await prisma.invoice.count({
    where: { tenantId: tenant.id }
  });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  
  // Criar cobrança no Asaas
  const asaasCharge = await asaas.createCharge({
    customer: customer.asaasCustomerId || tenant.asaasCustomerId,
    billingType: subscription.paymentMethod,
    value: amount,
    dueDate: subscription.nextBillingDate,
    description: subscription.description,
    externalReference: `sub_${subscription.id}`,
    split: [{
      walletId: process.env.ASAAS_WALLET_ID,
      fixedValue: platformFee
    }]
  });
  
  // Criar invoice no banco
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      subscriptionId: subscription.id,
      invoiceNumber,
      amount,
      platformFee,
      asaasFee,
      tenantReceives,
      dueDate: subscription.nextBillingDate,
      status: 'PENDING',
      asaasChargeId: asaasCharge.id,
      paymentLink: asaasCharge.invoiceUrl,
      pixQrCode: asaasCharge.pixQrCode,
      pixCopyPaste: asaasCharge.pixCopyPaste
    }
  });
  
  // Atualizar próxima data de cobrança
  const nextBillingDate = calculateNextBillingDate(
    subscription.nextBillingDate,
    subscription.billingCycle
  );
  
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      nextBillingDate,
      lastBillingDate: subscription.nextBillingDate
    }
  });
  
  // Enviar notificação
  await sendNotification({
    type: 'INVOICE_CREATED',
    tenantId: tenant.id,
    customerId: customer.id,
    invoiceId: invoice.id,
    channel: 'EMAIL'
  });
  
  return invoice;
}

// Calcular próxima data de cobrança
function calculateNextBillingDate(currentDate, billingCycle) {
  const date = new Date(currentDate);
  
  switch (billingCycle) {
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'BIWEEKLY':
      date.setDate(date.getDate() + 14);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'QUARTERLY':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'BIANNUAL':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'ANNUAL':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date;
}

// Atualizar summary financeiro
async function updateFinancialSummary(tenantId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Agregar dados
  const [
    invoices,
    payments,
    transactions,
    customers
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantId },
      _sum: { amount: true, tenantReceives: true },
      _count: true
    }),
    prisma.invoice.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: {
        tenantId,
        type: 'PLATFORM_FEE',
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    }),
    prisma.customer.aggregate({
      where: { tenantId },
      _count: true
    })
  ]);
  
  const monthlyRevenue = await prisma.invoice.aggregate({
    where: {
      tenantId,
      status: 'PAID',
      paidDate: { gte: startOfMonth }
    },
    _sum: { tenantReceives: true }
  });
  
  const platformRevenueMonth = await prisma.transaction.aggregate({
    where: {
      tenantId,
      type: 'PLATFORM_FEE',
      status: 'COMPLETED',
      createdAt: { gte: startOfMonth }
    },
    _sum: { amount: true }
  });
  
  // Status das invoices
  const paidInvoices = payments.find(p => p.status === 'PAID')?._count || 0;
  const pendingInvoices = payments.find(p => p.status === 'PENDING')?._count || 0;
  const overdueInvoices = payments.find(p => p.status === 'OVERDUE')?._count || 0;
  
  const totalPaid = payments.find(p => p.status === 'PAID')?._sum.amount || 0;
  const totalPending = payments.find(p => p.status === 'PENDING')?._sum.amount || 0;
  const totalOverdue = payments.find(p => p.status === 'OVERDUE')?._sum.amount || 0;
  
  // Upsert summary
  await prisma.financialSummary.upsert({
    where: { tenantId },
    create: {
      tenantId,
      totalRevenue: invoices._sum.tenantReceives || 0,
      monthlyRevenue: monthlyRevenue._sum.tenantReceives || 0,
      totalInvoices: invoices._count,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalPaid,
      totalPending,
      totalOverdue,
      platformRevenue: transactions._sum.amount || 0,
      platformRevenueMonth: platformRevenueMonth._sum.amount || 0,
      totalCustomers: customers._count,
      activeCustomers: customers._count,
      lastCalculatedAt: new Date()
    },
    update: {
      totalRevenue: invoices._sum.tenantReceives || 0,
      monthlyRevenue: monthlyRevenue._sum.tenantReceives || 0,
      totalInvoices: invoices._count,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalPaid,
      totalPending,
      totalOverdue,
      platformRevenue: transactions._sum.amount || 0,
      platformRevenueMonth: platformRevenueMonth._sum.amount || 0,
      totalCustomers: customers._count,
      activeCustomers: customers._count,
      lastCalculatedAt: new Date()
    }
  });
}
```

---

## 11. Deploy e Infraestrutura

### 11.1 Variáveis de Ambiente

```bash
# .env
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT
JWT_SECRET="seu_secret_super_seguro_aqui"
JWT_EXPIRES_IN="24h"

# Asaas
ASAAS_API_KEY="seu_api_key_asaas"
ASAAS_WALLET_ID="seu_wallet_id"
ASAAS_WEBHOOK_TOKEN="token_webhook"

# Email
MAILERSEND_API_KEY="seu_api_key_mailersend"
MAILERSEND_FROM_EMAIL="noreply@cobrancafacil.com"

# Encryption
ENCRYPTION_KEY="chave_32_bytes_para_criptografia"

# Frontend URL
FRONTEND_URL="https://app.cobrancafacil.com"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

### 11.2 Docker Compose (Desenvolvimento)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: cobrancafacil
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: cobrancafacil_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://cobrancafacil:dev_password@postgres:5432/cobrancafacil_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src

volumes:
  postgres_data:
```

---

### 11.3 Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

---

### 11.4 GitHub Actions CI/CD

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm i -g @railway/cli
          railway up
```

---

## 12. Checklist de Implementação

### Semana 1-2: Backend Core

- [ ] Setup projeto (Node + Express + Prisma)
- [ ] Configurar PostgreSQL (Supabase/Railway)
- [ ] Implementar schema Pris```

---

## 6. API Endpoints Detalhados

### 6.1 Estrutura Base da API

**Base URL**: `https://api.cobrancafacil.com/v1`

**Headers Padrão**:
```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

**Resposta Padrão de Sucesso**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

**Resposta Padrão de Erro**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email inválido",
    "details": {
      "field": "email",
      "value": "invalid"
    }
  }
}
```

### 6.2 Autenticação

#### POST `/auth/register`
Registrar novo tenant (profissional)

**Request Body**:
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "phone": "11999999999",
  "document": "12345678900",
  "businessType": "psicologo"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "asaasCustomerId": "cus_abc123",
      "onboardingDone": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Conta criada com sucesso"
}
```

**Fluxo Backend**:
1. Validar dados (Zod)
2. Verificar se email já existe
3. Hash da senha (bcrypt)
4. Criar subconta no Asaas via API
5. Criar registro Tenant no DB
6. Gerar JWT token
7. Retornar dados

---

#### POST `/auth/login`
Login de tenant existente

**Request Body**:
```json
{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tenant": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "onboardingDone": true
    }
  }
}
```

**Response 401** (credenciais inválidas):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email ou senha incorretos"
  }
}
```

---

#### POST `/auth/refresh`
Renovar token JWT

**Request Body**:
```json
{
  "refreshToken": "refresh_token_aqui"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "token": "novo_jwt_token"
  }
}
```

---

#### POST `/auth/logout`
Logout (invalidar token)

**Response 200**:
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

### 6.3 Clientes (Customers)

#### GET `/customers`
Listar todos os clientes do tenant

**Query Parameters**:
- `page` (opcional): número da página, default 1
- `limit` (opcional): itens por página, default 20
- `search` (opcional): buscar por nome ou email
- `isActive` (opcional): true/false

**Request**:
```http
GET /customers?page=1&limit=20&search=maria&isActive=true
Authorization: Bearer {token}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "name": "Maria Santos",
        "email": "maria@exemplo.com",
        "phone": "11988888888",
        "totalPaid": 450.00,
        "totalPending": 150.00,
        "totalOverdue": 0.00,
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

#### POST `/customers`
Criar novo cliente

**Request Body**:
```json
{
  "name": "Maria Santos",
  "email": "maria@exemplo.com",
  "phone": "11988888888",
  "document": "12345678900",
  "address": {
    "street": "Rua ABC",
    "number": "123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  },
  "notes": "Cliente preferencial"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Maria Santos",
    "email": "maria@exemplo.com",
    "phone": "11988888888",
    "isActive": true,
    "createdAt": "2025-10-01T10:00:00Z"
  },
  "message": "Cliente criado com sucesso"
}
```

**Response 400** (email duplicado):
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "Já existe um cliente com este email"
  }
}
```

---

#### GET `/customers/:id`
Obter detalhes de um cliente

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Maria Santos",
    "email": "maria@exemplo.com",
    "phone": "11988888888",
    "document": "12345678900",
    "address": { ... },
    "notes": "Cliente preferencial",
    "totalPaid": 1500.00,
    "totalPending": 150.00,
    "totalOverdue": 0.00,
    "subscriptions": [
      {
        "id": "uuid",
        "description": "Consulta mensal",
        "amount": 150.00,
        "status": "ACTIVE",
        "nextBillingDate": "2025-11-01"
      }
    ],
    "recentInvoices": [
      {
        "id": "uuid",
        "invoiceNumber": "INV-2025-001",
        "amount": 150.00,
        "status": "PAID",
        "paidDate": "2025-10-10"
      }
    ],
    "stats": {
      "totalInvoices": 12,
      "paidInvoices": 10,
      "overdueInvoices": 0,
      "averagePaymentTime": 2.5
    }
  }
}
```

---

#### PUT `/customers/:id`
Atualizar dados do cliente

**Request Body**:
```json
{
  "name": "Maria Santos Silva",
  "phone": "11977777777",
  "notes": "Atualização de contato"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Maria Santos Silva",
    "email": "maria@exemplo.com",
    "phone": "11977777777",
    "updatedAt": "2025-10-01T15:30:00Z"
  },
  "message": "Cliente atualizado com sucesso"
}
```

---

#### DELETE `/customers/:id`
Desativar cliente (soft delete)

**Response 200**:
```json
{
  "success": true,
  "message": "Cliente desativado com sucesso"
}
```

---

### 6.4 Assinaturas (Subscriptions)

#### GET `/subscriptions`
Listar assinaturas do tenant

**Query Parameters**:
- `page`, `limit`
- `status`: ACTIVE, PAUSED, CANCELED, OVERDUE
- `customerId`: filtrar por cliente

**Response 200**:
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "customer": {
          "id": "uuid",
          "name": "Maria Santos"
        },
        "description": "Consulta mensal",
        "amount": 150.00,
        "billingCycle": "MONTHLY",
        "paymentMethod": "PIX",
        "status": "ACTIVE",
        "nextBillingDate": "2025-11-01",
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### POST `/subscriptions`
Criar nova assinatura

**Request Body**:
```json
{
  "customerId": "uuid",
  "description": "Consulta mensal",
  "amount": 150.00,
  "billingCycle": "MONTHLY",
  "paymentMethod": "PIX",
  "startDate": "2025-10-01",
  "installments": null
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "description": "Consulta mensal",
    "amount": 150.00,
    "billingCycle": "MONTHLY",
    "status": "ACTIVE",
    "nextBillingDate": "2025-11-01",
    "createdAt": "2025-10-01T10:00:00Z"
  },
  "message": "Assinatura criada com sucesso"
}
```

**Fluxo Backend**:
1. Validar dados
2. Verificar se cliente existe
3. Calcular nextBillingDate baseado em billingCycle
4. Criar Subscription no DB
5. Opcionalmente gerar primeira fatura imediatamente
6. Retornar dados

---

#### PUT `/subscriptions/:id`
Atualizar assinatura

**Request Body**:
```json
{
  "amount": 180.00,
  "status": "PAUSED"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount": 180.00,
    "status": "PAUSED",
    "updatedAt": "2025-10-01T15:00:00Z"
  },
  "message": "Assinatura atualizada"
}
```

---

#### DELETE `/subscriptions/:id`
Cancelar assinatura

**Response 200**:
```json
{
  "success": true,
  "message": "Assinatura cancelada com sucesso"
}
```

---

### 6.5 Faturas (Invoices)

#### GET `/invoices`
Listar faturas do tenant

**Query Parameters**:
- `page`, `limit`
- `status`: PENDING, PAID, OVERDUE, CANCELED
- `customerId`: filtrar por cliente
- `startDate`, `endDate`: filtrar por período

**Response 200**:
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "uuid",
        "invoiceNumber": "INV-2025-001",
        "customer": {
          "id": "uuid",
          "name": "Maria Santos"
        },
        "amount": 150.00,
        "platformFee": 2.25,
        "asaasFee": 0.00,
        "tenantReceives": 147.75,
        "dueDate": "2025-10-15",
        "status": "PENDING",
        "paymentLink": "https://pay.asaas.com/abc123",
        "createdAt": "2025-10-01T10:00:00Z"
      }
    ],
    "pagination": { ... },
    "summary": {
      "total": 4500.00,
      "pending": 1200.00,
      "paid": 3000.00,
      "overdue": 300.00
    }
  }
}
```

---

#### POST `/invoices`
Criar fatura manual (avulsa, sem assinatura)

**Request Body**:
```json
{
  "customerId": "uuid",
  "description": "Consulta avulsa",
  "amount": 200.00,
  "dueDate": "2025-10-30",
  "paymentMethod": "PIX"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-2025-042",
    "amount": 200.00,
    "platformFee": 3.00,
    "asaasFee": 0.00,
    "tenantReceives": 197.00,
    "dueDate": "2025-10-30",
    "status": "PENDING",
    "paymentLink": "https://pay.asaas.com/xyz789",
    "pixQrCode": "data:image/png;base64,...",
    "pixCopyPaste": "00020126580014br.gov.bcb.pix..."
  },
  "message": "Fatura criada com sucesso"
}
```

**Fluxo Backend**:
```javascript
// 1. Calcular valores
const platformFeeRate = 0.015;
const platformFee = amount * platformFeeRate;

let asaasFee = 0;
if (paymentMethod === 'BOLETO') asaasFee = 3.49;
if (paymentMethod === 'CREDIT_CARD') asaasFee = amount * 0.0499;

const tenantReceives = amount - platformFee - asaasFee;

// 2. Gerar invoiceNumber
const count = await prisma.invoice.count();
const invoiceNumber = `INV-2025-${String(count + 1).padStart(4, '0')}`;

// 3. Criar cobrança no Asaas com split
const asaasCharge = await asaas.createCharge({
  customer: customer.asaasCustomerId,
  billingType: paymentMethod,
  value: amount,
  dueDate: dueDate,
  split: [{
    walletId: process.env.ASAAS_WALLET_ID,
    fixedValue: platformFee
  }]
});

// 4. Salvar no banco
const invoice = await prisma.invoice.create({
  data: {
    tenantId,
    customerId,
    invoiceNumber,
    amount,
    platformFee,
    asaasFee,
    tenantReceives,
    dueDate,
    status: 'PENDING',
    asaasChargeId: asaasCharge.id,
    paymentLink: asaasCharge.invoiceUrl,
    pixQrCode: asaasCharge.pixQrCode,
    pixCopyPaste: asaasCharge.pixCopyPaste
  }
});

// 5. Enviar notificação
await sendNotification({
  type: 'INVOICE_CREATED',
  customerId,
  invoiceId: invoice.id
});
```

---

#### GET `/invoices/:id`
Detalhes de uma fatura

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-2025-001",
    "customer": {
      "id": "uuid",
      "name": "Maria Santos",
      "email": "maria@exemplo.com",
      "phone": "11988888888"
    },
    "subscription": {
      "id": "uuid",
      "description": "Consulta mensal"
    },
    "amount": 150.00,
    "platformFee": 2.25,
    "asaasFee": 0.00,
    "tenantReceives": 147.75,
    "dueDate": "2025-10-15",
    "paidDate": null,
    "status": "PENDING",
    "paymentLink": "https://pay.asaas.com/abc123",
    "pixQrCode": "data:image/png;base64,...",
    "pixCopyPaste": "00020126580014br.gov.bcb.pix...",
    "payments": [],
    "notifications": [
      {
        "type": "INVOICE_CREATED",
        "channel": "EMAIL",
        "status": "SENT",
        "sentAt": "2025-10-01T10:05:00Z"
      }
    ],
    "timeline": [
      {
        "date": "2025-10-01T10:00:00Z",
        "event": "Fatura criada"
      },
      {
        "date": "2025-10-01T10:05:00Z",
        "event": "Email enviado para cliente"
      }
    ]
  }
}
```

---

#### PUT `/invoices/:id/cancel`
Cancelar fatura

**Response 200**:
```json
{
  "success": true,
  "message": "Fatura cancelada com sucesso"
}
```

**Fluxo Backend**:
1. Verificar se fatura já foi paga
2. Cancelar cobrança no Asaas
3. Atualizar status no DB
4. Enviar notificação (opcional)

---

#### POST `/invoices/:id/resend`
Reenviar notificação de cobrança

**Request Body**:
```json
{
  "channel": "EMAIL"
}
```

**Response 200**:
```json
{
  "success": true,
  "message": "Notificação reenviada com sucesso"
}
```

---

### 6.6 Pagamentos (Payments)

#### GET `/payments`
Listar pagamentos recebidos

**Query Parameters**:
- `page`, `limit`
- `status`: PENDING, CONFIRMED, FAILED
- `startDate`, `endDate`
- `customerId`

**Response 200**:
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "invoice": {
          "id": "uuid",
          "invoiceNumber": "INV-2025-001"
        },
        "customer": {
          "id": "uuid",
          "name": "Maria Santos"
        },
        "amount": 150.00,
        "paymentMethod": "PIX",
        "status": "CONFIRMED",
        "paymentDate": "2025-10-10T14:30:00Z",
        "confirmedAt": "2025-10-10T14:30:05Z"
      }
    ],
    "pagination": { ... },
    "summary": {
      "totalReceived": 3000.00,
      "totalPending": 1200.00,
      "count": 15
    }
  }
}
```

---

#### GET `/payments/:id`
Detalhes de um pagamento

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice": {
      "id": "uuid",
      "invoiceNumber": "INV-2025-001",
      "amount": 150.00
    },
    "customer": {
      "id": "uuid",
      "name": "Maria Santos"
    },
    "amount": 150.00,
    "paymentMethod": "PIX",
    "status": "CONFIRMED",
    "paymentDate": "2025-10-10T14:30:00Z",
    "confirmedAt": "2025-10-10T14:30:05Z",
    "asaasPaymentId": "pay_abc123",
    "breakdown": {
      "grossAmount": 150.00,
      "platformFee": 2.25,
      "asaasFee": 0.00,
      "netAmount": 147.75
    }
  }
}
```

---

### 6.7 Dashboard & Métricas

#### GET `/dashboard/overview`
Visão geral do tenant

**Response 200**:
```json
{
  "success": true,
  "data": {
    "customers": {
      "total": 45,
      "active": 42,
      "inactive": 3
    },
    "subscriptions": {
      "total": 38,
      "active": 35,
      "paused": 2,
      "overdue": 1
    },
    "invoices": {
      "total": 240,
      "pending": 15,
      "paid": 220,
      "overdue": 5,
      "thisMonth": {
        "total": 20,
        "paid": 18,
        "pending": 2
      }
    },
    "revenue": {
      "grossThisMonth": 5400.00,
      "netThisMonth": 5265.00,
      "platformFeesThisMonth": 81.00,
      "asaasFeesThisMonth": 54.00,
      "lastMonth": 5100.00,
      "growth": 5.88,
      "yearToDate": 48600.00
    },
    "upcomingInvoices": [
      {
        "id": "uuid",
        "customer": "Maria Santos",
        "amount": 150.00,
        "dueDate": "2025-10-05",
        "daysUntilDue": 4
      }
    ],
    "overdueInvoices": [
      {
        "id": "uuid",
        "customer": "João Pedro",
        "amount": 150.00,
        "dueDate": "2025-09-25",
        "daysOverdue": 5
      }
    ]
  }
}
```

---

#### GET `/dashboard/revenue`
Gráfico de receita

**Query Parameters**:
- `period`: last7days, last30days, last12months

**Response 200**:
```json
{
  "success": true,
  "data": {
    "period": "last12months",
    "data": [
      {
        "month": "2024-10",
        "grossRevenue": 4200.00,
        "netRevenue": 4095.00,
        "platformFees": 63.00,
        "asaasFees": 42.00,
        "invoices": 18
      },
      {
        "month": "2024-11",
        "grossRevenue": 4500.00,
        "netRevenue": 4387.50,
        "platformFees": 67.50,
        "asaasFees": 45.00,
        "invoices": 19
      }
    ],
    "totals": {
      "grossRevenue": 54000.00,
      "netRevenue": 52650.00,
      "platformFees": 810.00,
      "asaasFees": 540.00
    }
  }
}
```

---

### 6.8 Webhooks

#### POST `/webhooks/asaas`
Receber eventos do Asaas

**Request Headers**:
```http
Content-Type: application/json
asaas-access-token: {token_from_asaas}
```

**Request Body** (exemplo PAYMENT_CONFIRMED):
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_abc123",
    "customer": "cus_xyz789",
    "billingType": "PIX",
    "value": 150.00,
    "netValue": 147.75,
    "status": "RECEIVED",
    "paymentDate": "2025-10-10",
    "confirmedDate": "2025-10-10T14:30:05Z",
    "externalReference": "invoice_uuid"
  }
}
```

**Response 200**:
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Fluxo Backend**:
```javascript
// 1. Validar assinatura do webhook
if (!validateAsaasSignature(req)) {
  return res.status(401).json({ error: 'Invalid signature' });
}

// 2. Salvar evento
await prisma.webhookEvent.create({
  data: {
    provider: 'asaas',
    eventType: event,
    eventId: payment.id,
    payload: req.body,
    processed: false
  }
});

// 3. Buscar invoice
const invoice = await prisma.invoice.findUnique({
  where: { asaasChargeId: payment.id }
});

// 4. Processar em transaction
await prisma.$transaction(async (tx) => {
  // Atualizar invoice
  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paidDate: new Date(payment.paymentDate),
      asaasPaymentId: payment.id
    }
  });
  
  // Criar payment
  await tx.payment.create({
    data: {
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      amount: payment.value,
      paymentMethod: payment.billingType,
      status: 'CONFIRMED',
      paymentDate: new Date(payment.paymentDate),
      asaasPaymentId: payment.id
    }
  });
  
  // Criar transaction (nossa receita)
  await tx.transaction.create({
    data: {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      type: 'PLATFORM_FEE',
      amount: invoice.platformFee,
      percentage: 1.5,
      baseAmount: invoice.amount,
      status: 'COMPLETED',
      processedAt: new Date()
    }
  });
  
  // Atualizar customer stats
  await tx.customer.update({
    where: { id: invoice.customerId },
    data: {
      totalPaid: { increment: invoice.amount },
      totalPending: { decrement: invoice.amount }
    }
  });
});

// 5. Enviar notificação
await sendNotification({
  type: 'PAYMENT_RECEIVED',
  tenantId: invoice.tenantId,
  customerId: invoice.customerId,
  invoiceId: invoice.id
});

// 6. Marcar webhook como processado
await prisma.webhookEvent.update({
  where: { id: webhookEvent.id },
  data: {
    processed: true,
    processedAt: new Date()
  }
});
```

---

### 6.9 Configurações

#### GET `/settings`
Obter configurações do tenant

**Response 200**:
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "phone": "11999999999",
      "businessType": "psicologo",
      "feePercentage": 1.5,
      "onboardingDone": true
    },
    "notifications": {
      "emailNotifications": true,
      "whatsappNotifications": false,
      "smsNotifications": false,
      "reminderDaysBefore": 3
    },
    "asaas": {
      "connected": true,
      "customerId": "cus_abc123"
    }
  }
}
```

---

#### PUT `/settings`
Atualizar configurações

**Request Body**:
```json
{
  "name": "João Silva Santos",
  "phone": "11988888888",
  "notifications": {
    "reminderDaysBefore": 5,
    "whatsappNotifications": true
  }
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "name": "João Silva Santos",
    "phone": "11988888888",
    "updatedAt": "2025-10-01T16:00:00Z"
  },
  "message": "Configurações atualizadas"
}
```

---

### 6.10 Transações (Nossa Receita)

#### GET `/admin/transactions`
**Endpoint administrativo** - listar nossa receita

**Headers**:
```http
Authorization: Bearer {admin_token}
```

**Query Parameters**:
- `page`, `limit`
- `tenantId`: filtrar por tenant específico
- `status`: PENDING, COMPLETED
- `startDate`, `endDate`

**Response 200**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "tenant": {
          "id": "uuid",
          "name": "João Silva"
        },
        "invoice": {
          "id": "uuid",
          "invoiceNumber": "INV-2025-001"
        },
        "type": "PLATFORM_FEE",
        "amount": 2.25,
        "percentage": 1.5,
        "baseAmount": 150.00,
        "status": "COMPLETED",
        "processedAt": "2025-10-10T14:30:05Z"
      }
    ],
    "pagination": { ... },
    "summary": {
      "totalRevenue": 15000.00,
      "completedTransactions": 1000,
      "pendingTransactions": 50,
      "averageTransactionValue": 2.25
    }
  }
}
```

---

## 7. Integrações Externas

### 7.1 Asaas API

**Base URL**: `https://api.asaas.com/v3`

**Autenticação**:
```http
access_token: {asaas_api_key}
```

#### 7.1.1 Criar Subconta

**POST** `/accounts`

**Request**:
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "cpfCnpj": "12345678900",
  "mobilePhone": "11999999999",
  "birthDate": "1990-01-15",
  "companyType": "INDIVIDUAL"
}
```

**Response**:
```json
{
  "object": "account",
  "id": "cus_abc123",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "walletId": "wallet_xyz789"
}
```

---

#### 7.1.2# Documentação Técnica Completa - CobrançaFácil
## Sistema de Cobranças Recorrentes com Modelo Transacional (1,5%)

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura e Stack Tecnológica](#2-arquitetura-e-stack-tecnológica)
3. [Modelo de Dados (UML)](#3-modelo-de-dados-uml)
4. [Schema Prisma Completo](#4-schema-prisma-completo)
5. [Fluxogramas de Processos](#5-fluxogramas-de-processos)
6. [API Endpoints Detalhados](#6-api-endpoints-detalhados)
7. [Integrações Externas](#7-integrações-externas)
8. [Fluxo de Dados Completo](#8-fluxo-de-dados-completo)
9. [Segurança e Autenticação](#9-segurança-e-autenticação)
10. [Jobs e Automações](#10-jobs-e-automações)

---

## 1. Visão Geral do Sistema

### 1.1 Descrição

CobrançaFácil é uma plataforma SaaS que atua como **camada de experiência** sobre o Asaas, simplificando radicalmente a gestão de cobranças recorrentes para autônomos e microempreendedores.

### 1.2 Modelo de Negócio

```
Autônomo usa CobrançaFácil → Cliente paga via Asaas → Split automático:
  - Asaas cobra suas taxas (PIX grátis, boleto R$ 3,49, etc)
  - CobrançaFácil cobra 1,5% sobre o valor total
  - Autônomo recebe o líquido em sua conta Asaas
```

### 1.3 Proposta de Valor

- Interface mobile-first extremamente simples
- Zero mensalidade fixa (apenas 1,5% transacional)
- Onboarding em 3 minutos vs 30-60min do Asaas direto
- Automação total de cobranças recorrentes

---

## 2. Arquitetura e Stack Tecnológica

### 2.1 Arquitetura Geral

```mermaid
graph TB
    subgraph "Frontend"
        A[React App Mobile-First]
        B[PWA]
        C[App Nativo futuro]
    end
    
    subgraph "Backend API"
        D[Node.js + Express]
        E[Authentication JWT]
        F[Business Logic]
    end
    
    subgraph "Banco de Dados"
        G[(PostgreSQL)]
        H[Prisma ORM]
    end
    
    subgraph "Integrações"
        I[Asaas API]
        J[Email MailerSend]
        K[WhatsApp futuro]
    end
    
    subgraph "Jobs/Workers"
        L[Cron Jobs]
        M[Webhook Handlers]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
    F --> H
    H --> G
    F --> I
    F --> J
    F --> K
    I --> M
    L --> F
```

### 2.2 Stack Detalhada

**Frontend**
- React 18+ com TypeScript
- TailwindCSS para estilização
- React Router para navegação
- Lucide React para ícones
- Axios para requisições HTTP

**Backend**
- Node.js 20+ LTS
- Express.js
- Prisma ORM
- JWT para autenticação
- Zod para validação

**Banco de Dados**
- PostgreSQL 15+
- Hospedagem: Supabase, Neon ou Railway

**Infraestrutura**
- Frontend: Vercel
- Backend: Railway ou Render
- CI/CD: GitHub Actions

---

## 3. Modelo de Dados (UML)

### 3.1 Diagrama UML Completo

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "tem"
    TENANTS ||--o{ CUSTOMERS : "possui"
    TENANTS ||--o{ SUBSCRIPTIONS : "cria"
    TENANTS ||--o{ INVOICES : "emite"
    TENANTS ||--o{ PAYMENTS : "recebe"
    TENANTS ||--o{ TRANSACTIONS : "gera_receita"
    TENANTS ||--|| FINANCIAL_SUMMARY : "resume"
    
    CUSTOMERS ||--o{ SUBSCRIPTIONS : "assina"
    CUSTOMERS ||--o{ INVOICES : "deve_pagar"
    CUSTOMERS ||--o{ PAYMENTS : "paga"
    CUSTOMERS ||--o{ NOTIFICATIONS : "recebe"
    
    SUBSCRIPTIONS ||--o{ INVOICES : "gera"
    
    INVOICES ||--o{ PAYMENTS : "recebe"
    INVOICES ||--o{ TRANSACTIONS : "origina"
    INVOICES ||--o{ NOTIFICATIONS : "dispara"
    
    TENANTS {
        uuid id PK
        string email UK
        string name
        string asaasCustomerId UK
        string asaasApiKey
        decimal feePercentage
        boolean isActive
        timestamp createdAt
    }
    
    USERS {
        uuid id PK
        uuid tenantId FK
        string email UK
        string passwordHash
        enum role
        timestamp lastLoginAt
    }
    
    CUSTOMERS {
        uuid id PK
        uuid tenantId FK
        string name
        string email
        string phone
        decimal totalPaid
        decimal totalPending
        boolean isActive
    }
    
    SUBSCRIPTIONS {
        uuid id PK
        uuid tenantId FK
        uuid customerId FK
        decimal amount
        enum billingCycle
        enum paymentMethod
        enum status
        date nextBillingDate
    }
    
    INVOICES {
        uuid id PK
        uuid tenantId FK
        uuid customerId FK
        uuid subscriptionId FK
        string invoiceNumber UK
        decimal amount
        decimal platformFee
        decimal asaasFee
        decimal tenantReceives
        date dueDate
        enum status
        string asaasChargeId UK
        string paymentLink
    }
    
    PAYMENTS {
        uuid id PK
        uuid invoiceId FK
        uuid tenantId FK
        uuid customerId FK
        decimal amount
        enum paymentMethod
        enum status
        timestamp paymentDate
        string asaasPaymentId UK
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid tenantId FK
        uuid invoiceId FK
        enum type
        decimal amount
        decimal percentage
        decimal baseAmount
        enum status
        timestamp processedAt
    }
    
    NOTIFICATIONS {
        uuid id PK
        uuid tenantId FK
        uuid customerId FK
        uuid invoiceId FK
        enum type
        enum channel
        string recipient
        string message
        enum status
        timestamp sentAt
    }
    
    FINANCIAL_SUMMARY {
        uuid id PK
        uuid tenantId FK UK
        decimal totalRevenue
        decimal monthlyRevenue
        decimal platformRevenue
        int totalInvoices
        int paidInvoices
        timestamp lastCalculatedAt
    }
```

### 3.2 Relacionamentos Principais

**1-para-N (One-to-Many)**
- 1 Tenant → N Users
- 1 Tenant → N Customers
- 1 Tenant → N Invoices
- 1 Customer → N Subscriptions
- 1 Subscription → N Invoices
- 1 Invoice → N Payments (em casos de pagamento parcial)

**1-para-1 (One-to-One)**
- 1 Tenant → 1 FinancialSummary

**Constraints Importantes**
- `Customers.email` é único por `tenantId` (multi-tenancy)
- `Invoices.invoiceNumber` é globalmente único
- `Invoices.asaasChargeId` é globalmente único
- Cascade delete em `Tenant` remove todos dados relacionados

---

## 4. Schema Prisma Completo

```prisma
// Schema otimizado para PostgreSQL
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// TENANTS
// ============================================
model Tenant {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  phone       String?
  document    String?
  
  businessName String? @map("business_name")
  businessType String? @map("business_type")
  
  // Integração Asaas
  asaasCustomerId String?  @unique @map("asaas_customer_id")
  asaasApiKey     String?  @map("asaas_api_key")
  asaasWalletId   String?  @map("asaas_wallet_id")
  
  // Configurações
  feePercentage   Decimal  @default(1.5) @map("fee_percentage") @db.Decimal(5, 2)
  autoCharge      Boolean  @default(true) @map("auto_charge")
  
  // Notificações
  emailNotifications     Boolean @default(true) @map("email_notifications")
  whatsappNotifications  Boolean @default(false) @map("whatsapp_notifications")
  reminderDaysBefore     Int     @default(3) @map("reminder_days_before")
  
  isActive        Boolean  @default(true) @map("is_active")
  onboardingDone  Boolean  @default(false) @map("onboarding_done")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")

  users         User[]
  customers     Customer[]
  subscriptions Subscription[]
  invoices      Invoice[]
  transactions  Transaction[]
  payments      Payment[]
  notifications Notification[]
  auditLogs     AuditLog[]
  financialSummary FinancialSummary?

  @@index([email])
  @@index([asaasCustomerId])
  @@index([isActive])
  @@map("tenants")
}

// ============================================
// USERS
// ============================================
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  role         UserRole @default(USER)
  tenantId     String   @map("tenant_id")
  isActive     Boolean  @default(true) @map("is_active")
  
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([email])
  @@index([tenantId])
  @@map("users")
}

enum UserRole {
  ADMIN
  USER
}

// ============================================
// CUSTOMERS
// ============================================
model Customer {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  
  name      String
  email     String
  phone     String?
  document  String?
  address   Json?
  
  totalPaid       Decimal @default(0) @map("total_paid") @db.Decimal(10, 2)
  totalPending    Decimal @default(0) @map("total_pending") @db.Decimal(10, 2)
  totalOverdue    Decimal @default(0) @map("total_overdue") @db.Decimal(10, 2)
  
  isActive  Boolean  @default(true) @map("is_active")
  notes     String?  @db.Text
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]
  invoices      Invoice[]
  payments      Payment[]
  notifications Notification[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([tenantId, isActive])
  @@map("customers")
}

// ============================================
// SUBSCRIPTIONS
// ============================================
model Subscription {
  id             String            @id @default(uuid())
  tenantId       String            @map("tenant_id")
  customerId     String            @map("customer_id")
  
  description    String?
  amount         Decimal           @db.Decimal(10, 2)
  billingCycle   BillingCycle      @map("billing_cycle")
  paymentMethod  PaymentMethod     @map("payment_method")
  status         SubscriptionStatus @default(ACTIVE)
  
  startDate       DateTime @default(now()) @map("start_date")
  nextBillingDate DateTime? @map("next_billing_date")
  lastBillingDate DateTime? @map("last_billing_date")
  endDate         DateTime? @map("end_date")
  
  installments   Int?
  metadata       Json?
  
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer  @relation(fields: [customerId], references: [id], onDelete: Restrict)
  invoices Invoice[]

  @@index([tenantId])
  @@index([customerId])
  @@index([tenantId, status])
  @@index([nextBillingDate])
  @@map("subscriptions")
}

enum BillingCycle {
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  BIANNUAL
  ANNUAL
}

enum PaymentMethod {
  PIX
  BOLETO
  CREDIT_CARD
  DEBIT_CARD
}

enum SubscriptionStatus {
  ACTIVE
  PAUSED
  CANCELED
  OVERDUE
}

// ============================================
// INVOICES
// ============================================
model Invoice {
  id             String        @id @default(uuid())
  tenantId       String        @map("tenant_id")
  subscriptionId String?       @map("subscription_id")
  customerId     String        @map("customer_id")
  
  invoiceNumber  String        @unique @map("invoice_number")
  description    String?
  
  // Breakdown de valores
  amount         Decimal       @db.Decimal(10, 2)
  tenantReceives Decimal       @db.Decimal(10, 2) @map("tenant_receives")
  platformFee    Decimal       @db.Decimal(10, 2) @map("platform_fee")
  asaasFee       Decimal       @default(0) @db.Decimal(10, 2) @map("asaas_fee")
  
  dueDate        DateTime      @map("due_date")
  paidDate       DateTime?     @map("paid_date")
  status         InvoiceStatus @default(PENDING)
  
  // Links de pagamento
  paymentLink    String?       @map("payment_link") @db.Text
  pixQrCode      String?       @map("pix_qr_code") @db.Text
  pixCopyPaste   String?       @map("pix_copy_paste") @db.Text
  boletoUrl      String?       @map("boleto_url") @db.Text
  boletoBarcode  String?       @map("boleto_barcode")
  
  // IDs Asaas
  asaasChargeId  String?       @unique @map("asaas_charge_id")
  asaasPaymentId String?       @map("asaas_payment_id")
  
  metadata       Json?
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  subscription  Subscription?  @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  customer      Customer       @relation(fields: [customerId], references: [id], onDelete: Restrict)
  payments      Payment[]
  transactions  Transaction[]
  notifications Notification[]

  @@index([tenantId])
  @@index([customerId])
  @@index([subscriptionId])
  @@index([tenantId, status])
  @@index([dueDate])
  @@index([status, dueDate])
  @@index([asaasChargeId])
  @@map("invoices")
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
  CANCELED
  REFUNDED
  PARTIALLY_PAID
}

// ============================================
// PAYMENTS
// ============================================
model Payment {
  id            String        @id @default(uuid())
  invoiceId     String        @map("invoice_id")
  tenantId      String        @map("tenant_id")
  customerId    String        @map("customer_id")
  
  amount        Decimal       @db.Decimal(10, 2)
  paymentMethod PaymentMethod @map("payment_method")
  status        PaymentStatus @default(PENDING)
  
  paymentDate   DateTime?     @map("payment_date")
  confirmedAt   DateTime?     @map("confirmed_at")
  
  asaasPaymentId String?      @unique @map("asaas_payment_id")
  metadata      Json?
  
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  invoice  Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)

  @@index([invoiceId])
  @@index([tenantId])
  @@index([customerId])
  @@index([tenantId, status])
  @@index([asaasPaymentId])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
  REFUNDED
  CHARGEBACK
}

// ============================================
// TRANSACTIONS (Nossa receita)
// ============================================
model Transaction {
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")
  invoiceId   String?   @map("invoice_id")
  
  type        TransactionType
  amount      Decimal   @db.Decimal(10, 2)
  percentage  Decimal   @db.Decimal(5, 2)
  baseAmount  Decimal   @db.Decimal(10, 2) @map("base_amount")
  
  status      TransactionStatus @default(PENDING)
  processedAt DateTime? @map("processed_at")
  paidAt      DateTime? @map("paid_at")
  
  description String?
  metadata    Json?
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  tenant  Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoice Invoice? @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([invoiceId])
  @@index([tenantId, status])
  @@index([type])
  @@index([status, createdAt])
  @@map("transactions")
}

enum TransactionType {
  PLATFORM_FEE
  REFUND
  ADJUSTMENT
  BONUS
}

enum TransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

// ============================================
// NOTIFICATIONS
// ============================================
model Notification {
  id         String             @id @default(uuid())
  tenantId   String             @map("tenant_id")
  customerId String?            @map("customer_id")
  invoiceId  String?            @map("invoice_id")
  
  type       NotificationType
  channel    NotificationChannel
  recipient  String
  subject    String?
  message    String @db.Text
  
  status     NotificationStatus @default(PENDING)
  sentAt     DateTime? @map("sent_at")
  deliveredAt DateTime? @map("delivered_at")
  
  errorMessage String? @map("error_message") @db.Text
  retryCount   Int     @default(0) @map("retry_count")
  metadata   Json?
  
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  invoice  Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([customerId])
  @@index([invoiceId])
  @@index([status])
  @@map("notifications")
}

enum NotificationType {
  INVOICE_CREATED
  INVOICE_DUE_SOON
  INVOICE_OVERDUE
  PAYMENT_RECEIVED
  PAYMENT_FAILED
  SUBSCRIPTION_RENEWED
  SUBSCRIPTION_CANCELED
  WELCOME
  PASSWORD_RESET
}

enum NotificationChannel {
  EMAIL
  WHATSAPP
  SMS
  PUSH
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  SCHEDULED
}

// ============================================
// AUDIT LOGS
// ============================================
model AuditLog {
  id        String   @id @default(uuid())
  tenantId  String?  @map("tenant_id")
  userId    String?  @map("user_id")
  
  action    AuditAction
  entity    String
  entityId  String @map("entity_id")
  changes   Json?
  
  ipAddress String? @map("ip_address")
  userAgent String? @map("user_agent") @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([entity, entityId])
  @@map("audit_logs")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  PAYMENT_RECEIVED
  INVOICE_SENT
  SETTINGS_CHANGED
}

// ============================================
// WEBHOOK EVENTS
// ============================================
model WebhookEvent {
  id            String   @id @default(uuid())
  tenantId      String?  @map("tenant_id")
  
  provider      String
  eventType     String   @map("event_type")
  eventId       String?  @map("event_id")
  payload       Json
  
  processed     Boolean  @default(false)
  processedAt   DateTime? @map("processed_at")
  errorMessage  String?  @map("error_message") @db.Text
  retryCount    Int      @default(0) @map("retry_count")
  
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([provider, eventId])
  @@index([tenantId])
  @@index([processed])
  @@map("webhook_events")
}

// ============================================
// FINANCIAL SUMMARY
// ============================================
model FinancialSummary {
  id                String   @id @default(uuid())
  tenantId          String   @unique @map("tenant_id")
  
  totalRevenue      Decimal  @default(0) @map("total_revenue") @db.Decimal(10, 2)
  monthlyRevenue    Decimal  @default(0) @map("monthly_revenue") @db.Decimal(10, 2)
  
  totalInvoices     Int      @default(0) @map("total_invoices")
  paidInvoices      Int      @default(0) @map("paid_invoices")
  pendingInvoices   Int      @default(0) @map("pending_invoices")
  overdueInvoices   Int      @default(0) @map("overdue_invoices")
  
  totalPaid         Decimal  @default(0) @map("total_paid") @db.Decimal(10, 2)
  totalPending      Decimal  @default(0) @map("total_pending") @db.Decimal(10, 2)
  totalOverdue      Decimal  @default(0) @map("total_overdue") @db.Decimal(10, 2)
  
  platformRevenue   Decimal  @default(0) @map("platform_revenue") @db.Decimal(10, 2)
  platformRevenueMonth Decimal @default(0) @map("platform_revenue_month") @db.Decimal(10, 2)
  
  totalCustomers    Int      @default(0) @map("total_customers")
  activeCustomers   Int      @default(0) @map("active_customers")
  
  lastCalculatedAt  DateTime @default(now()) @map("last_calculated_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("financial_summary")
}
```

---

## 5. Fluxogramas de Processos

### 5.1 Fluxo Completo: Onboarding até Pagamento

```mermaid
flowchart TD
    Start([Autônomo acessa site]) --> Register[Cadastro no CobrançaFácil]
    Register --> CreateAsaasAccount{Criar subconta Asaas}
    CreateAsaasAccount -->|Sucesso| SaveAsaasId[Salvar asaasCustomerId]
    CreateAsaasAccount -->|Erro| RetryAsaas[Retry ou suporte]
    
    SaveAsaasId --> Dashboard[Dashboard liberado]
    Dashboard --> AddClient[Adicionar cliente]
    AddClient --> CreateSubscription[Criar assinatura]
    
    CreateSubscription --> CronJob{Cron diário verifica nextBillingDate}
    CronJob -->|Data chegou| GenerateInvoice[Gerar fatura]
    
    GenerateInvoice --> CalculateFees[Calcular valores:<br/>amount, platformFee,<br/>asaasFee, tenantReceives]
    
    CalculateFees --> CreateAsaasCharge[Criar cobrança no Asaas<br/>com split 1.5%]
    
    CreateAsaasCharge -->|Sucesso| SaveInvoice[(Salvar Invoice no DB)]
    CreateAsaasCharge -->|Erro| LogError[Log erro + retry]
    
    SaveInvoice --> SendNotification[Enviar email/SMS<br/>para cliente]
    
    SendNotification --> WaitPayment{Cliente paga?}
    
    WaitPayment -->|Sim| AsaasWebhook[Webhook Asaas:<br/>PAYMENT_CONFIRMED]
    WaitPayment -->|Vence| MarkOverdue[Marcar OVERDUE]
    
    AsaasWebhook --> UpdateInvoice[Atualizar Invoice:<br/>status=PAID,<br/>paidDate=now]
    
    UpdateInvoice --> CreatePayment[(Criar Payment)]
    CreatePayment --> CreateTransaction[(Criar Transaction:<br/>type=PLATFORM_FEE,<br/>amount=1.5%)]
    
    CreateTransaction --> NotifyTenant[Notificar autônomo:<br/>Pagamento recebido]
    
    NotifyTenant --> UpdateSummary[Atualizar FinancialSummary]
    UpdateSummary --> End([Fim do ciclo])
    
    MarkOverdue --> SendOverdueNotification[Enviar lembrete]
    SendOverdueNotification --> WaitPayment
```

### 5.2 Fluxo de Autenticação e Segurança

```mermaid
flowchart TD
    Start([Usuário acessa app]) --> HasToken{Tem JWT válido?}
    
    HasToken -->|Sim| ValidateToken[Validar token]
    ValidateToken -->|Válido| LoadUser[Carregar dados do Tenant]
    ValidateToken -->|Expirado| Login
    
    HasToken -->|Não| Login[Tela de Login]
    
    Login --> SubmitCredentials[Submeter email + senha]
    SubmitCredentials --> ValidateCredentials{Credenciais corretas?}
    
    ValidateCredentials -->|Não| ShowError[Mostrar erro]
    ShowError --> Login
    
    ValidateCredentials -->|Sim| GenerateJWT[Gerar JWT]
    GenerateJWT --> UpdateLastLogin[Atualizar lastLoginAt]
    UpdateLastLogin --> ReturnToken[Retornar token + user data]
    
    ReturnToken --> StoreToken[Armazenar token localStorage]
    StoreToken --> LoadUser
    
    LoadUser --> Dashboard[Dashboard]
    
    Dashboard --> APIRequest{Fazer request API}
    APIRequest --> AddAuthHeader[Adicionar header:<br/>Authorization: Bearer token]
    AddAuthHeader --> ServerValidate{Server valida JWT}
    
    ServerValidate -->|Inválido| Return401[HTTP 401 Unauthorized]
    Return401 --> ClearToken[Limpar token]
    ClearToken --> Login
    
    ServerValidate -->|Válido| ExtractTenantId[Extrair tenantId do token]
    ExtractTenantId --> ApplyTenantFilter[Aplicar filtro tenantId<br/>em todas queries]
    ApplyTenantFilter --> ExecuteQuery[(Executar query no DB)]
    ExecuteQuery --> ReturnData[Retornar dados]
```

### 5.3 Fluxo de Criação de Cobrança

```mermaid
flowchart TD
    Start([Autônomo clica<br/>'Criar Cobrança']) --> Form[Preencher formulário]
    
    Form --> Fields{Campos necessários}
    Fields --> SelectClient[Selecionar cliente]
    Fields --> InputAmount[Valor R$]
    Fields --> SelectMethod[Método de pagamento]
    Fields --> SelectDate[Data de vencimento]
    
    SelectClient --> Submit[Submeter formulário]
    InputAmount --> Submit
    SelectMethod --> Submit
    SelectDate