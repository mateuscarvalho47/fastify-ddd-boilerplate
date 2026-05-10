export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT'
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED'
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN'
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  readonly fields?: Record<string, string>

  constructor(message: string, fields?: Record<string, string>) {
    super(message)
    if (fields !== undefined) {
      this.fields = fields
    }
  }
}
