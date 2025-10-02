import { beforeEach, describe, expect, it } from 'vitest'

import { Tenant } from '../../core/entities/Tenant'
import { DomainError } from '../../shared/errors'

describe('Tenant Entity', () => {
  describe('create', () => {
    it('should create a valid tenant', () => {
      const tenant = Tenant.create({
        email: 'tenant@example.com',
        name: 'Test Tenant',
        phone: '11999999999',
        document: '12345678901',
        businessType: 'MEI',
      })

      expect(tenant.id).toBeDefined()
      expect(tenant.email).toBe('tenant@example.com')
      expect(tenant.name).toBe('Test Tenant')
      expect(tenant.phone).toBe('11999999999')
      expect(tenant.document).toBe('12345678901')
      expect(tenant.businessType).toBe('MEI')
      expect(tenant.feePercentage).toBe(1.5)
      expect(tenant.isActive).toBe(true)
      expect(tenant.createdAt).toBeInstanceOf(Date)
      expect(tenant.updatedAt).toBeInstanceOf(Date)
    })

    it('should create tenant with minimum required fields', () => {
      const tenant = Tenant.create({
        email: 'minimal@example.com',
        name: 'Minimal Tenant',
      })

      expect(tenant.id).toBeDefined()
      expect(tenant.email).toBe('minimal@example.com')
      expect(tenant.name).toBe('Minimal Tenant')
      expect(tenant.phone).toBeUndefined()
      expect(tenant.document).toBeUndefined()
      expect(tenant.businessType).toBeUndefined()
    })

    it('should throw error for invalid email', () => {
      expect(() => {
        Tenant.create({
          email: 'invalid-email',
          name: 'Test Tenant',
        })
      }).toThrow(DomainError)
    })

    it('should throw error for missing email', () => {
      expect(() => {
        Tenant.create({
          email: '',
          name: 'Test Tenant',
        })
      }).toThrow(DomainError)
    })

    it('should throw error for short name', () => {
      expect(() => {
        Tenant.create({
          email: 'test@example.com',
          name: 'AB',
        })
      }).toThrow(DomainError)
    })

    it('should throw error for missing name', () => {
      expect(() => {
        Tenant.create({
          email: 'test@example.com',
          name: '',
        })
      }).toThrow(DomainError)
    })
  })

  describe('reconstitute', () => {
    it('should reconstitute tenant from database props', () => {
      const props = {
        id: 'existing-id',
        email: 'existing@example.com',
        name: 'Existing Tenant',
        phone: '11888888888',
        document: '98765432100',
        businessType: 'LTDA',
        asaasCustomerId: 'asaas-123',
        asaasWalletId: 'wallet-456',
        feePercentage: 2.0,
        isActive: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      }

      const tenant = Tenant.reconstitute(props)

      expect(tenant.id).toBe('existing-id')
      expect(tenant.email).toBe('existing@example.com')
      expect(tenant.name).toBe('Existing Tenant')
      expect(tenant.feePercentage).toBe(2.0)
      expect(tenant.isActive).toBe(false)
      expect(tenant.asaasCustomerId).toBe('asaas-123')
      expect(tenant.asaasWalletId).toBe('wallet-456')
    })
  })

  describe('calculatePlatformFee', () => {
    let tenant: Tenant

    beforeEach(() => {
      tenant = Tenant.create({
        email: 'test@example.com',
        name: 'Test Tenant',
      })
    })

    it('should calculate platform fee correctly', () => {
      const fee = tenant.calculatePlatformFee(1000)
      expect(fee).toBe(15) // 1.5% of 1000
    })

    it('should calculate fee for decimal amounts', () => {
      const fee = tenant.calculatePlatformFee(1234.56)
      expect(fee).toBeCloseTo(18.52, 2)
    })

    it('should throw error for zero amount', () => {
      expect(() => {
        tenant.calculatePlatformFee(0)
      }).toThrow(DomainError)
    })

    it('should throw error for negative amount', () => {
      expect(() => {
        tenant.calculatePlatformFee(-100)
      }).toThrow(DomainError)
    })

    it('should use custom fee percentage if set', () => {
      const customTenant = Tenant.reconstitute({
        id: 'custom-id',
        email: 'custom@example.com',
        name: 'Custom Tenant',
        feePercentage: 3.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const fee = customTenant.calculatePlatformFee(1000)
      expect(fee).toBe(30) // 3.0% of 1000
    })
  })

  describe('linkAsaasAccount', () => {
    let tenant: Tenant

    beforeEach(() => {
      tenant = Tenant.create({
        email: 'test@example.com',
        name: 'Test Tenant',
      })
    })

    it('should link Asaas account successfully', () => {
      const oldUpdatedAt = tenant.updatedAt

      tenant.linkAsaasAccount('asaas-customer-123', 'asaas-wallet-456')

      expect(tenant.asaasCustomerId).toBe('asaas-customer-123')
      expect(tenant.asaasWalletId).toBe('asaas-wallet-456')
      expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime()
      )
    })

    it('should throw error for missing customer ID', () => {
      expect(() => {
        tenant.linkAsaasAccount('', 'wallet-123')
      }).toThrow(DomainError)
    })

    it('should throw error for missing wallet ID', () => {
      expect(() => {
        tenant.linkAsaasAccount('customer-123', '')
      }).toThrow(DomainError)
    })
  })

  describe('activate/deactivate', () => {
    let tenant: Tenant

    beforeEach(() => {
      tenant = Tenant.create({
        email: 'test@example.com',
        name: 'Test Tenant',
      })
    })

    it('should deactivate tenant', () => {
      expect(tenant.isActive).toBe(true)

      const oldUpdatedAt = tenant.updatedAt
      tenant.deactivate()

      expect(tenant.isActive).toBe(false)
      expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime()
      )
    })

    it('should activate tenant', () => {
      tenant.deactivate()
      expect(tenant.isActive).toBe(false)

      const oldUpdatedAt = tenant.updatedAt
      tenant.activate()

      expect(tenant.isActive).toBe(true)
      expect(tenant.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime()
      )
    })

    it('should be idempotent when deactivating already inactive tenant', () => {
      tenant.deactivate()
      const firstUpdate = tenant.updatedAt

      tenant.deactivate()
      const secondUpdate = tenant.updatedAt

      expect(tenant.isActive).toBe(false)
      expect(secondUpdate.getTime()).toBeGreaterThanOrEqual(
        firstUpdate.getTime()
      )
    })

    it('should be idempotent when activating already active tenant', () => {
      const firstUpdate = tenant.updatedAt

      tenant.activate()
      const secondUpdate = tenant.updatedAt

      expect(tenant.isActive).toBe(true)
      expect(secondUpdate.getTime()).toBeGreaterThanOrEqual(
        firstUpdate.getTime()
      )
    })
  })

  describe('toJSON', () => {
    it('should serialize tenant to JSON', () => {
      const tenant = Tenant.create({
        email: 'json@example.com',
        name: 'JSON Tenant',
        phone: '11777777777',
      })

      const json = tenant.toJSON()

      expect(json).toEqual({
        id: tenant.id,
        email: 'json@example.com',
        name: 'JSON Tenant',
        phone: '11777777777',
        document: undefined,
        businessType: undefined,
        asaasCustomerId: undefined,
        asaasWalletId: undefined,
        feePercentage: 1.5,
        isActive: true,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      })
    })
  })
})
