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
}
