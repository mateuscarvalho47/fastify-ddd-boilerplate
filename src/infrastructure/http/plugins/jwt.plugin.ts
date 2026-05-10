import type { JwtPayload } from '@application/ports/token-service.port.js'
import fastifyJwt from '@fastify/jwt'
import { env } from '@shared/utils/env.js'
import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload & { type?: string }
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void>
    authenticateAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void>
  }
}

export const jwtPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    verify: { algorithms: ['HS256'] },
  })

  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
    } catch {
      await reply
        .status(401)
        .send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or missing token' })
      return
    }
  })

  app.decorate('authenticateAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(req, reply)
    if (reply.sent) return

    if (req.user.role !== 'admin') {
      await reply
        .status(403)
        .send({ statusCode: 403, error: 'Forbidden', message: 'Admin access required' })
    }
  })
})
