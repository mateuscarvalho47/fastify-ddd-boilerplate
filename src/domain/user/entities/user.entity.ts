import { UserCreatedEvent } from '@domain/user/events/user-created.event.js'
import type { Email } from '@domain/user/value-objects/email.js'
import { BaseEntity } from '@shared/types/base-entity.js'
import type { UniqueId } from '@shared/types/unique-id.js'
import type { UserRole } from '@shared/types/user-role.js'

export interface UserProps {
  id: UniqueId
  name: string
  email: Email
  passwordHash: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type CreateUserProps = Omit<UserProps, 'createdAt' | 'updatedAt'>

export class User extends BaseEntity<UserProps> {
  private constructor(props: UserProps) {
    super(props)
  }

  get name(): string {
    return this._props.name
  }

  get email(): Email {
    return this._props.email
  }

  get passwordHash(): string {
    return this._props.passwordHash
  }

  get role(): UserRole {
    return this._props.role
  }

  get isActive(): boolean {
    return this._props.isActive
  }

  get createdAt(): Date {
    return this._props.createdAt
  }

  get updatedAt(): Date {
    return this._props.updatedAt
  }

  static create(props: CreateUserProps): User {
    const now = new Date()
    const user = new User({ ...props, createdAt: now, updatedAt: now })
    user.addDomainEvent(new UserCreatedEvent(props.id.value, props.email.toString()))
    return user
  }

  static reconstitute(props: UserProps): User {
    return new User(props)
  }

  updateName(name: string): void {
    this._props.name = name
    this._props.updatedAt = new Date()
  }

  deactivate(): void {
    this._props.isActive = false
    this._props.updatedAt = new Date()
  }

  changePassword(passwordHash: string): void {
    this._props.passwordHash = passwordHash
    this._props.updatedAt = new Date()
  }

  isAdmin(): boolean {
    return this._props.role === 'admin'
  }
}
