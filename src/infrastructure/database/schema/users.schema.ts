import { EMAIL_MAX_LENGTH } from '@domain/user/value-objects/email.js'
import { USER_ROLES } from '@shared/types/user-role.js'
import { boolean, index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', USER_ROLES)

export const usersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: EMAIL_MAX_LENGTH }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('user'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('users_role_idx').on(table.role),
    index('users_is_active_idx').on(table.isActive),
  ],
)

export type UserRecord = typeof usersTable.$inferSelect
export type NewUserRecord = typeof usersTable.$inferInsert
