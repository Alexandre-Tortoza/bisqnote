import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanTaskRepository } from '../../../domain/repositories/IKanbanTaskRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { KanbanTaskEntity } from '../../../domain/entities/KanbanTask.js'
import { UpdateKanbanTaskUseCase } from '../../../domain/use-cases/UpdateKanbanTask.js'

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

describe('UpdateKanbanTaskUseCase', () => {
  let userRepo: IUserRepository
  let memberRepo: IMemberRepository
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
    taskRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeTask()]),
      getMaxPositionInColumn: vi.fn(),
      update: vi.fn().mockResolvedValue(makeTask({ title: 'Updated', effort: 3 })),
      move: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('updates only the provided fields', async () => {
    const useCase = new UpdateKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
    await useCase.execute({ userToken: 'token', boardId: 'board-1', taskId: 'task-1', title: 'Updated', effort: 3 })

    expect(taskRepo.update).toHaveBeenCalledWith('task-1', { title: 'Updated', effort: 3 })
  })

  it('returns the updated task entity', async () => {
    const useCase = new UpdateKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1', taskId: 'task-1', title: 'Updated' })

    expect(result.title).toBe('Updated')
  })

  it('can update description, dueDate, and assignedTo', async () => {
    vi.mocked(taskRepo.update).mockResolvedValue(
      makeTask({ description: 'some desc', dueDate: '2025-12-31', assignedTo: 'member-2' }),
    )

    const useCase = new UpdateKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
    const result = await useCase.execute({
      userToken: 'token',
      boardId: 'board-1',
      taskId: 'task-1',
      description: 'some desc',
      dueDate: '2025-12-31',
      assignedTo: 'member-2',
    })

    expect(taskRepo.update).toHaveBeenCalledWith('task-1', {
      description: 'some desc',
      dueDate: '2025-12-31',
      assignedTo: 'member-2',
    })
    expect(result.assignedTo).toBe('member-2')
  })

  it('throws TASK_NOT_FOUND when task does not belong to the board', async () => {
    vi.mocked(taskRepo.findByBoardId).mockResolvedValue([])

    const useCase = new UpdateKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', taskId: 'task-x', title: 'x' }),
    ).rejects.toMatchObject({ code: 'TASK_NOT_FOUND' })
  })

  it('throws INVALID_USER_TOKEN when token is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new UpdateKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1', taskId: 'task-1' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new UpdateKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', taskId: 'task-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
