import { createHash } from 'node:crypto'
import { compare } from 'bcryptjs'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'

export interface AuthenticateUserInput {
  username: string
  password: string
}

export interface AuthenticateUserOutput {
  userId: string
  userToken: string
  username: string
}

/** Validates credentials, rotates session token, and returns new userToken. */
export class AuthenticateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const { username, password } = input

    const user = await this.userRepo.findByUsername(username)
    if (!user) throw new AppError('INVALID_CREDENTIALS', 'Invalid username or password')

    const valid = await compare(password, user.passwordHash)
    if (!valid) throw new AppError('INVALID_CREDENTIALS', 'Invalid username or password')

    const userToken = crypto.randomUUID()
    const tokenHash = createHash('sha256').update(userToken).digest('hex')
    await this.userRepo.updateTokenHash(user.id, tokenHash)

    return { userId: user.id, userToken, username: user.username }
  }
}
