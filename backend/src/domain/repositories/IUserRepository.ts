import type { UserEntity } from '../entities/User.js'

/** Port for user persistence — implemented by infra layer only. */
export interface IUserRepository {
  create(data: {
    username: string
    passwordHash: string
    tokenHash: string
  }): Promise<UserEntity>

  findByUsername(username: string): Promise<UserEntity | null>

  findByTokenHash(tokenHash: string): Promise<UserEntity | null>

  updateTokenHash(id: string, tokenHash: string): Promise<void>
}
