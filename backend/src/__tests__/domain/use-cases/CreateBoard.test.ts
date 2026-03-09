import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import type { IEmailService } from '../../../domain/services/IEmailService.js'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { BoardEntity } from '../../../domain/entities/Board.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { GoBackLinkEntity } from '../../../domain/entities/GoBackLink.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import { CreateBoardUseCase } from '../../../domain/use-cases/CreateBoard.js'
import { AppError } from '../../../domain/errors/AppError.js'

const makeBoard = (overrides: Partial<BoardEntity> = {}): BoardEntity => ({
  id: 'board-1',
  isPrivate: false,
  passwordHash: null,
  ownerEmail: null,
  encryptedContent: '{}',
  createdAt: new Date(),
  ...overrides,
})

const makeMember = (overrides: Partial<BoardMemberEntity> = {}): BoardMemberEntity => ({
  id: 'member-1',
  boardId: 'board-1',
  userId: 'user-1',
  tokenHash: 'hash',
  role: 'owner',
  encryptedContent: '{}',
  ...overrides,
})

const makeGoBackLink = (overrides: Partial<GoBackLinkEntity> = {}): GoBackLinkEntity => ({
  id: 'link-1',
  boardId: 'board-1',
  memberId: 'member-1',
  token: 'go-back-token',
  expiresAt: new Date(),
  usedAt: null,
  ...overrides,
})

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-1',
  username: 'johndoe',
  passwordHash: 'hash',
  tokenHash: 'tokenhash',
  createdAt: new Date(),
  ...overrides,
})

describe('CreateBoardUseCase', () => {
  let boardRepo: IBoardRepository
  let memberRepo: IMemberRepository
  let goBackLinkRepo: IGoBackLinkRepository
  let emailService: IEmailService
  let userRepo: IUserRepository

  beforeEach(() => {
    boardRepo = {
      create: vi.fn().mockResolvedValue(makeBoard()),
      findById: vi.fn().mockResolvedValue(null),
      findByOwnerEmail: vi.fn().mockResolvedValue([]),
    }
    memberRepo = {
      create: vi.fn().mockResolvedValue(makeMember()),
      findById: vi.fn().mockResolvedValue(null),
      findByUserAndBoard: vi.fn().mockResolvedValue(null),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }
    goBackLinkRepo = {
      create: vi.fn().mockResolvedValue(makeGoBackLink()),
      findByToken: vi.fn().mockResolvedValue(null),
      markUsed: vi.fn().mockResolvedValue(undefined),
    }
    emailService = {
      sendBoardCreated: vi.fn().mockResolvedValue(undefined),
      sendRecovery: vi.fn().mockResolvedValue(undefined),
    }
    userRepo = {
      create: vi.fn(),
      findByUsername: vi.fn().mockResolvedValue(null),
      findByTokenHash: vi.fn().mockResolvedValue(makeUser()),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('creates board and returns boardId, memberToken, role=owner', async () => {
    const useCase = new CreateBoardUseCase(boardRepo, memberRepo, goBackLinkRepo, emailService, userRepo)
    const result = await useCase.execute({ name: 'My Board', isPrivate: false, userToken: 'valid-token' })

    expect(boardRepo.create).toHaveBeenCalledOnce()
    expect(memberRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ boardId: 'board-1', role: 'owner', userId: 'user-1' }),
    )
    expect(result).toMatchObject({ boardId: 'board-1', role: 'owner' })
    expect(typeof result.memberToken).toBe('string')
    expect(result.memberToken.length).toBeGreaterThan(0)
  })

  it('hashes password when isPrivate=true and password is provided', async () => {
    const useCase = new CreateBoardUseCase(boardRepo, memberRepo, goBackLinkRepo, emailService, userRepo)
    await useCase.execute({ name: 'Secret', isPrivate: true, password: 'secret123', userToken: 'valid-token' })

    const call = vi.mocked(boardRepo.create).mock.calls[0]![0]
    expect(call.passwordHash).not.toBe('secret123')
    expect(call.passwordHash).not.toBeNull()
  })

  it('throws AppError when isPrivate=true but no password', async () => {
    const useCase = new CreateBoardUseCase(boardRepo, memberRepo, goBackLinkRepo, emailService, userRepo)
    await expect(useCase.execute({ name: 'Board', isPrivate: true, userToken: 'valid-token' })).rejects.toThrow(AppError)
    await expect(useCase.execute({ name: 'Board', isPrivate: true, userToken: 'valid-token' })).rejects.toThrow('Password required for private boards')
  })

  it('throws INVALID_USER_TOKEN when userToken is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new CreateBoardUseCase(boardRepo, memberRepo, goBackLinkRepo, emailService, userRepo)
    await expect(
      useCase.execute({ name: 'Board', isPrivate: false, userToken: 'bad-token' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('does not create goBackLink or send email when ownerEmail not provided', async () => {
    const useCase = new CreateBoardUseCase(boardRepo, memberRepo, goBackLinkRepo, emailService, userRepo)
    await useCase.execute({ name: 'Board', isPrivate: false, userToken: 'valid-token' })

    expect(goBackLinkRepo.create).not.toHaveBeenCalled()
    expect(emailService.sendBoardCreated).not.toHaveBeenCalled()
  })

  it('creates goBackLink and sends email when ownerEmail is provided', async () => {
    const useCase = new CreateBoardUseCase(boardRepo, memberRepo, goBackLinkRepo, emailService, userRepo)
    await useCase.execute({ name: 'Board', isPrivate: false, ownerEmail: 'user@example.com', userToken: 'valid-token' })

    expect(goBackLinkRepo.create).toHaveBeenCalledOnce()
    expect(emailService.sendBoardCreated).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com', boardId: 'board-1' }),
    )
  })
})
