import { usersTable } from '@infrastructure/database/schema/users.schema.js'
import { toOffset } from '@shared/types/pagination.js'
import type { UserRole } from '@shared/types/user-role.js'
import { count, ilike, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export interface UserSummary {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export interface UserListResult {
  data: UserSummary[]
  total: number
}

export class UserQueryService {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listUsers(params: {
    page: number
    limit: number
    search?: string
  }): Promise<UserListResult> {
    const whereClause =
      params.search !== undefined && params.search.length > 0
        ? or(
            ilike(usersTable.name, `%${params.search}%`),
            ilike(usersTable.email, `%${params.search}%`),
          )
        : undefined

    const [records, countRows] = await Promise.all([
      this.db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          isActive: usersTable.isActive,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(whereClause)
        .limit(params.limit)
        .offset(toOffset(params)),
      this.db.select({ value: count() }).from(usersTable).where(whereClause),
    ])

    return {
      data: records.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      total: Number(countRows[0]?.value ?? 0),
    }
  }

  async getUserStats(): Promise<{ total: number; active: number; admins: number }> {
    const [row] = await this.db
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${usersTable.isActive} = true THEN 1 END`),
        admins: count(sql`CASE WHEN ${usersTable.role} = 'admin' THEN 1 END`),
      })
      .from(usersTable)

    return {
      total: Number(row?.total ?? 0),
      active: Number(row?.active ?? 0),
      admins: Number(row?.admins ?? 0),
    }
  }
}
