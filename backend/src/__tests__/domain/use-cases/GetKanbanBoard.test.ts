import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../../../domain/repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../../../domain/repositories/IKanbanTaskRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { KanbanColumnEntity } from '../../../domain/entities/KanbanColumn.js'
import type { KanbanTaskEntity } from '../../../domain/entities/KanbanTask.js'
import { GetKanbanBoardUseCase } from '../../../domain/use-cases/GetKanbanBoard.js'

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
  title: 'To Do',
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

describe('GetKanbanBoardUseCase', () => {
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
      findAllByBoardId: vi.fn().mockResolvedValue([{ memberId: 'member-1', username: 'alice' }]),
    }
    columnRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeColumn()]),
      getMaxPosition: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
      delete: vi.fn(),
    }
    taskRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeTask()]),
      getMaxPositionInColumn: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('returns board state with columns, tasks nested, and members', async () => {
    const useCase = new GetKanbanBoardUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1' })

    expect(result.columns).toHaveLength(1)
    expect(result.columns[0]!.tasks).toHaveLength(1)
    expect(result.columns[0]!.tasks[0]!.id).toBe('task-1')
    expect(result.members).toEqual([{ memberId: 'member-1', username: 'alice' }])
  })

  it('nests tasks under their respective columns', async () => {
    const col2 = makeColumn({ id: 'col-2', position: 2, title: 'Done' })
    const task2 = makeTask({ id: 'task-2', columnId: 'col-2' })

    vi.mocked(columnRepo.findByBoardId).mockResolvedValue([makeColumn(), col2])
    vi.mocked(taskRepo.findByBoardId).mockResolvedValue([makeTask(), task2])

    const useCase = new GetKanbanBoardUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1' })

    expect(result.columns[0]!.tasks).toHaveLength(1)
    expect(result.columns[1]!.tasks).toHaveLength(1)
    expect(result.columns[1]!.tasks[0]!.id).toBe('task-2')
  })

  it('throws INVALID_USER_TOKEN when token is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new GetKanbanBoardUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new GetKanbanBoardUseCase(userRepo, memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
