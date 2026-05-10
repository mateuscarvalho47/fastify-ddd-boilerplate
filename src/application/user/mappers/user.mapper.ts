import type { UserResponseDTO } from '@application/user/dtos/user.dto.js'
import type { User } from '@domain/user/entities/user.entity.js'

export function toUserResponseDTO(user: User): UserResponseDTO {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email.toString(),
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  }
}
