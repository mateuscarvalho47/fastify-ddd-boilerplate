import type { IPasswordHasher } from '@application/ports/password-hasher.port.js'
import type { RegisterUserDTO, UserResponseDTO } from '@application/user/dtos/user.dto.js'
import { toUserResponseDTO } from '@application/user/mappers/user.mapper.js'
import { User } from '@domain/user/entities/user.entity.js'
import type { IUserRepository } from '@domain/user/repositories/user.repository.interface.js'
import { Email } from '@domain/user/value-objects/email.js'
import { ConflictError } from '@shared/errors/domain-errors.js'
import { Result } from '@shared/result/result.js'
import { UniqueId } from '@shared/types/unique-id.js'

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(dto: RegisterUserDTO): Promise<Result<UserResponseDTO, ConflictError | Error>> {
    const emailExists = await this.userRepository.existsByEmail(dto.email)
    if (emailExists) {
      return Result.fail(new ConflictError('Email is already in use'))
    }

    const email = Email.create(dto.email)
    const passwordHash = await this.passwordHasher.hash(dto.password)

    const user = User.create({
      id: new UniqueId(),
      name: dto.name,
      email,
      passwordHash,
      role: 'user',
      isActive: true,
    })

    await this.userRepository.save(user)

    return Result.ok(toUserResponseDTO(user))
  }
}
