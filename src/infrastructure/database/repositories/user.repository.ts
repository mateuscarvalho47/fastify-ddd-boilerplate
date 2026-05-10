import { User } from '@domain/user/entities/user.entity.js'
import type { IUserRepository } from '@domain/user/repositories/user.repository.interface.js'
import { Email } from '@domain/user/value-objects/email.js'
import type { NewUserRecord, UserRecord } from '@infrastructure/database/schema/users.schema.js'
import { usersTable } from '@infrastructure/database/schema/users.schema.js'
import type { PaginatedResult, PaginationParams } from '@shared/types/pagination.js'
import { buildPaginatedResult, toOffset } from '@shared/types/pagination.js'
import { UniqueId } from '@shared/types/unique-id.js'
import { count, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async findById(id: string): Promise<User | null> {
    const [record] = await this.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)

    return record ? this.toDomain(record) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const [record] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)

    return record ? this.toDomain(record) : null
  }

  async findAll(params: PaginationParams): Promise<PaginatedResult<User>> {
    const [records, countRows] = await Promise.all([
      this.db.select().from(usersTable).limit(params.limit).offset(toOffset(params)),
      this.db.select({ value: count() }).from(usersTable),
    ])

    const total = Number(countRows[0]?.value ?? 0)
    return buildPaginatedResult(
      records.map((r) => this.toDomain(r)),
      total,
      params,
    )
  }

  async save(user: User): Promise<void> {
    await this.db.insert(usersTable).values(this.toRecord(user))
  }

  async update(user: User): Promise<void> {
    const record = this.toRecord(user)
    await this.db
      .update(usersTable)
      .set({
        name: record.name,
        email: record.email,
        passwordHash: record.passwordHash,
        role: record.role,
        isActive: record.isActive,
      })
      .where(eq(usersTable.id, user.id.toString()))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(usersTable).where(eq(usersTable.id, id))
  }

  async existsByEmail(email: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)

    return result !== undefined
  }

  private toDomain(record: UserRecord): User {
    return User.reconstitute({
      id: new UniqueId(record.id),
      name: record.name,
      email: Email.create(record.email),
      passwordHash: record.passwordHash,
      role: record.role,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }

  private toRecord(user: User): NewUserRecord {
    return {
      id: user.id.toString(),
      name: user.name,
      email: user.email.toString(),
      passwordHash: user.passwordHash,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
