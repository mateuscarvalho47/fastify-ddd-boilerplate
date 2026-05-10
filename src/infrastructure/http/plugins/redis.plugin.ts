import fastifyRedis from '@fastify/redis'
import { env } from '@shared/utils/env.js'
import fp from 'fastify-plugin'

export const redisPlugin = fp(async (app) => {
  await app.register(fastifyRedis, {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    closeClient: true,
  })
})
