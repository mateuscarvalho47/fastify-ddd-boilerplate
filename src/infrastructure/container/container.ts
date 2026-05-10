import type { IPasswordHasher } from '@application/ports/password-hasher.port.js'
import type { ITokenService } from '@application/ports/token-service.port.js'
import { LoginUserUseCase } from '@application/user/use-cases/login-user.use-case.js'
import { RegisterUserUseCase } from '@application/user/use-cases/register-user.use-case.js'
import type { IUserRepository } from '@domain/user/repositories/user.repository.interface.js'
import { Argon2PasswordHasher } from '@infrastructure/cache/argon2-password-hasher.js'
import { JwtTokenService } from '@infrastructure/cache/jwt-token.service.js'
import { UserQueryService } from '@infrastructure/database/query-services/user.query-service.js'
import { DrizzleUserRepository } from '@infrastructure/database/repositories/user.repository.js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { FastifyInstance } from 'fastify'
import type { Redis } from 'ioredis'

export interface AppContainer {
  userRepository: IUserRepository
  userQueryService: UserQueryService
  passwordHasher: IPasswordHasher
  tokenService: ITokenService
  registerUser: RegisterUserUseCase
  loginUser: LoginUserUseCase
}

export function buildContainer(
  app: FastifyInstance,
  db: PostgresJsDatabase,
  redis: Redis,
): AppContainer {
  const userRepository = new DrizzleUserRepository(db)
  const userQueryService = new UserQueryService(db)
  const passwordHasher = new Argon2PasswordHasher()
  const tokenService = new JwtTokenService(app, redis)

  const registerUser = new RegisterUserUseCase(userRepository, passwordHasher)
  const loginUser = new LoginUserUseCase(userRepository, passwordHasher, tokenService)

  return {
    userRepository,
    userQueryService,
    passwordHasher,
    tokenService,
    registerUser,
    loginUser,
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    container: AppContainer
  }
}
