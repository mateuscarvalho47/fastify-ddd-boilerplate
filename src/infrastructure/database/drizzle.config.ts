import { defineConfig } from 'drizzle-kit'
import { env } from '../../shared/utils/env.js'

export default defineConfig({
  schema: './src/infrastructure/database/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
