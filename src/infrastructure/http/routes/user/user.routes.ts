import { LoginSchema, RegisterUserSchema } from '@application/user/dtos/user.dto.js'
import { toUserResponseDTO } from '@application/user/mappers/user.mapper.js'
import { ForbiddenError, NotFoundError, ValidationError } from '@shared/errors/domain-errors.js'
import type { FastifyInstance } from 'fastify'

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
  },
} as const

function zodFail(error: {
  flatten(): { fieldErrors: Record<string, string[] | undefined> }
}): never {
  const fieldErrors = error.flatten().fieldErrors
  const fields: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    const first = msgs?.[0]
    if (first !== undefined) {
      fields[key] = first
    }
  }
  throw new ValidationError('Validation error', fields)
}

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/register',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', maxLength: 100 },
            email: { type: 'string', maxLength: 254 },
            password: { type: 'string', maxLength: 128 },
          },
        },
        response: { 201: userSchema },
      },
    },
    async (request, reply) => {
      const parsed = RegisterUserSchema.safeParse(request.body)
      if (!parsed.success) zodFail(parsed.error)

      const result = await app.container.registerUser.execute(parsed.data)
      if (!result.success) throw result.error

      return reply.status(201).send(result.value)
    },
  )

  app.post(
    '/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', maxLength: 254 },
            password: { type: 'string', maxLength: 128 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: userSchema,
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = LoginSchema.safeParse(request.body)
      if (!parsed.success) zodFail(parsed.error)

      const result = await app.container.loginUser.execute(parsed.data)
      if (!result.success) throw result.error

      return reply.status(200).send(result.value)
    },
  )

  app.post(
    '/logout',
    {
      onRequest: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
        response: {
          200: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { refreshToken: string }
      const decoded = app.jwt.decode<{ sub?: string }>(body.refreshToken)
      if (!decoded || decoded.sub !== request.user.sub) {
        throw new ForbiddenError('Token does not belong to the authenticated user')
      }
      await app.container.tokenService.revokeRefreshToken(body.refreshToken)
      return reply.status(200).send({ message: 'Logged out successfully' })
    },
  )

  app.post(
    '/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { refreshToken: string }
      const payload = await app.container.tokenService.verifyRefreshToken(body.refreshToken)
      await app.container.tokenService.revokeRefreshToken(body.refreshToken)
      const tokens = await app.container.tokenService.generateTokens(payload)
      return reply.status(200).send(tokens)
    },
  )

  app.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        response: { 200: userSchema },
      },
    },
    async (request, reply) => {
      const user = await app.container.userRepository.findById(request.user.sub)
      if (!user) throw new NotFoundError('User not found')
      return reply.status(200).send(toUserResponseDTO(user))
    },
  )

  app.get(
    '/admin/users',
    {
      onRequest: [app.authenticateAdmin],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string', maxLength: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: userSchema },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as { page?: number; limit?: number; search?: string }
      const params: { page: number; limit: number; search?: string } = {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      }
      if (query.search !== undefined) {
        params.search = query.search
      }
      const result = await app.container.userQueryService.listUsers(params)
      return reply.status(200).send(result)
    },
  )

  app.get(
    '/admin/stats',
    {
      onRequest: [app.authenticateAdmin],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              active: { type: 'integer' },
              admins: { type: 'integer' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const stats = await app.container.userQueryService.getUserStats()
      return reply.status(200).send(stats)
    },
  )
}
