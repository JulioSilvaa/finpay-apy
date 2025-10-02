# Micro SaaS: Cobranças Automáticas com PIX Parcelado

## 1. Resumo do Projeto

**Objetivo:**  
Criar um SaaS para autônomos e pequenos profissionais (psicólogos, consultores, professores, terapeutas, personal trainers) que automatize cobranças recorrentes via PIX parcelado, boleto ou cartão, sem precisar lidar diretamente com transações de terceiros.

**Diferencial:**  
- PIX parcelado integrado com notificações automáticas.  
- Controle em tempo real de pagamentos e inadimplência.  
- API simples para integração e painel web para gestão de clientes.

**Validação Inicial:**  
- Landing page para captar e-mails de interessados.  
- Perguntas de dor: cobrança manual, esquecimento, perda de controle.  
- Conversa com 5–10 profissionais por nicho.  
- Objetivo: validar interesse antes de desenvolver funcionalidades complexas.

**Monetização:**  
- Plano gratuito limitado (ex.: 5 clientes ativos).  
- Plano pago baseado no número de clientes ativos (ex.: até 100 clientes = R$ 49/mês).  
- Possibilidade de recursos adicionais pagos (WhatsApp, dashboard customizável).  
- Taxas de transação são cobradas pelas provedoras (Asaas, Juno, Gerencianet, Pagar.me), não pelo SaaS.

---

## 2. Arquitetura SaaS Multi-Tenant

**Multi-tenancy:**  
Cada profissional/autônomo é um tenant e tem seus próprios clientes, cobranças e configurações.  

**Stack recomendada:**  
- Frontend: React / Next.js  
- Backend: Node.js (Express/NestJS) ou Python (FastAPI)  
- Auth: Supabase Auth / Clerk / Auth0  
- Banco: PostgreSQL (Supabase) ou PlanetScale  
- Infraestrutura: Vercel / Railway / Render  
- Integração de pagamentos: Juno / Asaas / Stripe / Gerencianet  
- Notificações: MailerSend, WhatsApp API (Z-API, 360Dialog)  

**Segurança:**  
- HTTPS obrigatório  
- Isolamento por tenant_id  
- Tokens JWT com expiração  
- Dados sensíveis apenas o mínimo necessário  
- Backups diários e logs de auditoria  

---

## 3. Modelo de Dados (Multi-Tenant)

### Tabelas principais

**Users** (usuários do SaaS)  
- id (PK)  
- email  
- password_hash  
- tenant_id (FK → Tenants.id)  
- role (admin, usuário)  
- created_at, updated_at  

**Tenants** (profissional/autônomo)  
- id (PK)  
- name  
- email  
- subscription_plan (FK → SubscriptionPlans.id)  
- created_at, updated_at  

**Customers** (clientes do tenant)  
- id (PK)  
- tenant_id (FK → Tenants.id)  
- name  
- email  
- phone  
- created_at, updated_at  

**Subscriptions / Plans**  
- id (PK)  
- tenant_id (FK → Tenants.id)  
- customer_id (FK → Customers.id)  
- amount  
- billing_cycle (mensal, trimestral, anual)  
- payment_method (PIX, boleto, cartão)  
- status (ativo, cancelado, inadimplente)  
- created_at, updated_at  

**Invoices / Cobranças**  
- id (PK)  
- tenant_id (FK → Tenants.id)  
- subscription_id (FK → Subscriptions.id)  
- customer_id (FK → Customers.id)  
- amount  
- due_date  
- paid_date  
- status (pendente, pago, atrasado)  
- payment_link (gerado pelo provedor)  
- created_at, updated_at  

**Payments**  
- id (PK)  
- invoice_id (FK → Invoices.id)  
- tenant_id (FK → Tenants.id)  
- amount  
- payment_method  
- status (confirmado, falhado)  
- payment_date  
- created_at, updated_at  

**Notifications**  
- id (PK)  
- tenant_id (FK → Tenants.id)  
- customer_id (FK → Customers.id)  
- invoice_id (FK → Invoices.id)  
- type (e-mail, WhatsApp, SMS)  
- status (enviado, falhou)  
- sent_at  
- created_at, updated_at  

---

## 4. Diagrama UML Simplificado

```plaintext
+----------------+      +----------------+       +----------------+
|    Tenants     |1----*|     Users      |       |   Subscription |
+----------------+      +----------------+       +----------------+
| id             |      | id             |       | id             |
| name           |      | email          |       | tenant_id (FK) |
| email          |      | password_hash  |       | customer_id(FK)|
| subscription_plan|    | role           |       | amount         |
+----------------+      +----------------+       | billing_cycle  |
                                              | payment_method |
                                              | status         |
                                              +----------------+
             |1
             |
             *
+----------------+
|   Customers    |
+----------------+
| id             |
| tenant_id (FK) |
| name           |
| email          |
| phone          |
+----------------+
             |
             *
             |
+----------------+
|   Invoices     |
+----------------+
| id             |
| tenant_id(FK)  |
| subscription_id(FK)|
| customer_id(FK)|
| amount         |
| due_date       |
| paid_date      |
| status         |
| payment_link   |
+----------------+
             |
             *
             |
+----------------+
|   Payments     |
+----------------+
| id             |
| invoice_id(FK) |
| tenant_id(FK)  |
| amount         |
| payment_method |
| status         |
| payment_date   |
+----------------+
             |
             *
             |
+----------------+
| Notifications  |
+----------------+
| id             |
| tenant_id(FK)  |
| customer_id(FK)|
| invoice_id(FK) |
| type           |
| status         |
| sent_at        |
+----------------+
```

---

## 5. Índices Recomendados para Otimização de Performance

### 5.1. Tabela Users

```sql
-- Índice único para email (login)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Índice para busca por tenant
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Índice composto para consultas filtradas por tenant e role
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
```

**Justificativa:** Acelera autenticação, consultas por tenant e filtros de permissão.

---

### 5.2. Tabela Tenants

```sql
-- Índice único para email
CREATE UNIQUE INDEX idx_tenants_email ON tenants(email);

-- Índice para planos de assinatura
CREATE INDEX idx_tenants_subscription_plan ON tenants(subscription_plan);

-- Índice para ordenação por data de criação
CREATE INDEX idx_tenants_created_at ON tenants(created_at DESC);
```

**Justificativa:** Facilita busca de tenants, relatórios por plano e ordenação temporal.

---

### 5.3. Tabela Customers

```sql
-- Índice para isolamento multi-tenant (essencial)
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);

-- Índice único composto para evitar duplicatas de email por tenant
CREATE UNIQUE INDEX idx_customers_tenant_email ON customers(tenant_id, email);

-- Índice para busca por nome (com suporte a LIKE)
CREATE INDEX idx_customers_name ON customers(name);

-- Índice para busca por telefone
CREATE INDEX idx_customers_phone ON customers(phone);
```

**Justificativa:** Essencial para multi-tenancy, busca rápida de clientes e prevenção de duplicatas.

---

### 5.4. Tabela Subscriptions

```sql
-- Índice para isolamento multi-tenant
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);

-- Índice para buscar assinaturas de um cliente
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);

-- Índice composto para filtros comuns (tenant + status)
CREATE INDEX idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);

-- Índice para relatórios por método de pagamento
CREATE INDEX idx_subscriptions_payment_method ON subscriptions(payment_method);

-- Índice para ordenação por data
CREATE INDEX idx_subscriptions_created_at ON subscriptions(created_at DESC);
```

**Justificativa:** Otimiza listagem de assinaturas ativas, inadimplentes e relatórios gerenciais.

---

### 5.5. Tabela Invoices

```sql
-- Índice para isolamento multi-tenant (crítico)
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);

-- Índice para buscar faturas de um cliente
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);

-- Índice para buscar faturas de uma assinatura
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);

-- Índice composto para dashboards (tenant + status)
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);

-- Índice para vencimentos (crítico para jobs de cobrança)
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Índice composto para cobranças atrasadas
CREATE INDEX idx_invoices_status_due_date ON invoices(status, due_date) 
  WHERE status IN ('pendente', 'atrasado');

-- Índice para ordenação temporal
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
```

**Justificativa:** Performance crítica para jobs de cobrança automática, dashboards de inadimplência e relatórios.

---

### 5.6. Tabela Payments

```sql
-- Índice para buscar pagamentos de uma fatura
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- Índice para isolamento multi-tenant
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);

-- Índice para relatórios de pagamentos confirmados
CREATE INDEX idx_payments_status ON payments(status);

-- Índice composto para análise financeira (tenant + status + data)
CREATE INDEX idx_payments_tenant_status_date ON payments(tenant_id, status, payment_date DESC);

-- Índice para métricas por método de pagamento
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
```

**Justificativa:** Acelera reconciliação de pagamentos, relatórios financeiros e análises de conversão.

---

### 5.7. Tabela Notifications

```sql
-- Índice para isolamento multi-tenant
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);

-- Índice para buscar notificações de um cliente
CREATE INDEX idx_notifications_customer_id ON notifications(customer_id);

-- Índice para buscar notificações de uma fatura
CREATE INDEX idx_notifications_invoice_id ON notifications(invoice_id);

-- Índice composto para logs de envio (tenant + status + data)
CREATE INDEX idx_notifications_tenant_status_sent ON notifications(tenant_id, status, sent_at DESC);

-- Índice para análise por tipo de notificação
CREATE INDEX idx_notifications_type ON notifications(type);

-- Índice para retry de notificações falhas
CREATE INDEX idx_notifications_status ON notifications(status) 
  WHERE status = 'falhou';
```

**Justificativa:** Performance para logs de notificações, retry automático e relatórios de entregabilidade.

---

## 6. Índices Adicionais para Casos Específicos

### 6.1. Busca Full-Text (PostgreSQL)

Se você precisar fazer buscas por texto em nomes de clientes:

```sql
-- Índice GIN para busca full-text em nomes de clientes
CREATE INDEX idx_customers_name_gin ON customers USING gin(to_tsvector('portuguese', name));
```

### 6.2. Índices Parciais para Performance

Índices parciais reduzem o tamanho e melhoram a performance para consultas específicas:

```sql
-- Apenas assinaturas ativas (reduz tamanho do índice)
CREATE INDEX idx_subscriptions_active ON subscriptions(tenant_id, customer_id) 
  WHERE status = 'ativo';

-- Apenas faturas pendentes ou atrasadas
CREATE INDEX idx_invoices_pending ON invoices(tenant_id, due_date) 
  WHERE status IN ('pendente', 'atrasado');
```

### 6.3. Índices para Relatórios Agregados

```sql
-- Para cálculos de receita por tenant
CREATE INDEX idx_payments_tenant_confirmed ON payments(tenant_id, amount) 
  WHERE status = 'confirmado';

-- Para análise de inadimplência
CREATE INDEX idx_invoices_overdue ON invoices(tenant_id, amount, due_date) 
  WHERE status = 'atrasado';
```

---

## 7. Melhores Práticas de Indexação

### 7.1. Prioridades

1. **Tenant ID sempre indexado** - Essencial para multi-tenancy
2. **Foreign Keys** - Sempre criar índices nas chaves estrangeiras
3. **Campos de busca frequente** - Status, datas, emails
4. **Campos de ordenação** - created_at, due_date, payment_date

### 7.2. O que NÃO indexar

- Campos booleanos simples (poucos valores distintos)
- Tabelas muito pequenas (< 1000 registros)
- Campos raramente consultados
- Campos com alta cardinalidade em tabelas pequenas

### 7.3. Monitoramento

```sql
-- Verificar índices não utilizados (PostgreSQL)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_toast_%'
ORDER BY schemaname, tablename;

-- Verificar tamanho dos índices
SELECT schemaname, tablename, indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 7.4. Manutenção

```sql
-- Reindexar tabelas periodicamente (PostgreSQL)
REINDEX TABLE invoices;

-- Atualizar estatísticas
ANALYZE invoices;

-- Vacuum para limpar espaço
VACUUM ANALYZE invoices;
```

---

## 8. Considerações de Performance

### 8.1. Consultas Típicas Otimizadas

**Dashboard do Tenant:**
```sql
-- Lista faturas pendentes (usa idx_invoices_tenant_status)
SELECT * FROM invoices 
WHERE tenant_id = ? AND status = 'pendente'
ORDER BY due_date ASC;
```

**Job de Cobrança Automática:**
```sql
-- Busca faturas vencendo hoje (usa idx_invoices_status_due_date)
SELECT * FROM invoices 
WHERE status = 'pendente' AND due_date = CURRENT_DATE;
```

**Relatório Financeiro:**
```sql
-- Total pago por tenant no mês (usa idx_payments_tenant_status_date)
SELECT SUM(amount) FROM payments 
WHERE tenant_id = ? 
  AND status = 'confirmado' 
  AND payment_date >= DATE_TRUNC('month', CURRENT_DATE);
```

### 8.2. Cache e Otimizações Adicionais

- **Redis** para cache de dashboards e métricas agregadas
- **Materialized Views** para relatórios complexos
- **Particionamento** de tabelas históricas (invoices, payments) por data
- **Read Replicas** para relatórios pesados (PostgreSQL)

---

## 9. Schema Prisma Completo

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// TABELA: TENANTS (Profissionais/Autônomos)
// ============================================
model Tenant {
  id                String   @id @default(uuid())
  name              String
  email             String   @unique
  phone             String?
  document          String?  // CPF/CNPJ
  subscriptionPlan  String   @default("free") // free, basic, pro
  settings          Json?    // Configurações personalizadas (JSONB)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relações
  users         User[]
  customers     Customer[]
  subscriptions Subscription[]
  invoices      Invoice[]
  payments      Payment[]
  notifications Notification[]

  @@index([email])
  @@index([subscriptionPlan])
  @@index([createdAt])
  @@map("tenants")
}

// ============================================
// TABELA: USERS (Usuários do SaaS)
// ============================================
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  role         UserRole @default(USER)
  tenantId     String   @map("tenant_id")
  isActive     Boolean  @default(true)
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relações
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([email])
  @@index([tenantId])
  @@index([tenantId, role])
  @@map("users")
}

enum UserRole {
  ADMIN
  USER
}

// ============================================
// TABELA: CUSTOMERS (Clientes do Tenant)
// ============================================
model Customer {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  name      String
  email     String
  phone     String?
  document  String?  // CPF/CNPJ
  address   Json?    // Endereço completo (JSONB)
  notes     String?  @db.Text
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relações
  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]
  invoices      Invoice[]
  notifications Notification[]

  @@unique([tenantId, email]) // Previne emails duplicados por tenant
  @@index([tenantId])
  @@index([tenantId, isActive])
  @@index([name])
  @@index([phone])
  @@map("customers")
}

// ============================================
// TABELA: SUBSCRIPTIONS (Assinaturas/Planos)
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
  startDate      DateTime          @default(now()) @map("start_date")
  nextBillingDate DateTime?        @map("next_billing_date")
  endDate        DateTime?         @map("end_date")
  installments   Int?              // Para PIX parcelado
  metadata       Json?             // Dados extras (JSONB)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  // Relações
  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer  @relation(fields: [customerId], references: [id], onDelete: Restrict)
  invoices Invoice[]

  @@index([tenantId])
  @@index([customerId])
  @@index([tenantId, status])
  @@index([nextBillingDate])
  @@index([paymentMethod])
  @@index([createdAt])
  @@map("subscriptions")
}

enum BillingCycle {
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
// TABELA: INVOICES (Faturas/Cobranças)
// ============================================
model Invoice {
  id             String        @id @default(uuid())
  tenantId       String        @map("tenant_id")
  subscriptionId String?       @map("subscription_id")
  customerId     String        @map("customer_id")
  invoiceNumber  String        @unique @map("invoice_number") // INV-2025-001
  description    String?
  amount         Decimal       @db.Decimal(10, 2)
  dueDate        DateTime      @map("due_date")
  paidDate       DateTime?     @map("paid_date")
  status         InvoiceStatus @default(PENDING)
  paymentLink    String?       @map("payment_link") @db.Text
  pixQrCode      String?       @map("pix_qr_code") @db.Text
  pixCopyPaste   String?       @map("pix_copy_paste") @db.Text
  boletoUrl      String?       @map("boleto_url") @db.Text
  externalId     String?       @map("external_id") // ID do provedor (Asaas, Juno)
  metadata       Json?         // Dados extras do provedor
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  // Relações
  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  subscription  Subscription?  @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  customer      Customer       @relation(fields: [customerId], references: [id], onDelete: Restrict)
  payments      Payment[]
  notifications Notification[]

  @@index([tenantId])
  @@index([customerId])
  @@index([subscriptionId])
  @@index([tenantId, status])
  @@index([dueDate])
  @@index([status, dueDate])
  @@index([externalId])
  @@index([createdAt])
  @@map("invoices")
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
  CANCELED
  REFUNDED
}

// ============================================
// TABELA: PAYMENTS (Pagamentos Recebidos)
// ============================================
model Payment {
  id            String        @id @default(uuid())
  invoiceId     String        @map("invoice_id")
  tenantId      String        @map("tenant_id")
  amount        Decimal       @db.Decimal(10, 2)
  paymentMethod PaymentMethod @map("payment_method")
  status        PaymentStatus @default(PENDING)
  paymentDate   DateTime?     @map("payment_date")
  externalId    String?       @map("external_id") // ID da transação no provedor
  metadata      Json?         // Dados da transação
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relações
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([status])
  @@index([paymentDate])
  @@index([externalId])
  @@index([tenantId, status, paymentDate])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
  REFUNDED
}

// ============================================
// TABELA: NOTIFICATIONS (Notificações)
// ============================================
model Notification {
  id         String             @id @default(uuid())
  tenantId   String             @map("tenant_id")
  customerId String?            @map("customer_id")
  invoiceId  String?            @map("invoice_id")
  type       NotificationType
  channel    NotificationChannel
  recipient  String             // Email ou telefone
  subject    String?
  message    String             @db.Text
  status     NotificationStatus @default(PENDING)
  sentAt     DateTime?          @map("sent_at")
  errorMessage String?          @map("error_message") @db.Text
  retryCount Int                @default(0) @map("retry_count")
  metadata   Json?
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt

  // Relações
  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  invoice  Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([customerId])
  @@index([invoiceId])
  @@index([tenantId, status])
  @@index([status])
  @@index([sentAt])
  @@index([type])
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
}

enum NotificationChannel {
  EMAIL
  WHATSAPP
  SMS
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  SCHEDULED
}

// ============================================
// TABELA: AUDIT_LOGS (Logs de Auditoria)
// ============================================
model AuditLog {
  id        String   @id @default(uuid())
  tenantId  String?  @map("tenant_id")
  userId    String?  @map("user_id")
  action    String   // CREATE, UPDATE, DELETE
  entity    String   // Invoice, Payment, Customer, etc
  entityId  String   @map("entity_id")
  changes   Json?    // Mudanças realizadas
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent") @db.Text
  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ============================================
// TABELA: WEBHOOK_EVENTS (Eventos de Webhooks)
// ============================================
model WebhookEvent {
  id            String   @id @default(uuid())
  tenantId      String?  @map("tenant_id")
  provider      String   // asaas, juno, stripe
  eventType     String   @map("event_type")
  payload       Json
  processed     Boolean  @default(false)
  processedAt   DateTime? @map("processed_at")
  errorMessage  String?  @map("error_message") @db.Text
  retryCount    Int      @default(0) @map("retry_count")
  createdAt     DateTime @default(now())

  @@index([tenantId])
  @@index([provider])
  @@index([processed])
  @@index([createdAt])
  @@map("webhook_events")
}
```

---

## 10. Escolha de Banco de Dados e Hospedagem

### 10.1. Por que PostgreSQL?

**✅ Vantagens para este Projeto:**

1. **Multi-tenancy Nativo**
   - Suporte robusto a isolamento de dados por tenant_id
   - Row Level Security (RLS) para segurança adicional
   - Índices parciais para otimizar queries por tenant

2. **ACID Completo**
   - Transações confiáveis - crítico para cobranças financeiras
   - Integridade referencial forte (foreign keys)
   - Sem risco de inconsistência em pagamentos

3. **Recursos Avançados**
   - JSONB para dados flexíveis (configurações do tenant)
   - Triggers para automações
   - Materialized Views para dashboards
   - Full-text search nativo

4. **Performance Excelente**
   - Índices compostos e parciais
   - GIN/GiST para buscas complexas
   - Particionamento de tabelas
   - Suporte a cache inteligente

5. **Escalabilidade**
   - Até milhões de registros sem problemas
   - Read replicas para relatórios pesados
   - Extensões como pg_partman para particionamento automático

6. **Ecossistema SaaS**
   - Supabase (PostgreSQL + Auth + API + Storage)
   - Neon (serverless PostgreSQL)
   - Railway/Render (deploy fácil)
   - Ferramentas de migração: Prisma, TypeORM, Drizzle

---

### 10.2. Comparação de Opções de Hospedagem

| Feature | Supabase | Neon | Railway | PlanetScale |
|---------|----------|------|---------|-------------|
| **Database** | PostgreSQL | PostgreSQL | PostgreSQL | MySQL |
| **Auth builtin** | ✅ Sim | ❌ Não | ❌ Não | ❌ Não |
| **Free tier DB** | 500MB | 3GB | 500MB | 5GB |
| **Realtime** | ✅ Sim | ❌ Não | ❌ Não | ❌ Não |
| **Serverless** | ⚠️ Não | ✅ Sim | ⚠️ Não | ✅ Sim |
| **Cold starts** | ❌ Não | ⚠️ Sim | ❌ Não | ⚠️ Sim |
| **Preço após free** | $25/mês | $19/mês | $5/mês | $29/mês |
| **Migração fácil** | ✅ Sim | ✅ Sim | ✅ Sim | ⚠️ MySQL |

---

### 10.3. Recomendação por Fase

**Fase 1: MVP (0-100 clientes)**
```
✅ Supabase Free Tier
```
- Setup em 10 minutos
- Auth grátis e pronto
- 500MB = ~50k invoices
- Dashboard para debug

**Fase 2: Validado (100-1000 clientes)**
```
✅ Supabase Pro ($25/mês)
ou
✅ Railway ($5/mês) + Clerk Auth ($25/mês)
```

**Fase 3: Escala (1000+ clientes)**
```
✅ Neon (serverless) + Clerk
ou
✅ AWS RDS/Aurora + Redis
```

---

### 10.4. Setup Rápido com Prisma

#### Opção 1: Supabase
```bash
# 1. Criar projeto no Supabase
# 2. Copiar DATABASE_URL

# .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# 3. Instalar dependências
npm install prisma @prisma/client
npm install @supabase/supabase-js

# 4. Inicializar Prisma
npx prisma init

# 5. Copiar o schema do documento
# 6. Migrar
npx prisma migrate dev --name init

# 7. Gerar client
npx prisma generate
```

#### Opção 2: Railway
```bash
# 1. Criar projeto no Railway
# 2. Adicionar PostgreSQL
# 3. Copiar DATABASE_URL

# .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@containers-us-west-1.railway.app:5432/railway"

# Resto igual ao Supabase
```

#### Opção 3: Neon
```bash
# 1. Criar projeto no Neon
# 2. Copiar CONNECTION STRING

# .env
DATABASE_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb"

# Resto igual
```

---

### 10.5. Dependências Necessárias

```json
{
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "prisma": "^5.20.0",
    
    // Se usar Supabase
    "@supabase/supabase-js": "^2.39.0",
    
    // Ou se usar Auth separado
    "@clerk/nextjs": "^4.29.0",
    
    // Para pagamentos
    "asaas": "^1.0.0", // ou SDK do provedor escolhido
    
    // Para jobs/cron
    "inngest": "^3.0.0",
    
    // Opcional: validação
    "zod": "^3.22.4"
  }
}
```

---

## 11. Endpoints da API - MVP

### 11.1. Estrutura Base da API

**Base URL:** `https://api.seuapp.com/v1`

**Autenticação:** 
- Bearer Token (JWT)
- Header: `Authorization: Bearer {token}`

**Respostas Padrão:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}

// Em caso de erro
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email inválido",
    "details": { ... }
  }
}
```

---

### 11.2. Autenticação

#### POST `/auth/register`
**Descrição:** Registro de novo tenant (profissional)

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123",
  "phone": "11999999999"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "subscriptionPlan": "free"
    },
    "token": "jwt_token_aqui"
  }
}
```

---

#### POST `/auth/login`
**Descrição:** Login de tenant existente

**Request:**
```json
{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_aqui",
    "tenant": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com"
    }
  }
}
```

---

#### POST `/auth/refresh`
**Descrição:** Renovar token JWT

**Request:**
```json
{
  "refreshToken": "refresh_token_aqui"
}
```

---

#### POST `/auth/logout`
**Descrição:** Logout (invalidar token)

---

### 11.3. Clientes (Customers)

#### GET `/customers`
**Descrição:** Listar todos os clientes do tenant

**Query Params:**
- `page` (opcional): Página atual (default: 1)
- `limit` (opcional): Itens por página (default: 20)
- `search` (opcional): Buscar por nome ou email
- `isActive` (opcional): true/false

**Response:**
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
**Descrição:** Criar novo cliente

**Request:**
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

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Maria Santos",
    "email": "maria@exemplo.com",
    "phone": "11988888888",
    "isActive": true,
    "createdAt": "2025-09-30T10:00:00Z"
  },
  "message": "Cliente criado com sucesso"
}
```

---

#### GET `/customers/:id`
**Descrição:** Obter detalhes de um cliente específico

**Response:**
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
    "subscriptions": [
      {
        "id": "uuid",
        "description": "Consulta mensal",
        "amount": 150.00,
        "status": "ACTIVE"
      }
    ],
    "stats": {
      "totalInvoices": 12,
      "paidInvoices": 10,
      "overdueInvoices": 2,
      "totalPaid": 1500.00
    }
  }
}
```

---

#### PUT `/customers/:id`
**Descrição:** Atualizar dados do cliente

**Request:**
```json
{
  "name": "Maria Santos Silva",
  "phone": "11977777777",
  "notes": "Atualização de contato"
}
```

---

#### DELETE `/customers/:id`
**Descrição:** Desativar cliente (soft delete)

**Response:**
```json
{
  "success": true,
  "message": "Cliente desativado com sucesso"
}
```

---

### 11.4. Assinaturas (Subscriptions)

#### GET `/subscriptions`
**Descrição:** Listar assinaturas do tenant

**Query Params:**
- `page`, `limit`
- `status`: ACTIVE, PAUSED, CANCELED, OVERDUE
- `customerId`: Filtrar por cliente

**Response:**
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
        "nextBillingDate": "2025-10-15",
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### POST `/subscriptions`
**Descrição:** Criar nova assinatura

**Request:**
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

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "description": "Consulta mensal",
    "amount": 150.00,
    "status": "ACTIVE",
    "nextBillingDate": "2025-11-01"
  },
  "message": "Assinatura criada com sucesso"
}
```

---

#### GET `/subscriptions/:id`
**Descrição:** Detalhes de uma assinatura

---

#### PUT `/subscriptions/:id`
**Descrição:** Atualizar assinatura

**Request:**
```json
{
  "amount": 180.00,
  "status": "PAUSED"
}
```

---

#### DELETE `/subscriptions/:id`
**Descrição:** Cancelar assinatura

---

### 11.5. Faturas/Cobranças (Invoices)

#### GET `/invoices`
**Descrição:** Listar faturas do tenant

**Query Params:**
- `page`, `limit`
- `status`: PENDING, PAID, OVERDUE, CANCELED
- `customerId`: Filtrar por cliente
- `startDate`, `endDate`: Filtrar por período

**Response:**
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
        "dueDate": "2025-10-15",
        "status": "PENDING",
        "paymentLink": "https://pay.exemplo.com/abc123",
        "pixQrCode": "base64...",
        "createdAt": "2025-09-30T10:00:00Z"
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
**Descrição:** Criar fatura manual (fora de assinatura)

**Request:**
```json
{
  "customerId": "uuid",
  "description": "Consulta avulsa",
  "amount": 200.00,
  "dueDate": "2025-10-30",
  "paymentMethod": "PIX"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-2025-042",
    "amount": 200.00,
    "dueDate": "2025-10-30",
    "status": "PENDING",
    "paymentLink": "https://pay.exemplo.com/xyz789",
    "pixQrCode": "base64...",
    "pixCopyPaste": "00020126580014br.gov.bcb.pix..."
  },
  "message": "Fatura criada com sucesso"
}
```

---

#### GET `/invoices/:id`
**Descrição:** Detalhes de uma fatura específica

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-2025-001",
    "customer": {
      "id": "uuid",
      "name": "Maria Santos",
      "email": "maria@exemplo.com"
    },
    "subscription": {
      "id": "uuid",
      "description": "Consulta mensal"
    },
    "amount": 150.00,
    "dueDate": "2025-10-15",
    "paidDate": null,
    "status": "PENDING",
    "paymentLink": "https://pay.exemplo.com/abc123",
    "pixQrCode": "base64...",
    "pixCopyPaste": "00020126580014br.gov.bcb.pix...",
    "payments": [],
    "notifications": [
      {
        "type": "INVOICE_CREATED",
        "channel": "EMAIL",
        "status": "SENT",
        "sentAt": "2025-09-30T10:05:00Z"
      }
    ]
  }
}
```

---

#### PUT `/invoices/:id/cancel`
**Descrição:** Cancelar fatura

---

#### POST `/invoices/:id/resend`
**Descrição:** Reenviar notificação de cobrança

**Request:**
```json
{
  "channel": "WHATSAPP"
}
```

---

### 11.6. Pagamentos (Payments)

#### GET `/payments`
**Descrição:** Listar pagamentos recebidos

**Query Params:**
- `page`, `limit`
- `status`: PENDING, CONFIRMED, FAILED
- `startDate`, `endDate`

**Response:**
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
          "name": "Maria Santos"
        },
        "amount": 150.00,
        "paymentMethod": "PIX",
        "status": "CONFIRMED",
        "paymentDate": "2025-10-10T14:30:00Z"
      }
    ],
    "pagination": { ... },
    "summary": {
      "totalReceived": 3000.00,
      "totalPending": 1200.00
    }
  }
}
```

---

#### GET `/payments/:id`
**Descrição:** Detalhes de um pagamento

---

### 11.7. Dashboard & Métricas

#### GET `/dashboard/overview`
**Descrição:** Visão geral do tenant (métricas principais)

**Response:**
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
      "thisMonth": 5400.00,
      "lastMonth": 5100.00,
      "growth": 5.88,
      "yearToDate": 48600.00
    },
    "upcomingInvoices": [
      {
        "id": "uuid",
        "customer": "Maria Santos",
        "amount": 150.00,
        "dueDate": "2025-10-05"
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
**Descrição:** Gráfico de receita mensal

**Query Params:**
- `period`: last7days, last30days, last12months

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "last12months",
    "data": [
      { "month": "2024-10", "revenue": 4200.00, "invoices": 18 },
      { "month": "2024-11", "revenue": 4500.00, "invoices": 19 },
      { "month": "2024-12", "revenue": 4800.00, "invoices": 20 },
      { "month": "2025-01", "revenue": 5100.00, "invoices": 21 }
    ]
  }
}
```

---

### 11.8. Webhooks (receber eventos dos provedores)

#### POST `/webhooks/asaas`
**Descrição:** Receber eventos da Asaas

**Request (exemplo de pagamento confirmado):**
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_abc123",
    "status": "RECEIVED",
    "value": 150.00,
    "externalReference": "invoice_uuid"
  }
}
```

---

#### POST `/webhooks/juno`
**Descrição:** Receber eventos da Juno

---

### 11.9. Configurações do Tenant

#### GET `/settings`
**Descrição:** Obter configurações do tenant

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@exemplo.com",
      "phone": "11999999999",
      "subscriptionPlan": "free"
    },
    "notifications": {
      "emailEnabled": true,
      "whatsappEnabled": false,
      "smsEnabled": false,
      "reminderDaysBefore": 3
    },
    "payment": {
      "provider": "asaas",
      "apiKeyConfigured": true
    }
  }
}
```

---

#### PUT `/settings`
**Descrição:** Atualizar configurações

**Request:**
```json
{
  "name": "João Silva Santos",
  "phone": "11988888888",
  "notifications": {
    "reminderDaysBefore": 5,
    "whatsappEnabled": true
  }
}
```

---

### 11.10. Priorização para MVP

**🔴 Essencial (Semana 1-2):**
- POST `/auth/register`
- POST `/auth/login`
- GET/POST `/customers`
- GET/POST `/subscriptions`
- GET/POST `/invoices`
- GET `/dashboard/overview`

**🟡 Importante (Semana 3-4):**
- GET `/invoices/:id`
- POST `/invoices/:id/resend`
- GET `/payments`
- POST `/webhooks/asaas`
- GET/PUT `/settings`

**🟢 Pode aguardar:**
- Filtros avançados
- Gráficos detalhados
- Notificações WhatsApp/SMS
- Relatórios complexos
- Múltiplos usuários por tenant

---

### 11.11. Exemplos de Uso (Fluxo Completo)

**Cenário: Psicóloga cadastra paciente e cria assinatura mensal**

```bash
# 1. Login
POST /auth/login
{
  "email": "dra.maria@exemplo.com",
  "password": "senha123"
}
# Retorna: { token: "jwt..." }

# 2. Criar paciente
POST /customers
Authorization: Bearer jwt...
{
  "name": "João Pedro",
  "email": "joao@exemplo.com",
  "phone": "11977777777"
}
# Retorna: { id: "customer_uuid" }

# 3. Criar assinatura mensal
POST /subscriptions
Authorization: Bearer jwt...
{
  "customerId": "customer_uuid",
  "description": "Sessão de terapia mensal",
  "amount": 200.00,
  "billingCycle": "MONTHLY",
  "paymentMethod": "PIX",
  "startDate": "2025-10-01"
}
# Retorna: { id: "subscription_uuid", nextBillingDate: "2025-11-01" }

# 4. Sistema cria automaticamente a primeira fatura
# (job roda diariamente verificando subscriptions.nextBillingDate)

# 5. Paciente recebe notificação por email com link de pagamento

# 6. Quando paciente paga, provedor envia webhook
POST /webhooks/asaas
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "externalReference": "invoice_uuid",
    "value": 200.00
  }
}

# 7. Sistema atualiza status da fatura para PAID
# 8. Dra. Maria vê no dashboard que pagamento foi confirmado
```

--- 