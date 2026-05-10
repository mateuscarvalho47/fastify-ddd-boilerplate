import { ValidationError } from '@shared/errors/domain-errors.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const EMAIL_MAX_LENGTH = 254

export class Email {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()

    if (normalized.length > EMAIL_MAX_LENGTH) {
      throw new ValidationError(`Email must be at most ${EMAIL_MAX_LENGTH} characters`)
    }

    if (!EMAIL_REGEX.test(normalized)) {
      throw new ValidationError('Invalid email format')
    }

    return new Email(normalized)
  }

  equals(other: Email): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
