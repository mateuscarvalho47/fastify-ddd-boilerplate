import type { IPasswordHasher } from '@application/ports/password-hasher.port.js'
import type { ITokenService } from '@application/ports/token-service.port.js'
import type { AuthResponseDTO, LoginDTO } from '@application/user/dtos/user.dto.js'
import { toUserResponseDTO } from '@application/user/mappers/user.mapper.js'
import type { IUserRepository } from '@domain/user/repositories/user.repository.interface.js'
import { UnauthorizedError } from '@shared/errors/domain-errors.js'
import { Result } from '@shared/result/result.js'

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: LoginDTO): Promise<Result<AuthResponseDTO, UnauthorizedError | Error>> {
    const user = await this.userRepository.findByEmail(dto.email)
    if (!user) {
      return Result.fail(new UnauthorizedError('Invalid credentials'))
    }

    if (!user.isActive) {
      return Result.fail(new UnauthorizedError('Account is inactive'))
    }

    const isPasswordValid = await this.passwordHasher.compare(dto.password, user.passwordHash)
    if (!isPasswordValid) {
      return Result.fail(new UnauthorizedError('Invalid credentials'))
    }

    const tokens = await this.tokenService.generateTokens({
      sub: user.id.toString(),
      email: user.email.toString(),
      role: user.role,
    })

    return Result.ok({
      user: toUserResponseDTO(user),
      tokens,
    })
  }
}
