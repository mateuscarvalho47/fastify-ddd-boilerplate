import fastifyCors from '@fastify/cors'
import { env } from '@shared/utils/env.js'
import fp from 'fastify-plugin'

export const corsPlugin = fp(async (app) => {
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
})
