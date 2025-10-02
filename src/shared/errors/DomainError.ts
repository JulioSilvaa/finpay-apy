export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
    Object.setPrototypeOf(this, DomainError.prototype)
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} com ID ${id} não encontrado`)
    this.name = 'EntityNotFoundError'
    Object.setPrototypeOf(this, EntityNotFoundError.prototype)
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(rule: string) {
    super(`Violação de regra de negócio: ${rule}`)
    this.name = 'BusinessRuleViolationError'
    Object.setPrototypeOf(this, BusinessRuleViolationError.prototype)
  }
}
