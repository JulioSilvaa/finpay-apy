# Guia de Implementação - CobrançaFácil
## Modelo Final: Autônomo Absorve Taxas

---

## 1. Modelo Econômico Definitivo

### 1.1 Estrutura de Custos

```
Cliente paga: R$ 100,00
    ↓
Asaas processa o pagamento
    ↓
Asaas cobra suas taxas:
  - PIX: R$ 0,00 (grátis)
  - Boleto: R$ 3,49
  - Cartão: R$ 4,99 (4,99%)
    ↓
CobrançaFácil cobra: R$ 1,50 (1,5%)
    ↓
Autônomo recebe líquido:
  - Via PIX: R$ 98,50
  - Via Boleto: R$ 95,01
  - Via Cartão: R$ 93,51
```

### 1.2 Cálculo Detalhado por Meio de Pagamento

| Meio | Valor Cobrado | Taxa Asaas | Nossa Taxa (1,5%) | Líquido Autônomo |
|------|---------------|------------|-------------------|------------------|
| **PIX** | R$ 100,00 | R$ 0,00 | R$ 1,50 | R$ 98,50 |
| **Boleto** | R$ 100,00 | R$ 3,49 | R$ 1,50 | R$ 95,01 |
| **Cartão** | R$ 100,00 | R$ 4,99 | R$ 1,50 | R$ 93,51 |

### 1.3 Nossa Margem

```
Receita: 1,5% sobre cada transação
Custo operacional: ~R$ 0,50/cliente/mês (infra)
Margem bruta: 99,3%
```

---

## 2. Integração com Asaas

### 2.1 Fluxo de Onboarding

**Quando autônomo se cadastra:**

```javascript
// 1. Criar subconta no Asaas
const asaasResponse = await asaas.createCustomer({
  name: tenant.name,
  email: tenant.email,
  cpfCnpj: tenant.document,
  mobilePhone: tenant.phone
});

// 2. Salvar ID da subconta
tenant.asaasCustomerId = asaasResponse.id;

// 3. Configurar webhook
await asaas.configureWebhook({
  customerId: asaasResponse.id,
  url: 'https://api.cobrancafacil.com/webhooks/asaas',
  events: [
    'PAYMENT_RECEIVED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_OVERDUE'
  ]
});
```

### 2.2 Criar Cobrança com Split Automático

```javascript
// Quando autônomo cria uma cobrança de R$ 100
const charge = await asaas.createCharge({
  customer: invoice.customerId,
  billingType: 'PIX', // ou BOLETO, CREDIT_CARD
  value: 100.00,
  dueDate: invoice.dueDate,
  
  // SPLIT: Nossa taxa de 1,5%
  split: [
    {
      walletId: 'WALLET_COBRANCA_FACIL', // Nossa carteira
      fixedValue: 1.50, // Recebemos R$ 1,50
      percentualValue: null
    }
  ],
  
  externalReference: invoice.id, // Para vincular no webhook
  description: invoice.description
});

// Salvar dados no banco
await prisma.invoice.update({
  where: { id: invoice.id },
  data: {
    amount: 100.00,
    platformFee: 1.50,
    asaasFee: 0.00, // Será preenchido após pagamento
    tenantReceives: 98.50,
    asaasChargeId: charge.id,
    paymentLink: charge.invoiceUrl,
    pixQrCode: charge.pixQrCode,
    pixCopyPaste: charge.pixCopyPaste
  }
});
```

### 2.3 Processar Webhook do Asaas

```javascript
// POST /webhooks/asaas
app.post('/webhooks/asaas', async (req, res) => {
  const { event, payment } = req.body;
  
  // Validar webhook (verificar assinatura)
  if (!validateAsaasWebhook(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Buscar fatura pelo externalReference
  const invoice = await prisma.invoice.findFirst({
    where: { asaasChargeId: payment.id }
  });
  
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  
  // Processar evento
  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      await confirmPayment(invoice, payment);
      break;
      
    case 'PAYMENT_OVERDUE':
      await markInvoiceOverdue(invoice);
      break;
  }
  
  res.status(200).json({ success: true });
});

async function confirmPayment(invoice, payment) {
  // Atualizar fatura
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paidDate: new Date(payment.paymentDate),
      asaasPaymentId: payment.id,
      asaasFee: payment.netValue - invoice.amount + invoice.platformFee
    }
  });
  
  // Criar registro de pagamento
  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      amount: invoice.amount,
      paymentMethod: payment.billingType,
      status: 'CONFIRMED',
      paymentDate: new Date(payment.paymentDate),
      asaasPaymentId: payment.id
    }
  });
  
  // Registrar nossa receita
  await prisma.transaction.create({
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
  
  // Enviar notificação
  await sendNotification({
    tenantId: invoice.tenantId,
    customerId: invoice.customerId,
    invoiceId: invoice.id,
    type: 'PAYMENT_RECEIVED',
    channel: 'EMAIL',
    recipient: tenant.email,
    subject: 'Pagamento recebido!',
    message: `Cliente ${customer.name} pagou R$ ${invoice.amount}`
  });
}
```

---

## 3. Cálculos no Sistema

### 3.1 Ao Criar Fatura

```typescript
interface CreateInvoiceDTO {
  amount: number; // Valor que o CLIENTE vai pagar
  customerId: string;
  dueDate: Date;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
}

function calculateInvoiceValues(dto: CreateInvoiceDTO) {
  const amount = dto.amount; // R$ 100
  const platformFeeRate = 0.015; // 1.5%
  const platformFee = amount * platformFeeRate; // R$ 1.50
  
  // Taxa do Asaas (conhecida antes do pagamento)
  let asaasFee = 0;
  switch (dto.paymentMethod) {
    case 'PIX':
      asaasFee = 0; // Grátis
      break;
    case 'BOLETO':
      asaasFee = 3.49; // Fixo
      break;
    case 'CREDIT_CARD':
      asaasFee = amount * 0.0499; // 4.99%
      break;
  }
  
  const tenantReceives = amount - platformFee - asaasFee;
  
  return {
    amount,
    platformFee,
    asaasFee,
    tenantReceives
  };
}

// Exemplo de uso
const values = calculateInvoiceValues({
  amount: 100,
  customerId: 'cust_123',
  dueDate: new Date('2025-11-15'),
  paymentMethod: 'PIX'
});

console.log(values);
// {
//   amount: 100.00,
//   platformFee: 1.50,
//   asaasFee: 0.00,
//   tenantReceives: 98.50
// }
```

### 3.2 Mostrar no Dashboard

```typescript
// GET /dashboard/overview
async function getDashboardOverview(tenantId: string) {
  // Faturamento bruto (valor que clientes pagaram)
  const grossRevenue = await prisma.invoice.aggregate({
    where: {
      tenantId,
      status: 'PAID'
    },
    _sum: { amount: true }
  });
  
  // Receita líquida (o que o autônomo realmente recebeu)
  const netRevenue = await prisma.invoice.aggregate({
    where: {
      tenantId,
      status: 'PAID'
    },
    _sum: { tenantReceives: true }
  });
  
  // Nossa receita (taxas cobradas)
  const platformFees = await prisma.transaction.aggregate({
    where: {
      tenantId,
      type: 'PLATFORM_FEE',
      status: 'COMPLETED'
    },
    _sum: { amount: true }
  });
  
  // Taxas do Asaas
  const asaasFees = await prisma.invoice.aggregate({
    where: {
      tenantId,
      status: 'PAID'
    },
    _sum: { asaasFee: true }
  });
  
  return {
    grossRevenue: grossRevenue._sum.amount || 0,
    netRevenue: netRevenue._sum.tenantReceives || 0,
    platformFees: platformFees._sum.amount || 0,
    asaasFees: asaasFees._sum.asaasFee || 0,
    
    // Mostrar breakdown
    breakdown: {
      totalCharged: grossRevenue._sum.amount || 0,
      youReceived: netRevenue._sum.tenantReceives || 0,
      platformFee: platformFees._sum.amount || 0,
      paymentGatewayFee: asaasFees._sum.asaasFee || 0
    }
  };
}
```

---

## 4. Interface do Usuário

### 4.1 Ao Criar Cobrança (Preview)

```tsx
// Componente React
function InvoicePreview({ amount, paymentMethod }) {
  const fees = calculateFees(amount, paymentMethod);
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold mb-3">Resumo da cobrança</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Valor do serviço</span>
          <span className="font-medium">R$ {amount.toFixed(2)}</span>
        </div>
        
        <div className="border-t pt-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Taxa CobrançaFácil (1,5%)</span>
            <span>- R$ {fees.platform.toFixed(2)}</span>
          </div>
          
          {fees.gateway > 0 && (
            <div className="flex justify-between">
              <span>Taxa de pagamento ({paymentMethod})</span>
              <span>- R$ {fees.gateway.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t pt-2 flex justify-between font-bold text-green-600">
          <span>Você recebe</span>
          <span>R$ {fees.netAmount.toFixed(2)}</span>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-3">
        Seu cliente pagará R$ {amount.toFixed(2)}. 
        Após as taxas, você receberá R$ {fees.netAmount.toFixed(2)} 
        em sua conta Asaas.
      </p>
    </div>
  );
}
```

### 4.2 Dashboard - Extrato

```tsx
function RevenueCard({ data }) {
  return (
    <Card>
      <h3>Faturamento do mês</h3>
      
      <div className="mt-4">
        <div className="text-3xl font-bold text-gray-900">
          R$ {data.netRevenue.toFixed(2)}
        </div>
        <p className="text-sm text-gray-600">Valor líquido recebido</p>
      </div>
      
      <div className="mt-4 pt-4 border-t text-sm">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Valor bruto</span>
          <span className="font-medium">R$ {data.grossRevenue.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-red-600 mb-1">
          <span>Taxa CobrançaFácil</span>
          <span>- R$ {data.platformFees.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-red-600">
          <span>Taxas de pagamento</span>
          <span>- R$ {data.asaasFees.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  );
}
```

---

## 5. Transparência e Comunicação

### 5.1 Página de Preços

```markdown
# Preços Transparentes

## Como funciona?

Você paga **apenas 1,5% sobre pagamentos confirmados**.

### Exemplo real:

Seu cliente paga R$ 100 via PIX:
- Taxa CobrançaFácil: R$ 1,50 (1,5%)
- Taxa de pagamento (PIX): R$ 0,00 (grátis)
- **Você recebe: R$ 98,50**

### Comparação com concorrentes:

| Plataforma | Mensalidade | Taxa Transação | Total (R$ 5.000/mês) |
|------------|-------------|----------------|----------------------|
| CobrançaFácil | R$ 0 | 1,5% | R$ 75 |
| Asaas Pro | R$ 39 | 1,49% | R$ 113,50 |
| Mercado Pago | R$ 0 | 4,99% | R$ 249,50 |

### Sem surpresas:
- ✅ Sem mensalidade
- ✅ Sem taxa de setup
- ✅ Sem fidelidade
- ✅ Cancele quando quiser
```

### 5.2 FAQ

**P: Quem paga a taxa de 1,5%?**
R: Você (profissional). É descontado automaticamente do valor recebido.

**P: Por que não colocar a taxa no cliente?**
R: Para manter o preço do seu serviço transparente. Você pode incluir os 1,5% no seu preço se preferir.

**P: Quanto o Asaas cobra?**
R: PIX é grátis, boleto R$ 3,49, cartão 4,99%. Essas taxas são do gateway de pagamento, não nossas.

**P: Posso usar outro gateway?**
R: No MVP usamos apenas Asaas. Planejamos adicionar outras opções no futuro.

---

## 6. Checklist de Implementação

### Fase 1: Backend (Semana 1-2)

- [ ] Setup banco de dados (Prisma + PostgreSQL)
- [ ] Tabelas: Tenants, Customers, Subscriptions, Invoices, Payments, Transactions
- [ ] API de autenticação (JWT)
- [ ] Integração Asaas (criar subconta, criar cobrança com split)
- [ ] Webhook handler (/webhooks/asaas)
- [ ] Cálculo de valores (platformFee, asaasFee, tenantReceives)

### Fase 2: Frontend (Semana 3-4)

- [ ] Páginas: Login, Dashboard, Clientes, Nova Cobrança
- [ ] Preview de cobrança (mostrar valores líquidos)
- [ ] Dashboard com breakdown de taxas
- [ ] Extrato de pagamentos recebidos
- [ ] Mobile-first responsivo

### Fase 3: Automações (Semana 5)

- [ ] Cron job: gerar faturas de assinaturas ativas
- [ ] Cron job: enviar lembretes de vencimento
- [ ] Cron job: marcar faturas vencidas como OVERDUE
- [ ] Atualizar FinancialSummary diariamente

### Fase 4: Validação (Semana 6-8)

- [ ] 10 early adopters testando
- [ ] Pelo menos 50 transações processadas
- [ ] Webhook funcionando 100%
- [ ] Suporte via WhatsApp configurado

---

## 7. Métricas de Sucesso

**MVP validado se:**
- ✅ 100 autônomos cadastrados
- ✅ 50 autônomos com pelo menos 1 cobrança criada
- ✅ 200+ transações processadas
- ✅ NPS > 50
- ✅ Taxa de ativação > 60%
- ✅ Churn < 5%/mês
- ✅ Uptime > 99.5%

**Receita esperada (primeiros 3 meses):**
- Mês 1: R$ 1.500 (100 clientes, R$ 1.000 média processada)
- Mês 2: R$ 4.500 (300 clientes)
- Mês 3: R$ 7.500 (500 clientes)

---

## 8. Roadmap Pós-MVP

### Curto Prazo (3-6 meses)
- Notificações WhatsApp
- App mobile nativo
- Integração com calendário
- Múltiplos meios de pagamento por cobrança

### Médio Prazo (6-12 meses)
- Dashboard analítico avançado
- Previsão de inadimplência (ML)
- Marketplace de contadores/designers
- API pública

### Longo Prazo (12+ meses)
- Antecipação de recebíveis
- Conta digital própria
- Expansão LATAM
- White-label para parceiros

---

**Versão**: 1.0 Final  
**Data**: Outubro 2025  
**Stack**: React + Node.js + PostgreSQL + Asaas  
**Deploy sugerido**: Vercel (frontend) + Railway (backend + DB)