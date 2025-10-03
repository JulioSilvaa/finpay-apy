import type {  Request, Response } from 'express'

import { CreateCustomerUseCase } from '../core/useCases/customer/CreateCustomer'
import { DeleteCustomerUseCase } from '../core/useCases/customer/DeleteCustomer'
import { UpdateCustomerUseCase } from '../core/useCases/customer/UpdateCustomer'
import { CustomerRepositoryInMemory } from '../infra/repositories/RepositoryInMemory/CustomerRepositoryInMemory'
import { TenantRepositoryInMemory } from '../infra/repositories/RepositoryInMemory/TenantRepositoryInMemory'
import { HTTPError } from '../shared/errors/HTTPError'

export default class CustomerController {
  static async create(req: Request, res: Response) {
    const { tenantId, name, email, phone, document } = req.body

    if (!tenantId || !name || !email || !phone) {
      throw new HTTPError(400, 'Campos obrigatórios não preenchidos!')
    }

    const customerRepository = new CustomerRepositoryInMemory()
    const tenantRepository = new TenantRepositoryInMemory()

    const createCustomer = new CreateCustomerUseCase(customerRepository, tenantRepository)

    const customer = await createCustomer.execute({
      tenantId,
      name,
      email,
      phone,
      document,
    })

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso!',
      data: customer,
    })
  }

  static async findById(req: Request, res: Response) {
    const { id } = req.params

    if (!id) {
      throw new HTTPError(400, 'ID não fornecido!')
    }

    const customerRepository = new CustomerRepositoryInMemory()
    const findCustomer = new FindCustomerByIdUseCase(customerRepository)

    const customer = await findCustomer.execute(id)

    if (!customer) {
      throw new HTTPError(404, 'Cliente não encontrado!')
    }

    return res.status(200).json(customer)
  }

  static async findByEmail(req: Request, res: Response) {
    const { email } = req.params

    if (!email) {
      throw new HTTPError(400, 'Email não fornecido!')
    }

    const customerRepository = new CustomerRepositoryInMemory()
    const findCustomer = new FindCustomerByEmailUseCase(customerRepository)

    const customer = await findCustomer.execute(email)

    if (!customer) {
      throw new HTTPError(404, 'Cliente não encontrado!')
    }

    return res.status(200).json(customer)
  }

  static async findAll(req: Request, res: Response) {
    const customerRepository = new CustomerRepositoryInMemory()
    const findAllCustomers = new FindAllCustomersUseCase(customerRepository)

    const customers = await findAllCustomers.execute()

    return res.status(200).json({
      total: customers.length,
      data: customers,
    })
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params
    const { name, email, phone, document, address } = req.body

    if (!id) {
      throw new HTTPError(400, 'ID não fornecido!')
    }

    const customerRepository = new CustomerRepositoryInMemory()
    const updateCustomer = new UpdateCustomerUseCase(customerRepository)

    const customer = await updateCustomer.execute(id, {
      name,
      email,
      phone,
      document,
      address,
    })

    return res.status(200).json({
      message: 'Cliente atualizado com sucesso!',
      data: customer,
    })
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params

    if (!id) {
      throw new HTTPError(400, 'ID não fornecido!')
    }

    const customerRepository = new CustomerRepositoryInMemory()
    const deleteCustomer = new DeleteCustomerUseCase(customerRepository)

    await deleteCustomer.execute(id)

    return res.status(200).json({
      message: 'Cliente deletado com sucesso!',
    })
  }
}
