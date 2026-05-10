import fastifyRateLimit from '@fastify/rate-limit'
import { env } from '@shared/utils/env.js'
import fp from 'fastify-plugin'

export const rateLimitPlugin = fp(async (app) => {
  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${context.after}`,
    }),
  })
})
