import { createHash } from 'node:crypto'
import { hash } from 'bcryptjs'
import { AppError } from '../errors/AppError.js'
import type { IUserRepository } from '../repositories/IUserRepository.js'

export interface RegisterUserInput {
  username: string
  password: string
}

export interface RegisterUserOutput {
  userId: string
  userToken: string
  username: string
}

/** Validates uniqueness, hashes password, creates user and returns a session token. */
export class RegisterUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const { username, password } = input

    const existing = await this.userRepo.findByUsername(username)
    if (existing) throw new AppError('USER_ALREADY_EXISTS', 'Username already taken')

    const passwordHash = await hash(password, 10)
    const userToken = crypto.randomUUID()
    const tokenHash = createHash('sha256').update(userToken).digest('hex')

    const user = await this.userRepo.create({ username, passwordHash, tokenHash })

    return { userId: user.id, userToken, username: user.username }
  }
}
