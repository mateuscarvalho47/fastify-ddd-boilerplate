import { createHash } from 'node:crypto'
import type {
  AuthTokensDTO,
  ITokenService,
  JwtPayload,
} from '@application/ports/token-service.port.js'
import { UnauthorizedError } from '@shared/errors/domain-errors.js'
import { env } from '@shared/utils/env.js'
import type { FastifyInstance } from 'fastify'
import type { Redis } from 'ioredis'

const REVOKE_PREFIX = 'refresh:revoked:'
const FALLBACK_REFRESH_TTL_SECONDS = 604800

export class JwtTokenService implements ITokenService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly redis: Redis,
  ) {}

  async generateTokens(payload: JwtPayload): Promise<AuthTokensDTO> {
    const accessToken = this.app.jwt.sign(payload, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    })
    const refreshToken = this.app.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    )
    return { accessToken, refreshToken }
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.app.jwt.verify<JwtPayload>(token)
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const decoded = await this.app.jwt.verify<JwtPayload & { type?: string }>(token)

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type')
    }

    const isRevoked = await this.isRefreshTokenRevoked(token)
    if (isRevoked) {
      throw new UnauthorizedError('Refresh token has been revoked')
    }

    return { sub: decoded.sub, email: decoded.email, role: decoded.role }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const decoded = this.app.jwt.decode<{ exp?: number }>(token)
    const ttl =
      decoded?.exp !== undefined
        ? decoded.exp - Math.floor(Date.now() / 1000)
        : FALLBACK_REFRESH_TTL_SECONDS
    if (ttl > 0) {
      await this.redis.set(this.tokenKey(token), '1', 'EX', ttl)
    }
  }

  async isRefreshTokenRevoked(token: string): Promise<boolean> {
    const result = await this.redis.exists(this.tokenKey(token))
    return result === 1
  }

  private tokenKey(token: string): string {
    return `${REVOKE_PREFIX}${createHash('sha256').update(token).digest('hex')}`
  }
}
