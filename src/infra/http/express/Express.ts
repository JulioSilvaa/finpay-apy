import 'express-async-errors'

import type {  Request, Response } from 'express'
import express from 'express'

import { HTTPError } from '../../../shared/errors/HTTPError'
import CustomerRouter from '../../router/CustomerRouter'

const app = express()
const port = process.env.PORT || 3333

// Middleware for parsing request bodies
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Route registrations
app.use('/api/customer', CustomerRouter)

// Global error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  if (err instanceof HTTPError) {
    console.error(err.statusCode, err.message)
    return res.status(err.statusCode).json({ message: err.message })
  }

  console.error('Internal Server Error:', err)
  return res.status(500).json({ error: 'Internal Server Error' })
})

// Start server
app.listen(port, () => {
  console.log(`🚀 FinPay API listening on port ${port}`)
})

export default app
