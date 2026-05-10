import type { AuthTokensDTO } from '@application/ports/token-service.port.js'
import type { UserRole } from '@shared/types/user-role.js'
import * as z from 'zod'

export const RegisterUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
})

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>
export type LoginDTO = z.infer<typeof LoginSchema>

export interface UserResponseDTO {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export interface AuthResponseDTO {
  user: UserResponseDTO
  tokens: AuthTokensDTO
}

export type { AuthTokensDTO }
