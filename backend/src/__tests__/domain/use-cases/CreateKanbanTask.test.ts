import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../../../domain/repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../../../domain/repositories/IKanbanTaskRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { KanbanColumnEntity } from '../../../domain/entities/KanbanColumn.js'
import type { KanbanTaskEntity } from '../../../domain/entities/KanbanTask.js'
import { CreateKanbanTaskUseCase } from '../../../domain/use-cases/CreateKanbanTask.js'

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

const makeTask = (overrides: Partial<KanbanTaskEntity> = {}): KanbanTaskEntity => ({
  id: 'task-1',
  columnId: 'col-1',
  boardId: 'board-1',
  assignedTo: null,
  position: 1,
  title: 'Fix bug',
  description: null,
  effort: null,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('CreateKanbanTaskUseCase', () => {
  let userRepo: IUserRepository
  let memberRepo: IMemberRepository
  let columnRepo: IKanbanColumnRepository
  let taskRepo: IKanbanTaskRepository

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
      create: vi.fn(),
      findByBoardId: vi.fn(),
      getMaxPosition: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    taskRepo = {
      create: vi.fn().mockResolvedValue(makeTask()),
      findByBoardId: vi.fn(),
      getMaxPositionInColumn: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates task with position = max_position_in_column + 1', async () => {
    vi.mocked(columnRepo.findByBoardId).mockResolvedValue([makeColumn()])
    vi.mocked(taskRepo.getMaxPositionInColumn).mockResolvedValue(3)

    const useCase = new CreateKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    await useCase.execute({ userToken: 'token', boardId: 'board-1', columnId: 'col-1', title: 'Fix bug' })

    expect(taskRepo.create).toHaveBeenCalledWith({
      columnId: 'col-1',
      boardId: 'board-1',
      title: 'Fix bug',
      position: 4,
    })
  })

  it('returns the created task entity', async () => {
    vi.mocked(columnRepo.findByBoardId).mockResolvedValue([makeColumn()])

    const useCase = new CreateKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1', columnId: 'col-1', title: 'Fix bug' })

    expect(result.id).toBe('task-1')
  })

  it('throws INVALID_INPUT when title exceeds 200 characters', async () => {
    vi.mocked(columnRepo.findByBoardId).mockResolvedValue([makeColumn()])

    const useCase = new CreateKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', columnId: 'col-1', title: 'x'.repeat(201) }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws COLUMN_NOT_FOUND when column does not belong to the board', async () => {
    vi.mocked(columnRepo.findByBoardId).mockResolvedValue([])

    const useCase = new CreateKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', columnId: 'col-x', title: 'Task' }),
    ).rejects.toMatchObject({ code: 'COLUMN_NOT_FOUND' })
  })

  it('throws INVALID_USER_TOKEN when token is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new CreateKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1', columnId: 'col-1', title: 'Task' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new CreateKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', columnId: 'col-1', title: 'Task' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
