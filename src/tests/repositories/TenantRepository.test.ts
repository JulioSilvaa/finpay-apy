import { beforeEach, describe, expect, it } from 'vitest'

import { Tenant } from '../../core/entities/Tenant'
import { TenantRepositoryInMemory } from '../../infra/repositories/RepositoryInMemory'

describe('TenantRepository', () => {
  let repository: TenantRepositoryInMemory

  beforeEach(() => {
    repository = new TenantRepositoryInMemory()
    repository.clear()
  })

  describe('create', () => {
    it('should create and return a tenant', async () => {
      const tenant = Tenant.create({
        email: 'test@example.com',
        name: 'Test Tenant',
      })

      const created = await repository.create(tenant)

      expect(created).toBe(tenant)
      expect(created.id).toBeDefined()
    })
  })

  describe('findById', () => {
    it('should find tenant by id', async () => {
      const tenant = Tenant.create({
        email: 'find@example.com',
        name: 'Find Tenant',
      })

      await repository.create(tenant)
      const found = await repository.findById(tenant.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(tenant.id)
      expect(found?.email).toBe('find@example.com')
    })

    it('should return null when tenant not found', async () => {
      const found = await repository.findById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should find tenant by email', async () => {
      const tenant = Tenant.create({
        email: 'unique@example.com',
        name: 'Unique Tenant',
      })

      await repository.create(tenant)
      const found = await repository.findByEmail('unique@example.com')

      expect(found).toBeDefined()
      expect(found?.email).toBe('unique@example.com')
    })

    it('should return null when email not found', async () => {
      const found = await repository.findByEmail('notfound@example.com')
      expect(found).toBeNull()
    })

    it('should be case-sensitive', async () => {
      const tenant = Tenant.create({
        email: 'case@example.com',
        name: 'Case Tenant',
      })

      await repository.create(tenant)
      const found = await repository.findByEmail('CASE@example.com')

      expect(found).toBeNull()
    })
  })

  describe('findByDocument', () => {
    it('should find tenant by document', async () => {
      const tenant = Tenant.create({
        email: 'doc@example.com',
        name: 'Doc Tenant',
        document: '12345678901',
      })

      await repository.create(tenant)
      const found = await repository.findByDocument('12345678901')

      expect(found).toBeDefined()
      expect(found?.document).toBe('12345678901')
    })

    it('should return null when document not found', async () => {
      const found = await repository.findByDocument('99999999999')
      expect(found).toBeNull()
    })

    it('should return null for tenant without document', async () => {
      const tenant = Tenant.create({
        email: 'nodoc@example.com',
        name: 'No Doc Tenant',
      })

      await repository.create(tenant)
      const found = await repository.findByDocument('12345678901')

      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update tenant successfully', async () => {
      const tenant = Tenant.create({
        email: 'update@example.com',
        name: 'Original Name',
      })

      await repository.create(tenant)

      tenant.linkAsaasAccount('asaas-123', 'wallet-456')
      const updated = await repository.update(tenant)

      expect(updated.asaasCustomerId).toBe('asaas-123')
      expect(updated.asaasWalletId).toBe('wallet-456')
    })

    it('should throw error when updating non-existent tenant', async () => {
      const tenant = Tenant.create({
        email: 'ghost@example.com',
        name: 'Ghost Tenant',
      })

      await expect(repository.update(tenant)).rejects.toThrow(
        'Tenant not found'
      )
    })
  })

  describe('delete', () => {
    it('should delete tenant successfully', async () => {
      const tenant = Tenant.create({
        email: 'delete@example.com',
        name: 'Delete Tenant',
      })

      await repository.create(tenant)
      await repository.delete(tenant.id)

      const found = await repository.findById(tenant.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent tenant', async () => {
      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        'Tenant not found'
      )
    })
  })

  describe('activate', () => {
    it('should activate deactivated tenant', async () => {
      const tenant = Tenant.create({
        email: 'activate@example.com',
        name: 'Activate Tenant',
      })

      tenant.deactivate()
      await repository.create(tenant)
      await repository.activate(tenant.id)

      const found = await repository.findById(tenant.id)
      expect(found?.isActive).toBe(true)
    })

    it('should throw error when activating non-existent tenant', async () => {
      await expect(repository.activate('non-existent-id')).rejects.toThrow(
        'Tenant not found'
      )
    })
  })

  describe('deactivate', () => {
    it('should deactivate active tenant', async () => {
      const tenant = Tenant.create({
        email: 'deactivate@example.com',
        name: 'Deactivate Tenant',
      })

      await repository.create(tenant)
      await repository.deactivate(tenant.id)

      const found = await repository.findById(tenant.id)
      expect(found?.isActive).toBe(false)
    })

    it('should throw error when deactivating non-existent tenant', async () => {
      await expect(repository.deactivate('non-existent-id')).rejects.toThrow(
        'Tenant not found'
      )
    })
  })

  describe('list', () => {
    it('should return empty array when no tenants', async () => {
      const tenants = await repository.list()
      expect(tenants).toEqual([])
    })

    it('should return all tenants', async () => {
      const tenant1 = Tenant.create({
        email: 'tenant1@example.com',
        name: 'Tenant 1',
      })

      const tenant2 = Tenant.create({
        email: 'tenant2@example.com',
        name: 'Tenant 2',
      })

      const tenant3 = Tenant.create({
        email: 'tenant3@example.com',
        name: 'Tenant 3',
      })

      await repository.create(tenant1)
      await repository.create(tenant2)
      await repository.create(tenant3)

      const tenants = await repository.list()
      expect(tenants).toHaveLength(3)
      expect(tenants).toContain(tenant1)
      expect(tenants).toContain(tenant2)
      expect(tenants).toContain(tenant3)
    })

    it('should return both active and inactive tenants', async () => {
      const activeTenant = Tenant.create({
        email: 'active@example.com',
        name: 'Active Tenant',
      })

      const inactiveTenant = Tenant.create({
        email: 'inactive@example.com',
        name: 'Inactive Tenant',
      })
      inactiveTenant.deactivate()

      await repository.create(activeTenant)
      await repository.create(inactiveTenant)

      const tenants = await repository.list()
      expect(tenants).toHaveLength(2)
      expect(tenants.some((t) => t.isActive)).toBe(true)
      expect(tenants.some((t) => !t.isActive)).toBe(true)
    })
  })

  describe('clear', () => {
    it('should remove all tenants', async () => {
      const tenant1 = Tenant.create({
        email: 'clear1@example.com',
        name: 'Clear Tenant 1',
      })

      const tenant2 = Tenant.create({
        email: 'clear2@example.com',
        name: 'Clear Tenant 2',
      })

      await repository.create(tenant1)
      await repository.create(tenant2)

      repository.clear()

      const tenants = await repository.list()
      expect(tenants).toHaveLength(0)
    })
  })
})
