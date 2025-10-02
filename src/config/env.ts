export const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  asaas: {
    apiKey: process.env.ASAAS_API_KEY || '',
    walletId: process.env.ASAAS_WALLET_ID || '',
  },

  email: {
    apiKey: process.env.MAILERSEND_API_KEY || '',
    fromEmail: process.env.MAILERSEND_FROM_EMAIL || '',
  },

  fees: {
    platform: Number(process.env.PLATFORM_FEE_PERCENTAGE) || 1.5, // Taxa da plataforma (%)
    asaas: {
      pix: Number(process.env.ASAAS_FEE_PIX) || 0, // PIX é grátis
      boleto: Number(process.env.ASAAS_FEE_BOLETO) || 3.49, // Taxa fixa boleto
      creditCard: Number(process.env.ASAAS_FEE_CREDIT_CARD) || 4.99, // Taxa cartão (%)
    },
  },
}
