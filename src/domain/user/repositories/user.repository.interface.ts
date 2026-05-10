import type { User } from '@domain/user/entities/user.entity.js'
import type { PaginatedResult, PaginationParams } from '@shared/types/pagination.js'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findAll(params: PaginationParams): Promise<PaginatedResult<User>>
  save(user: User): Promise<void>
  update(user: User): Promise<void>
  delete(id: string): Promise<void>
  existsByEmail(email: string): Promise<boolean>
}
