import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { BoardEntity } from '../../../domain/entities/Board.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import { JoinBoardUseCase } from '../../../domain/use-cases/JoinBoard.js'

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
  role: 'member',
  encryptedContent: '{}',
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

describe('JoinBoardUseCase', () => {
  let boardRepo: IBoardRepository
  let memberRepo: IMemberRepository
  let userRepo: IUserRepository

  beforeEach(() => {
    boardRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(makeBoard()),
      findByOwnerEmail: vi.fn().mockResolvedValue([]),
    }
    memberRepo = {
      create: vi.fn().mockResolvedValue(makeMember()),
      findById: vi.fn().mockResolvedValue(null),
      findByUserAndBoard: vi.fn().mockResolvedValue(null),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }
    userRepo = {
      create: vi.fn(),
      findByUsername: vi.fn().mockResolvedValue(null),
      findByTokenHash: vi.fn().mockResolvedValue(makeUser()),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('creates a new member and returns boardId, memberToken, role=member for public board', async () => {
    const useCase = new JoinBoardUseCase(boardRepo, memberRepo, userRepo)
    const result = await useCase.execute({ boardId: 'board-1', userToken: 'some-token' })

    expect(memberRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ boardId: 'board-1', role: 'member', userId: 'user-1' }),
    )
    expect(result).toMatchObject({ boardId: 'board-1', role: 'member' })
    expect(typeof result.memberToken).toBe('string')
  })

  it('reuses existing member and updates tokenHash when user already belongs to board', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(makeMember({ role: 'owner' }))

    const useCase = new JoinBoardUseCase(boardRepo, memberRepo, userRepo)
    const result = await useCase.execute({ boardId: 'board-1', userToken: 'some-token' })

    expect(memberRepo.create).not.toHaveBeenCalled()
    expect(memberRepo.updateTokenHash).toHaveBeenCalledWith('member-1', expect.any(String))
    expect(result).toMatchObject({ boardId: 'board-1', role: 'owner' })
  })

  it('throws BOARD_NOT_FOUND when board does not exist', async () => {
    vi.mocked(boardRepo.findById).mockResolvedValue(null)

    const useCase = new JoinBoardUseCase(boardRepo, memberRepo, userRepo)
    await expect(
      useCase.execute({ boardId: 'bad-id', userToken: 'some-token' }),
    ).rejects.toMatchObject({ code: 'BOARD_NOT_FOUND' })
  })

  it('throws PASSWORD_REQUIRED for private board with no password', async () => {
    vi.mocked(boardRepo.findById).mockResolvedValue(
      makeBoard({ isPrivate: true, passwordHash: 'hash' }),
    )

    const useCase = new JoinBoardUseCase(boardRepo, memberRepo, userRepo)
    await expect(
      useCase.execute({ boardId: 'board-1', userToken: 'some-token' }),
    ).rejects.toMatchObject({ code: 'PASSWORD_REQUIRED' })
  })

  it('throws INVALID_PASSWORD for private board with wrong password', async () => {
    vi.mocked(boardRepo.findById).mockResolvedValue(
      makeBoard({ isPrivate: true, passwordHash: '$2a$10$notarealhashjustfortest00000000000000000000' }),
    )

    const useCase = new JoinBoardUseCase(boardRepo, memberRepo, userRepo)
    await expect(
      useCase.execute({ boardId: 'board-1', password: 'wrongpassword', userToken: 'some-token' }),
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' })
  })

  it('throws INVALID_USER_TOKEN when userToken is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new JoinBoardUseCase(boardRepo, memberRepo, userRepo)
    await expect(
      useCase.execute({ boardId: 'board-1', userToken: 'bad-token' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })
})
