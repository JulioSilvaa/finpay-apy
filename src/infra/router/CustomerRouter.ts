import { Router } from 'express'

import ExpressAdapter from '../../adapters/ExpressAdapter'
import CustomerController from '../../controllers/CustomerController'

const router = Router()

// Public routes
router.post('/', ExpressAdapter.create(CustomerController.create))
router.get('/', ExpressAdapter.create(CustomerController.findAll))
router.get('/:id', ExpressAdapter.create(CustomerController.findById))
router.get('/email/:email', ExpressAdapter.create(CustomerController.findByEmail))
router.patch('/:id', ExpressAdapter.create(CustomerController.update))
router.delete('/:id', ExpressAdapter.create(CustomerController.delete))

export default router
