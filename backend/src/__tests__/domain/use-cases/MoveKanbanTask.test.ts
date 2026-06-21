import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../../../domain/repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../../../domain/repositories/IKanbanTaskRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { KanbanColumnEntity } from '../../../domain/entities/KanbanColumn.js'
import type { KanbanTaskEntity } from '../../../domain/entities/KanbanTask.js'
import { MoveKanbanTaskUseCase } from '../../../domain/use-cases/MoveKanbanTask.js'

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
  encryptedContent: 'encrypted-backlog',
  createdAt: new Date(),
  ...overrides,
})

const makeTask = (overrides: Partial<KanbanTaskEntity> = {}): KanbanTaskEntity => ({
  id: 'task-1',
  columnId: 'col-1',
  boardId: 'board-1',
  assignedTo: null,
  position: 1,
  encryptedContent: 'encrypted-task',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('MoveKanbanTaskUseCase', () => {
  let memberRepo: IMemberRepository
  let columnRepo: IKanbanColumnRepository
  let taskRepo: IKanbanTaskRepository

  beforeEach(() => {
    memberRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    }
    columnRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([
        makeColumn({ id: 'col-1' }),
        makeColumn({ id: 'col-2', position: 2, encryptedContent: 'encrypted-in-progress' }),
      ]),
      getMaxPosition: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    taskRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeTask()]),
      getMaxPositionInColumn: vi.fn(),
      update: vi.fn(),
      move: vi.fn().mockResolvedValue(makeTask({ columnId: 'col-2', position: 1 })),
      delete: vi.fn(),
    }
  })

  it('moves task to target column at the given position', async () => {
    const useCase = new MoveKanbanTaskUseCase(memberRepo, columnRepo, taskRepo)
    await useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-1', columnId: 'col-2', position: 1 })

    expect(taskRepo.move).toHaveBeenCalledWith('task-1', 'col-2', 1)
  })

  it('returns the updated task entity', async () => {
    const useCase = new MoveKanbanTaskUseCase(memberRepo, columnRepo, taskRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-1', columnId: 'col-2', position: 1 })

    expect(result.columnId).toBe('col-2')
    expect(result.position).toBe(1)
  })

  it('throws COLUMN_NOT_FOUND when target column does not belong to the board', async () => {
    const useCase = new MoveKanbanTaskUseCase(memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-1', columnId: 'col-x', position: 1 }),
    ).rejects.toMatchObject({ code: 'COLUMN_NOT_FOUND' })
  })

  it('throws TASK_NOT_FOUND when task does not belong to the board', async () => {
    const useCase = new MoveKanbanTaskUseCase(memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-x', columnId: 'col-2', position: 1 }),
    ).rejects.toMatchObject({ code: 'TASK_NOT_FOUND' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new MoveKanbanTaskUseCase(memberRepo, columnRepo, taskRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-1', columnId: 'col-2', position: 1 }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
