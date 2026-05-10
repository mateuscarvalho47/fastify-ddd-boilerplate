import fastifyHelmet from '@fastify/helmet'
import { env } from '@shared/utils/env.js'
import fp from 'fastify-plugin'

export const helmetPlugin = fp(async (app) => {
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  })
})
