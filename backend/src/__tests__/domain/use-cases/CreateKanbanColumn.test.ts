import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../../../domain/repositories/IKanbanColumnRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { KanbanColumnEntity } from '../../../domain/entities/KanbanColumn.js'
import { CreateKanbanColumnUseCase } from '../../../domain/use-cases/CreateKanbanColumn.js'

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-1',
  username: 'alice',
  passwordHash: 'hash',
  tokenHash: 'sha256token',
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

const makeColumn = (overrides: Partial<KanbanColumnEntity> = {}): KanbanColumnEntity => ({
  id: 'col-1',
  boardId: 'board-1',
  position: 1,
  title: 'Backlog',
  createdAt: new Date(),
  ...overrides,
})

describe('CreateKanbanColumnUseCase', () => {
  let userRepo: IUserRepository
  let memberRepo: IMemberRepository
  let columnRepo: IKanbanColumnRepository

  beforeEach(() => {
    userRepo = {
      create: vi.fn(),
      findByUsername: vi.fn(),
      findByTokenHash: vi.fn().mockResolvedValue(makeUser()),
      updateTokenHash: vi.fn(),
    }
    memberRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    }
    columnRepo = {
      create: vi.fn().mockResolvedValue(makeColumn()),
      findByBoardId: vi.fn(),
      getMaxPosition: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates a column with position = max_position + 1', async () => {
    vi.mocked(columnRepo.getMaxPosition).mockResolvedValue(2)

    const useCase = new CreateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
    await useCase.execute({ userToken: 'token', boardId: 'board-1', title: 'Backlog' })

    expect(columnRepo.create).toHaveBeenCalledWith({
      boardId: 'board-1',
      title: 'Backlog',
      position: 3,
    })
  })

  it('returns the created column entity', async () => {
    const useCase = new CreateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1', title: 'Backlog' })

    expect(result.id).toBe('col-1')
    expect(result.title).toBe('Backlog')
  })

  it('throws INVALID_INPUT when title exceeds 100 characters', async () => {
    const useCase = new CreateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', title: 'x'.repeat(101) }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_INPUT when title is empty', async () => {
    const useCase = new CreateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', title: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_USER_TOKEN when token is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new CreateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1', title: 'Col' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new CreateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', title: 'Col' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
