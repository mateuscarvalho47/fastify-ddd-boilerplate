import { env } from '@shared/utils/env.js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import fp from 'fastify-plugin'
import postgres from 'postgres'

declare module 'fastify' {
  interface FastifyInstance {
    db: PostgresJsDatabase
  }
}

export const databasePlugin = fp(async (app) => {
  const client = postgres(env.DATABASE_URL, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
  })
  const db = drizzle(client)

  app.decorate('db', db)

  app.addHook('onClose', async () => {
    await client.end()
  })
})
