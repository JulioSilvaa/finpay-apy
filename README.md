# FinPay API

Sistema de cobrança para autônomos com **CORE Architecture**.

## 📂 Estrutura do Projeto

```
src/
├── core/                    # Núcleo da aplicação (Business Logic)
│   ├── entities/           # Entidades de domínio (Tenant, Customer, Invoice)
│   ├── use-cases/          # Casos de uso (CreateInvoice, ProcessPayment)
│   ├── repositories/       # Interfaces dos repositórios
│   └── services/           # Interfaces de serviços externos
│
├── infrastructure/         # Implementações técnicas
│   ├── database/
│   │   ├── models/        # Modelos Prisma
│   │   └── repositories/  # Implementações dos repositórios
│   ├── external/          # Integrações (Asaas, Email)
│   └── security/          # JWT, Auth
│
├── presentation/           # Camada de apresentação (HTTP)
│   ├── controllers/       # Controllers HTTP
│   ├── routes/           # Definição de rotas
│   ├── middlewares/      # Middlewares (auth, error handler)
│   ├── validators/       # Validações de request
│   └── dtos/            # Data Transfer Objects
│
├── shared/                # Código compartilhado
│   ├── errors/           # Erros customizados
│   ├── types/            # Types TypeScript
│   ├── utils/            # Utilitários
│   └── constants/        # Constantes
│
├── config/               # Configurações
│   └── env.ts           # Variáveis de ambiente
│
└── main.ts              # Entry point
```

## 🚀 Tecnologias

- **Node.js** + **TypeScript**
- **Vitest** para testes
- **Prisma** ORM
- **CORE Architecture** (mais simples que Clean Architecture)
- **Husky** + **ESLint** + **Commitlint**

## 📦 Instalação

```bash
npm install
```

## 🛠️ Comandos

```bash
# Desenvolvimento
npm run dev

# Testes
npm test

# Lint
npm run lint
npm run lint:fix

# Build
npm run build

# Produção
npm start
```

## 🏗️ Arquitetura CORE

### CORE (Business Logic)
- **Entities**: Regras de negócio puras
- **Use Cases**: Orquestração da lógica
- **Repositories**: Interfaces (contratos)
- **Services**: Interfaces de serviços externos

### Infrastructure
- Implementações concretas
- Banco de dados (Prisma)
- Integrações externas

### Presentation
- HTTP (Controllers, Routes)
- Validações
- Middlewares

### Shared
- Código reutilizável
- Errors, Types, Utils

## 📝 Modelo de Negócio


- **Integração Asaas**: Split payment automático
- **Taxas da provedora de pagamento**: PIX grátis, Boleto x, Cartão x%

## ✅ CI/CD

- ✅ Husky hooks (pre-commit + commit-msg)
- ✅ GitHub Actions (lint + build)
- ✅ Commitlint (conventional commits)

## 📚 Documentação

Ver pasta `docs/emPeodução`

---

**CORE Architecture** - Simples, Clara e Escalável 🚀
