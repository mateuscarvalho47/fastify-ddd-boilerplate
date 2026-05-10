import type { UserRole } from '@shared/types/user-role.js'

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
}

export interface AuthTokensDTO {
  accessToken: string
  refreshToken: string
}

export interface ITokenService {
  generateTokens(payload: JwtPayload): Promise<AuthTokensDTO>
  verifyAccessToken(token: string): Promise<JwtPayload>
  verifyRefreshToken(token: string): Promise<JwtPayload>
  revokeRefreshToken(token: string): Promise<void>
  isRefreshTokenRevoked(token: string): Promise<boolean>
}
