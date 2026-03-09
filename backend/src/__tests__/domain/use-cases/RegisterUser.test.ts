import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import { RegisterUserUseCase } from '../../../domain/use-cases/RegisterUser.js'
import { AppError } from '../../../domain/errors/AppError.js'

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-1',
  username: 'johndoe',
  passwordHash: 'hashed',
  tokenHash: 'tokenhash',
  createdAt: new Date(),
  ...overrides,
})

describe('RegisterUserUseCase', () => {
  let userRepo: IUserRepository

  beforeEach(() => {
    userRepo = {
      create: vi.fn().mockResolvedValue(makeUser()),
      findByUsername: vi.fn().mockResolvedValue(null),
      findByTokenHash: vi.fn().mockResolvedValue(null),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('creates user and returns userId, userToken, username', async () => {
    const useCase = new RegisterUserUseCase(userRepo)
    const result = await useCase.execute({ username: 'johndoe', password: 'secret' })

    expect(userRepo.create).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ userId: 'user-1', username: 'johndoe' })
    expect(typeof result.userToken).toBe('string')
    expect(result.userToken.length).toBeGreaterThan(0)
  })

  it('hashes password before storing (not plaintext)', async () => {
    const useCase = new RegisterUserUseCase(userRepo)
    await useCase.execute({ username: 'johndoe', password: 'secret123' })

    const call = vi.mocked(userRepo.create).mock.calls[0]![0]
    expect(call.passwordHash).not.toBe('secret123')
    expect(call.passwordHash.length).toBeGreaterThan(10)
  })

  it('stores SHA-256 hash of userToken (not raw token)', async () => {
    const useCase = new RegisterUserUseCase(userRepo)
    await useCase.execute({ username: 'johndoe', password: 'secret' })

    const call = vi.mocked(userRepo.create).mock.calls[0]![0]
    expect(call.tokenHash).toBeTruthy()
    expect(call.tokenHash).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}/) // not a UUID
  })

  it('throws USER_ALREADY_EXISTS when username is taken', async () => {
    vi.mocked(userRepo.findByUsername).mockResolvedValue(makeUser())

    const useCase = new RegisterUserUseCase(userRepo)
    await expect(useCase.execute({ username: 'johndoe', password: 'secret' })).rejects.toThrow(AppError)
    await expect(useCase.execute({ username: 'johndoe', password: 'secret' })).rejects.toMatchObject({
      code: 'USER_ALREADY_EXISTS',
    })
  })

  it('does not create user when username is taken', async () => {
    vi.mocked(userRepo.findByUsername).mockResolvedValue(makeUser())

    const useCase = new RegisterUserUseCase(userRepo)
    await useCase.execute({ username: 'johndoe', password: 'secret' }).catch(() => undefined)
    expect(userRepo.create).not.toHaveBeenCalled()
  })
})
