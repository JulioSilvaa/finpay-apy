## Fase 6: Deploy VPS + CI/CD (3-4 dias)

### Dia 28: Setup VPS e Servidor

**Requisitos da VPS**
- Ubuntu 22.04 LTS
- Mínimo: 2GB RAM, 2 vCPU, 40GB SSD
- Providers sugeridos: DigitalOcean, Hetzner, Vultr, Contabo

**1. Acessar VPS**
```bash
ssh root@seu-ip-vps
```

**2. Criar usuário não-root**
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

**3. Instalar dependências**
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Certbot (SSL gratuito)
sudo apt install -y certbot python3-certbot-nginx
```

**4. Configurar PostgreSQL**
```bash
# Entrar no PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE cobrancafacil;
CREATE USER cobrancafacil_user WITH ENCRYPTED PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE cobrancafacil TO cobrancafacil_user;
\q
```

**5. Configurar Firewall**
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

### Dia 29: Configurar Backend na VPS

**1. Criar diretório do projeto**
```bash
cd /home/deploy
mkdir -p apps/cobrancafacil-api
cd apps/cobrancafacil-api
```

**2. Clonar repositório (primeira vez manual)**
```bash
git clone https://github.com/seu-usuario/cobrancafacil-api.git .
```

**3. Configurar variáveis de ambiente**
```bash
nano .env
```

```env
NODE_ENV=production
PORT=3000

DATABASE_URL="postgresql://cobrancafacil_user:sua_senha_forte@localhost:5432/cobrancafacil"

JWT_SECRET="seu_secret_super_seguro_de_256_bits"
JWT_EXPIRES_IN="7d"

ASAAS_API_KEY="sua_chave_asaas_producao"
ASAAS_WALLET_ID="seu_wallet_id"

MAILERSEND_API_KEY="sua_chave_mailersend"
MAILERSEND_FROM_EMAIL="noreply@seudominio.com"

FRONTEND_URL="https://app.seudominio.com"
```

**4. Instalar e buildar**
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

**5. Configurar PM2**
```bash
# Criar arquivo ecosystem
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'cobrancafacil-api',
    script: './dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

**6. Iniciar aplicação**
```bash
mkdir logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**7. Configurar Nginx**
```bash
sudo nano /etc/nginx/sites-available/cobrancafacil-api
```

```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**8. Ativar configuração**
```bash
sudo ln -s /etc/nginx/sites-available/cobrancafacil-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**9. Configurar SSL (HTTPS)**
```bash
sudo certbot --nginx -d api.seudominio.com
```

---

### Dia 30: GitHub Actions + Husky

**1. Configurar Husky no projeto local**

```bash
# No seu projeto local
npm install -D husky @commitlint/cli @commitlint/config-conventional lint-staged

# Inicializar Husky
npx husky-init && npm install

# Configurar commitlint
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
```

**2. Configurar hooks do Husky**

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint-staged
npm run test
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit ${1}
```

**3. Adicionar scripts no package.json**

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

**4. Criar workflow do GitHub Actions**

```bash
mkdir -p .github/workflows
nano .github/workflows/deploy.yml
```

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

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

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/deploy/apps/cobrancafacil-api
            git pull origin main
            npm ci --production
            npx prisma migrate deploy
            npm run build
            pm2 restart cobrancafacil-api
```

**5. Configurar secrets no GitHub**

Ir em: Repositório → Settings → Secrets and variables → Actions

Adicionar:
- `VPS_HOST`: IP ou domínio da VPS
- `VPS_USERNAME`: deploy
- `VPS_SSH_KEY`: Chave SSH privada

**6. Gerar chave SSH para deploy**

```bash
# Na VPS, como usuário deploy
ssh-keygen -t ed25519 -C "github-actions-deploy"

# Adicionar chave pública ao authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# Copiar chave privada
cat ~/.ssh/id_ed25519
# Copiar TODO o conteúdo e adicionar no secret VPS_SSH_KEY do GitHub
```

**7. Configurar webhook do GitHub na VPS (opcional)**

Alternativa mais segura: usar webhook ao invés de SSH key

```bash
# Instalar webhook
sudo apt install -y webhook

# Criar script de deploy
nano /home/deploy/deploy.sh
```

```bash
#!/bin/bash
cd /home/deploy/apps/cobrancafacil-api
git pull origin main
npm ci --production
npx prisma migrate deploy
npm run build
pm2 restart cobrancafacil-api
```

```bash
chmod +x /home/deploy/deploy.sh

# Configurar webhook
nano /home/deploy/hooks.json
```

```json
[
  {
    "id": "deploy-api",
    "execute-command": "/home/deploy/deploy.sh",
    "command-working-directory": "/home/deploy/apps/cobrancafacil-api",
    "response-message": "Deploying...",
    "trigger-rule": {
      "match": {
        "type": "payload-hmac-sha256",
        "secret": "seu_secret_webhook",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
```

```bash
# Iniciar webhook
webhook -hooks /home/deploy/hooks.json -verbose &
```

---

### Deploy Frontend (VPS ou Vercel)

**Opção 1: Frontend na mesma VPS**

```bash
# Criar diretório
cd /home/deploy/apps
mkdir cobrancafacil-frontend
cd cobrancafacil-frontend

git clone https://github.com/seu-usuario/cobrancafacil-frontend.git .

# Instalar e buildar
npm install
npm run build

# Configurar Nginx para servir SPA
sudo nano /etc/nginx/sites-available/cobrancafacil-frontend
```

```nginx
server {
    listen 80;
    server_name app.seudominio.com;

    root /home/deploy/apps/cobrancafacil-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cobrancafacil-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar SSL
sudo certbot --nginx -d app.seudominio.com
```

**Opção 2: Frontend na Vercel (recomendado)**

```bash
# No diretório do frontend local
npm install -g vercel
vercel login
vercel

# Configurar env
vercel env add REACT_APP_API_URL production
# Inserir: https://api.seudominio.com/api/v1

vercel --prod
```

---

### Exemplos de Commits Padronizados (Commitlint)

```bash
# ✅ Commits válidos
git commit -m "feat: adicionar endpoint de criar fatura"
git commit -m "fix: corrigir cálculo de taxa da plataforma"
git commit -m "docs: atualizar README com instruções de deploy"
git commit -m "refactor: melhorar estrutura do InvoiceRepository"
git commit -m "test: adicionar testes para CreateInvoiceUseCase"
git commit -m "chore: atualizar dependências do projeto"

# ❌ Commits inválidos (Husky vai bloquear)
git commit -m "arrumei bug"
git commit -m "alterações"
git commit -m "WIP"
```

**Tipos permitidos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração
- `test`: Adicionar/corrigir testes
- `chore`: Tarefas de manutenção
- `perf`: Melhoria de performance
- `ci`: Mudanças em CI/CD

---

### Monitoramento e Logs

**1. Ver logs da aplicação**
```bash
# Logs em tempo real
pm2 logs cobrancafacil-api

# Logs específicos
pm2 logs cobrancafacil-api --lines 100

# Monitorar recursos
pm2 monit
```

**2. Logs do Nginx**
```bash
# Logs de acesso
sudo tail -f /var/log/nginx/access.log

# Logs de erro
sudo tail -f /var/log/nginx/error.log
```

**3. Monitoramento de recursos**
```bash
# CPU e memória
htop

# Espaço em disco
df -h

# Conexões do banco
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

---

### Backup Automático do Banco

```bash
# Criar script de backup
nano /home/deploy/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="cobrancafacil_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -U cobrancafacil_user cobrancafacil > $BACKUP_DIR/$FILENAME

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup realizado: $FILENAME"
```

```bash
chmod +x /home/deploy/backup-db.sh

# Adicionar ao cron (todo dia às 3h)
crontab -e
```

```cron
0 3 * * * /home/deploy/backup-db.sh >> /home/deploy/logs/backup.log 2>&1
```

---

### Checklist Final de Deploy

**VPS**
- [ ] PostgreSQL rodando
- [ ] Backend buildado e rodando no PM2
- [ ] Nginx configurado e rodando
- [ ] SSL configurado (HTTPS)
- [ ] Firewall configurado
- [ ] Logs funcionando

**GitHub Actions**
- [ ] Workflow criado
- [ ] Secrets configurados
- [ ] Deploy automático funcionando
- [ ] Testes rodando antes do deploy

**Husky**
- [ ] Hooks instalados
- [ ] Commitlint funcionando
- [ ] Lint-staged funcionando
- [ ] Commits padronizados

**Monitoramento**
- [ ] PM2 salvando logs
- [ ] Backup automático configurado
- [ ] Alerts configurados (opcional)

**Testes**
- [ ] API responde (https://api.seudominio.com/health)
- [ ] Frontend carrega (https://app.seudominio.com)
- [ ] Login funciona
- [ ] Criar fatura funciona
- [ ] Webhook processa

---

**Tempo Total Estimado**: 30 dias úteis (6 semanas)
**Recursos**: 1 desenvolvedor full-stack
**Custo Mensal VPS**: ~R$ 20-50 (Contabo/Hetzner) ou ~$6-12 (DigitalOcean/Vultr)# Plano de Execução MVP - CobrançaFácil
## API Backend + Frontend Mobile-First

---

## Visão Geral

**Objetivo**: Lançar MVP funcional em 4-6 semanas com backend Clean Architecture + frontend React já desenvolvido.

**Stack**:
- Backend: Node.js + TypeScript + Prisma + PostgreSQL + Clean Architecture
- Frontend: React + TypeScript + TailwindCSS (já pronto)
- Deploy: Railway (backend + DB) + Vercel (frontend)

---

## Fase 1: Setup Inicial (3-4 dias)

### Dia 1: Infraestrutura Base

**Backend**
```bash
# Criar projeto
mkdir cobrancafacil-api
cd cobrancafacil-api
npm init -y

# Instalar dependências
npm install express prisma @prisma/client bcrypt jsonwebtoken
npm install -D typescript @types/express @types/node ts-node-dev @types/bcrypt @types/jsonwebtoken

# Configurar TypeScript
npx tsc --init
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**package.json scripts**
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js"
  }
}
```

**Estrutura de pastas**
```bash
mkdir -p src/{domain,application,infrastructure,shared}
mkdir -p src/domain/{entities,repositories,errors}
mkdir -p src/application/{use-cases,dtos,services}
mkdir -p src/infrastructure/{database,http,external-services,di}
```

---

### Dia 2: Banco de Dados

**Configurar Prisma**
```bash
npx prisma init
```

**Copiar schema.prisma** (do documento anterior - schema completo)

**Configurar Railway**
1. Criar conta em railway.app
2. New Project → PostgreSQL
3. Copiar DATABASE_URL

**.env**
```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="seu_secret_aqui"
ASAAS_API_KEY="sua_key_asaas"
ASAAS_WALLET_ID="seu_wallet_id"
PORT=3000
```

**Rodar migrations**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### Dia 3: Entidades de Domínio Core

**Criar arquivos** (copiar do documento Clean Architecture):
- `src/domain/entities/Tenant.ts`
- `src/domain/entities/Customer.ts`
- `src/domain/entities/Invoice.ts`
- `src/domain/errors/DomainError.ts`

**Testar compilação**
```bash
npm run build
```

---

### Dia 4: Repositórios Base

**Interfaces**
- `src/domain/repositories/ITenantRepository.ts`
- `src/domain/repositories/ICustomerRepository.ts`
- `src/domain/repositories/IInvoiceRepository.ts`

**Implementações Prisma**
- `src/infrastructure/database/repositories/PrismaTenantRepository.ts`
- `src/infrastructure/database/repositories/PrismaCustomerRepository.ts`
- `src/infrastructure/database/repositories/PrismaInvoiceRepository.ts`

---

## Fase 2: Autenticação e Clientes (5-6 dias)

### Dia 5-6: Sistema de Autenticação

**Use Cases**
- `src/application/use-cases/RegisterTenantUseCase.ts`
- `src/application/use-cases/LoginTenantUseCase.ts`

**Implementação RegisterTenantUseCase**
```typescript
export class RegisterTenantUseCase {
  constructor(
    private tenantRepository: ITenantRepository,
    private asaasService: IAsaasService
  ) {}

  async execute(dto: RegisterDTO): Promise<{ tenant: Tenant; token: string }> {
    // 1. Verificar email duplicado
    const exists = await this.tenantRepository.findByEmail(dto.email);
    if (exists) throw new DomainError('Email já cadastrado');

    // 2. Criar subconta no Asaas
    const asaasAccount = await this.asaasService.createCustomer({
      name: dto.name,
      email: dto.email,
      cpfCnpj: dto.document
    });

    // 3. Criar tenant
    const tenant = Tenant.create({
      email: dto.email,
      name: dto.name,
      document: dto.document,
      asaasCustomerId: asaasAccount.id
    });

    // 4. Persistir
    await this.tenantRepository.save(tenant);

    // 5. Gerar token
    const token = jwt.sign(
      { sub: tenant.id, email: tenant.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return { tenant, token };
  }
}
```

**Controllers**
- `src/infrastructure/http/controllers/AuthController.ts`

**Routes**
- `src/infrastructure/http/routes/auth.routes.ts`

**Middleware Auth**
- `src/infrastructure/http/middlewares/authMiddleware.ts`

---

### Dia 7-8: CRUD de Clientes

**Use Cases**
- `src/application/use-cases/CreateCustomerUseCase.ts`
- `src/application/use-cases/ListCustomersUseCase.ts`
- `src/application/use-cases/GetCustomerUseCase.ts`
- `src/application/use-cases/UpdateCustomerUseCase.ts`

**Controller + Routes**
- `src/infrastructure/http/controllers/CustomerController.ts`
- `src/infrastructure/http/routes/customer.routes.ts`

**Endpoints**
- POST `/api/v1/customers` - Criar
- GET `/api/v1/customers` - Listar (com paginação)
- GET `/api/v1/customers/:id` - Detalhes
- PUT `/api/v1/customers/:id` - Atualizar
- DELETE `/api/v1/customers/:id` - Desativar

---

### Dia 9-10: Integração Asaas

**Interface do Serviço**
- `src/application/services/IAsaasService.ts`

**Implementação**
- `src/infrastructure/external-services/AsaasService.ts`

**Métodos necessários**
```typescript
interface IAsaasService {
  createCustomer(data: CreateCustomerDTO): Promise<AsaasCustomer>;
  createCharge(data: CreateChargeDTO): Promise<AsaasCharge>;
  getCharge(chargeId: string): Promise<AsaasCharge>;
}
```

**Testar no Asaas Sandbox**
1. Criar conta em asaas.com
2. Pegar API key de sandbox
3. Testar criação de cobrança
4. Configurar webhook URL

---

## Fase 3: Cobranças e Pagamentos (6-7 dias)

### Dia 11-13: Sistema de Faturas

**Entidades adicionais**
- `src/domain/entities/Payment.ts`
- `src/domain/entities/Transaction.ts`

**Use Cases**
- `src/application/use-cases/CreateInvoiceUseCase.ts` (CRÍTICO)
- `src/application/use-cases/ListInvoicesUseCase.ts`
- `src/application/use-cases/GetInvoiceUseCase.ts`

**Repositórios**
- `src/infrastructure/database/repositories/PrismaPaymentRepository.ts`
- `src/infrastructure/database/repositories/PrismaTransactionRepository.ts`

**Controller + Routes**
- `src/infrastructure/http/controllers/InvoiceController.ts`
- `src/infrastructure/http/routes/invoice.routes.ts`

**Endpoints**
- POST `/api/v1/invoices` - Criar fatura
- GET `/api/v1/invoices` - Listar
- GET `/api/v1/invoices/:id` - Detalhes

---

### Dia 14-16: Webhooks do Asaas (CRÍTICO)

**Use Case Principal**
- `src/application/use-cases/ProcessPaymentWebhookUseCase.ts`

**Implementação completa**
```typescript
export class ProcessPaymentWebhookUseCase {
  async execute(payload: AsaasWebhookPayload): Promise<void> {
    // 1. Buscar invoice
    const invoice = await this.invoiceRepository.findByAsaasChargeId(
      payload.payment.id
    );
    if (!invoice) throw new Error('Invoice not found');

    // 2. Processar em transaction
    await this.prisma.$transaction(async (tx) => {
      // Atualizar invoice
      invoice.markAsPaid(new Date(payload.payment.paymentDate));
      await tx.invoice.update({ where: { id: invoice.id }, data: {...} });

      // Criar payment
      const payment = Payment.create({...});
      await tx.payment.create({ data: {...} });

      // Criar transaction (nossa receita)
      const transaction = Transaction.createPlatformFee(invoice);
      await tx.transaction.create({ data: {...} });
    });

    // 3. Enviar notificação
    await this.emailService.sendPaymentReceived({...});
  }
}
```

**Controller**
- `src/infrastructure/http/controllers/WebhookController.ts`

**Endpoint**
- POST `/api/v1/webhooks/asaas` (sem autenticação, validar assinatura)

**Configurar no Asaas**
1. Ir em Configurações → Webhooks
2. Adicionar URL: `https://sua-api.railway.app/api/v1/webhooks/asaas`
3. Selecionar eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED

**Testar webhook**
```bash
# Usar ngrok para expor localhost
ngrok http 3000

# Criar cobrança de teste
# Pagar via PIX sandbox
# Verificar se webhook chegou e processou
```

---

### Dia 17: Dashboard e Métricas

**Use Case**
- `src/application/use-cases/GetDashboardOverviewUseCase.ts`

**Implementação**
```typescript
export class GetDashboardOverviewUseCase {
  async execute(tenantId: string): Promise<DashboardData> {
    // Queries agregadas
    const [customers, invoices, payments] = await Promise.all([
      this.customerRepository.countByTenant(tenantId),
      this.invoiceRepository.aggregateByTenant(tenantId),
      this.paymentRepository.aggregateByTenant(tenantId)
    ]);

    return {
      customers: { total: customers.total, active: customers.active },
      invoices: { total, pending, paid, overdue },
      revenue: { thisMonth, lastMonth, growth }
    };
  }
}
```

**Endpoint**
- GET `/api/v1/dashboard/overview`

---

## Fase 4: Assinaturas e Automação (5-6 dias)

### Dia 18-20: Sistema de Assinaturas

**Entidade**
- `src/domain/entities/Subscription.ts`

**Use Cases**
- `src/application/use-cases/CreateSubscriptionUseCase.ts`
- `src/application/use-cases/ListSubscriptionsUseCase.ts`

**Repositório**
- `src/infrastructure/database/repositories/PrismaSubscriptionRepository.ts`

**Controller + Routes**
- `src/infrastructure/http/controllers/SubscriptionController.ts`
- `src/infrastructure/http/routes/subscription.routes.ts`

---

### Dia 21-23: Jobs Automáticos

**Instalar node-cron**
```bash
npm install node-cron @types/node-cron
```

**Use Case**
- `src/application/use-cases/GenerateInvoicesFromSubscriptionsUseCase.ts`

**Arquivo de Jobs**
- `src/infrastructure/jobs/cron.ts`

```typescript
import cron from 'node-cron';

export function startCronJobs(container: Container) {
  // Job 1: Gerar faturas (todo dia 00:00)
  cron.schedule('0 0 * * *', async () => {
    const useCase = container.getGenerateInvoicesUseCase();
    const result = await useCase.execute();
    console.log(`Generated ${result.generated} invoices`);
  });

  // Job 2: Marcar vencidas (todo dia 00:10)
  cron.schedule('10 0 * * *', async () => {
    const useCase = container.getMarkOverdueInvoicesUseCase();
    await useCase.execute();
  });
}
```

**Chamar no main.ts**
```typescript
// src/main.ts
import { startCronJobs } from './infrastructure/jobs/cron';

// ... setup do express

startCronJobs(container);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Cron jobs started');
});
```

---

## Fase 5: Integração Frontend (3-4 dias)

### Dia 24-25: Ajustar Frontend

**Configurar API Base URL**
```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1'
});

// Interceptor para adicionar token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Serviços do Frontend**
```typescript
// frontend/src/services/authService.ts
export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.data.token);
    return data.data;
  },

  async register(name: string, email: string, password: string) {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', data.data.token);
    return data.data;
  }
};

// frontend/src/services/customerService.ts
export const customerService = {
  async list() {
    const { data } = await api.get('/customers');
    return data.data.customers;
  },

  async create(customer: CreateCustomerDTO) {
    const { data } = await api.post('/customers', customer);
    return data.data;
  }
};

// frontend/src/services/invoiceService.ts
export const invoiceService = {
  async list() {
    const { data } = await api.get('/invoices');
    return data.data.invoices;
  },

  async create(invoice: CreateInvoiceDTO) {
    const { data } = await api.post('/invoices', invoice);
    return data.data;
  }
};
```

**Adaptar Context**
```typescript
// frontend/src/contexts/AppContext.tsx
import { authService, customerService, invoiceService } from '../services';

const login = async (email: string, password: string) => {
  const data = await authService.login(email, password);
  setUser(data.tenant);
};

const addClient = async (client: CreateCustomerDTO) => {
  const customer = await customerService.create(client);
  setClients([...clients, customer]);
};

const addCharge = async (charge: CreateInvoiceDTO) => {
  const invoice = await invoiceService.create(charge);
  // Atualizar estado...
};
```

---

### Dia 26-27: Testes de Integração

**Testar fluxo completo**
1. Cadastro de tenant
2. Login
3. Adicionar cliente
4. Criar cobrança
5. Simular pagamento no Asaas sandbox
6. Verificar webhook processado
7. Ver atualização no dashboard

**Ajustes finais**
- Tratar erros da API no frontend
- Loading states
- Mensagens de sucesso/erro
- Validações de formulário

---

## Fase 6: Deploy e Testes Finais (2-3 dias)

### Dia 28: Deploy Backend (Railway)

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Criar projeto
railway init

# Adicionar PostgreSQL
railway add

# Deploy
railway up

# Configurar variáveis de ambiente
railway variables set JWT_SECRET=...
railway variables set ASAAS_API_KEY=...
railway variables set ASAAS_WALLET_ID=...

# Rodar migrations
railway run npx prisma migrate deploy
```

**Configurar domínio**
- Railway gera URL automática
- Ou configurar domínio custom

---

### Dia 29: Deploy Frontend (Vercel)

```bash
# No diretório do frontend
npm install -g vercel

# Deploy
vercel

# Configurar env vars
vercel env add REACT_APP_API_URL production
# Inserir: https://sua-api.railway.app/api/v1
```

**Build otimizado**
```bash
npm run build
vercel --prod
```

---

### Dia 30: Testes Finais

**Checklist de Validação**
- [ ] Cadastro funciona
- [ ] Login funciona
- [ ] CRUD de clientes funciona
- [ ] Criar fatura funciona
- [ ] Link de pagamento abre
- [ ] Pagamento PIX sandbox funciona
- [ ] Webhook processa corretamente
- [ ] Dashboard atualiza
- [ ] Jobs rodam (verificar logs)
- [ ] Mobile responsivo

**Testes de Estresse**
- Criar 10 clientes
- Criar 20 faturas
- Simular 10 pagamentos simultâneos
- Verificar performance

---

## Cronograma Resumido

| Semana | Fase | Entregas |
|--------|------|----------|
| **1** | Setup + Base | Infra, Entidades, Repositórios, Auth |
| **2** | Clientes + Asaas | CRUD Clientes, Integração Asaas |
| **3** | Cobranças | Faturas, Webhooks, Dashboard |
| **4** | Assinaturas | Subscriptions, Cron Jobs |
| **5** | Frontend | Integração API, Testes |


---

## Dependências Críticas

**Precisa ter ANTES de começar**
1. Conta no Asaas (sandbox ativa)
2. Conta no Railway (ou Render/Heroku)
3. Conta no Vercel
4. Domínio (opcional, pode usar subdomínio gratuito)

---

## Riscos e Mitigações

**Risco 1: Webhook não funciona**
- Mitigação: Usar ngrok para testar local primeiro
- Backup: Polling manual temporário

**Risco 2: Asaas sandbox instável**
- Mitigação: Ter mock do Asaas para desenvolvimento
- Backup: Testar em produção com valores baixos

**Risco 3: Atraso no desenvolvimento**
- Mitigação: Cortar features não-essenciais (assinaturas podem esperar)
- Prioridade: Auth → Clientes → Faturas → Webhooks

---

## Checklist Final MVP

**Backend Essencial**
- [ ] Autenticação JWT
- [ ] CRUD Clientes
- [ ] Criar Fatura (com split Asaas)
- [ ] Webhook Payment Confirmed
- [ ] Dashboard Overview

**Backend Opcional (pode adiar)**
- [ ] Assinaturas
- [ ] Cron Jobs
- [ ] Relatórios avançados
- [ ] Notificações email

**Frontend**
- [ ] Login/Cadastro
- [ ] Dashboard
- [ ] Lista de Clientes
- [ ] Adicionar Cliente
- [ ] Criar Cobrança
- [ ] Ver Extrato

---

## Próximos Passos Pós-MVP

1. Feedback de 5-10 early adopters
2. Adicionar notificações WhatsApp
3. App mobile nativo
4. Melhorar dashboard (gráficos)
5. Sistema de assinaturas completo
6. Antecipação de recebíveis

---

**Tempo Total Estimado**: 30 dias úteis (6 semanas)
**Recursos**: 1 desenvolvedor full-stack
**Custo Mensal**: ~R$ 50 (Railway + Vercel free tier inicialmente)