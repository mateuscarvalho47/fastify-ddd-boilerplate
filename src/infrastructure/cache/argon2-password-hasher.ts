import type { IPasswordHasher } from '@application/ports/password-hasher.port.js'
import argon2 from 'argon2'

export class Argon2PasswordHasher implements IPasswordHasher {
  async hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })
  }

  async compare(plaintext: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plaintext)
  }
}
