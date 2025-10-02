# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**finpay-api** (CobrançaFácil) - Sistema de cobrança para autônomos com arquitetura Clean Architecture + DDD.

**Modelo de Negócio**: Taxa de 1.5% sobre cada transação. Integração com Asaas (PIX grátis, Boleto R$3.49, Cartão 4.99%).

**Stack**: Node.js + TypeScript + Prisma + PostgreSQL + Clean Architecture

## Development Commands

```bash
# Setup inicial
npm install
npx prisma generate
npx prisma migrate dev

# Desenvolvimento
npm run dev

# Build
npm run build
npm start

# Testes
npm test
```

## Architecture

### Clean Architecture Layers

```
├── domain/              # Entidades e regras de negócio (core)
│   ├── entities/       # Tenant, Customer, Invoice, Subscription, Payment, Transaction
│   ├── repositories/   # Interfaces (contratos)
│   └── errors/         # DomainError, EntityNotFoundError
│
├── application/        # Casos de uso (orquestração)
│   ├── use-cases/     # CreateInvoice, ProcessPaymentWebhook, etc.
│   ├── dtos/          # Data Transfer Objects
│   └── services/      # IAsaasService, IEmailService (interfaces)
│
├── infrastructure/     # Adaptadores externos
│   ├── database/      # PrismaClient, Repositories (implementações)
│   ├── external-services/  # AsaasService, EmailService (implementações)
│   ├── http/          # Controllers, Routes, Middlewares
│   └── jobs/          # Cron jobs (geração de faturas)
│
└── main.ts            # Entry point
```

### Dependency Rule

**Camadas internas NÃO dependem de camadas externas**
- Domain: não depende de nada
- Application: depende apenas de Domain
- Infrastructure: depende de Domain e Application

## Critical Business Rules

1. **Multi-tenancy**: SEMPRE filtrar queries por `tenantId`
2. **Fee Calculation**: Cálculo de taxas DEVE estar na entidade `Invoice`
3. **Webhooks**: Processar em `$transaction` (atomicidade)
4. **Platform Fee**: 1.5% do valor da transação vai para a plataforma
5. **Asaas Integration**: Usar split payment na criação de cobrança

## Core Entities

### Invoice (Fatura)
- Calcula automaticamente: `platformFee`, `asaasFee`, `tenantReceives`
- Métodos: `markAsPaid()`, `markAsOverdue()`, `cancel()`, `linkAsaasCharge()`
- Status: PENDING, PAID, OVERDUE, CANCELED

### Tenant (Autônomo/Profissional)
- Método: `calculatePlatformFee(amount)` - retorna 1.5% do valor
- Propriedades: `asaasCustomerId`, `asaasWalletId`, `feePercentage`

### Subscription (Assinatura)
- Método: `shouldGenerateInvoice()` - verifica se deve gerar fatura
- Método: `advanceToNextBillingCycle()` - avança para próximo ciclo
- Billing Cycles: WEEKLY, MONTHLY, QUARTERLY, ANNUAL

## Key Use Cases

### CreateInvoiceUseCase
1. Buscar tenant e customer
2. Gerar `invoiceNumber` (INV-2025-0001)
3. Criar entidade Invoice (cálculo de fees automático)
4. Criar cobrança no Asaas com split de 1.5%
5. Vincular dados do Asaas à invoice
6. Persistir
7. Enviar notificação

### ProcessPaymentWebhookUseCase (CRÍTICO)
1. Buscar invoice pelo `asaasChargeId`
2. Verificar se já foi processado
3. Marcar invoice como paga
4. Criar Payment
5. Registrar Transaction (nossa receita de 1.5%)
6. Enviar notificação ao tenant

## Database Schema

**Principais tabelas**:
- `tenants` - Profissionais/Autônomos
- `customers` - Clientes do autônomo
- `invoices` - Faturas (com platformFee, asaasFee, tenantReceives)
- `subscriptions` - Cobranças recorrentes
- `payments` - Pagamentos confirmados
- `transactions` - Nossa receita (1.5% por transação)

**Índices importantes**:
- `[tenantId]` em todas as tabelas (multi-tenancy)
- `[asaasChargeId]` único em invoices
- `[tenantId, status]` para queries filtradas

## Asaas Integration

### Split Payment
```typescript
const asaasCharge = await asaasService.createCharge({
  customer: tenant.asaasCustomerId,
  value: invoice.amount,
  split: [{
    walletId: process.env.ASAAS_WALLET_ID,
    fixedValue: invoice.platformFee  // 1.5%
  }]
});
```

### Webhook Events
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_CONFIRMED` - Pagamento confirmado (processar aqui)

## Implementation Priority (MVP)

### Semana 1: Domain Layer
- [ ] Entidades: Tenant, Customer, Invoice
- [ ] Interfaces: ITenantRepository, ICustomerRepository, IInvoiceRepository
- [ ] Errors: DomainError, EntityNotFoundError

### Semana 2: Application + Infrastructure
- [ ] Use Cases: CreateCustomer, CreateInvoice
- [ ] Repositórios Prisma
- [ ] AsaasService (implementação)

### Semana 3: HTTP + Webhooks
- [ ] Controllers: Customer, Invoice, Webhook
- [ ] ProcessPaymentWebhookUseCase (CRÍTICO)
- [ ] Routes e middlewares

### Semana 4: Subscriptions + Jobs
- [ ] Subscription entity e use cases
- [ ] Cron job para geração automática de faturas
- [ ] Dashboard endpoints

## Testing

### Entity Tests
```typescript
// Validar cálculo de fees
const invoice = Invoice.create({...}, tenant, 'PIX');
expect(invoice.platformFee).toBe(1.5); // 1.5% de 100
expect(invoice.asaasFee).toBe(0); // PIX é grátis
expect(invoice.tenantReceives).toBe(98.5);
```

### Use Case Tests
- Usar repositórios in-memory
- Mockar serviços externos (Asaas, Email)
- Testar fluxo completo

## Common Pitfalls

❌ **NÃO fazer**:
- Usar `localStorage` no backend
- Esquecer de filtrar por `tenantId`
- Calcular fees fora da entidade Invoice
- Processar webhook sem transaction
- Criar cobrança Asaas sem split

✅ **SEMPRE fazer**:
- Filtrar queries por `tenantId`
- Processar webhooks em `$transaction`
- Validar domínio nas entidades
- Usar Factory Methods (`create`, `reconstitute`)
- Testar com repositórios in-memory

## Environment Variables

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
ASAAS_API_KEY="..."
ASAAS_WALLET_ID="..."
MAILERSEND_API_KEY="..."
PORT=3000
```

## References

Para informações detalhadas, consulte os documentos em [CONTEXT.md](CONTEXT.md):

1. **Arquitetura Clean Architecture**: [docs/clean_arch_mvp_doc.md](docs/clean_arch_mvp_doc.md)
   - Estrutura completa de camadas, entidades e use cases com exemplos de código

2. **Schema do Banco de Dados**: [docs/database_schema_transactional.txt](docs/database_schema_transactional.txt)
   - Schema Prisma completo com todas as tabelas, relações e índices

3. **Plano de Execução MVP**: [docs/mvp_execution_plan.md](docs/mvp_execution_plan.md)
   - Cronograma detalhado de 30 dias com fases e tarefas

4. **Documentação Técnica**: [docs/complete_technical_doc.md](docs/complete_technical_doc.md)
   - Informações técnicas detalhadas do funcionamento do sistema

5. **Contexto Geral**: [CONTEXT.md](CONTEXT.md)
   - Visão consolidada de todos os documentos e regras críticas
