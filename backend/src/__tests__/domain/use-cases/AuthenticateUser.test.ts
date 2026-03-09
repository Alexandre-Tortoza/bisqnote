import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import { AuthenticateUserUseCase } from '../../../domain/use-cases/AuthenticateUser.js'

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-1',
  username: 'johndoe',
  passwordHash: '$2a$10$SOMEHASHEDPASSWORDTHATISVALID123',
  tokenHash: null,
  createdAt: new Date(),
  ...overrides,
})

describe('AuthenticateUserUseCase', () => {
  let userRepo: IUserRepository

  beforeEach(() => {
    userRepo = {
      create: vi.fn(),
      findByUsername: vi.fn().mockResolvedValue(null),
      findByTokenHash: vi.fn().mockResolvedValue(null),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('returns userId, userToken, username on valid credentials', async () => {
    // Use a real bcrypt hash of 'secret123'
    const { hash } = await import('bcryptjs')
    const passwordHash = await hash('secret123', 10)
    vi.mocked(userRepo.findByUsername).mockResolvedValue(makeUser({ passwordHash }))

    const useCase = new AuthenticateUserUseCase(userRepo)
    const result = await useCase.execute({ username: 'johndoe', password: 'secret123' })

    expect(result).toMatchObject({ userId: 'user-1', username: 'johndoe' })
    expect(typeof result.userToken).toBe('string')
    expect(result.userToken.length).toBeGreaterThan(0)
  })

  it('updates the stored tokenHash on successful login', async () => {
    const { hash } = await import('bcryptjs')
    const passwordHash = await hash('secret123', 10)
    vi.mocked(userRepo.findByUsername).mockResolvedValue(makeUser({ passwordHash }))

    const useCase = new AuthenticateUserUseCase(userRepo)
    await useCase.execute({ username: 'johndoe', password: 'secret123' })

    expect(userRepo.updateTokenHash).toHaveBeenCalledWith('user-1', expect.any(String))
  })

  it('throws INVALID_CREDENTIALS when user does not exist', async () => {
    vi.mocked(userRepo.findByUsername).mockResolvedValue(null)

    const useCase = new AuthenticateUserUseCase(userRepo)
    await expect(useCase.execute({ username: 'ghost', password: 'any' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('throws INVALID_CREDENTIALS when password is wrong', async () => {
    const { hash } = await import('bcryptjs')
    const passwordHash = await hash('correctpassword', 10)
    vi.mocked(userRepo.findByUsername).mockResolvedValue(makeUser({ passwordHash }))

    const useCase = new AuthenticateUserUseCase(userRepo)
    await expect(
      useCase.execute({ username: 'johndoe', password: 'wrongpassword' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})
