import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanTaskRepository } from '../../../domain/repositories/IKanbanTaskRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { KanbanTaskEntity } from '../../../domain/entities/KanbanTask.js'
import { UpdateKanbanTaskUseCase } from '../../../domain/use-cases/UpdateKanbanTask.js'

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
  encryptedContent: 'encrypted-task',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('UpdateKanbanTaskUseCase', () => {
  let memberRepo: IMemberRepository
  let taskRepo: IKanbanTaskRepository

  beforeEach(() => {
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
      update: vi.fn().mockResolvedValue(makeTask({ encryptedContent: 'encrypted-updated' })),
      move: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('updates only the provided fields', async () => {
    const useCase = new UpdateKanbanTaskUseCase(memberRepo, taskRepo)
    await useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-1', encryptedContent: 'encrypted-updated' })

    expect(taskRepo.update).toHaveBeenCalledWith('task-1', { encryptedContent: 'encrypted-updated' })
  })

  it('returns the updated task entity', async () => {
    const useCase = new UpdateKanbanTaskUseCase(memberRepo, taskRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-1', encryptedContent: 'encrypted-updated' })

    expect(result.encryptedContent).toBe('encrypted-updated')
  })

  it('can update assignedTo', async () => {
    vi.mocked(taskRepo.update).mockResolvedValue(
      makeTask({ assignedTo: 'member-2' }),
    )

    const useCase = new UpdateKanbanTaskUseCase(memberRepo, taskRepo)
    const result = await useCase.execute({
      userId: 'user-1',
      boardId: 'board-1',
      taskId: 'task-1',
      assignedTo: 'member-2',
    })

    expect(taskRepo.update).toHaveBeenCalledWith('task-1', {
      assignedTo: 'member-2',
    })
    expect(result.assignedTo).toBe('member-2')
  })

  it('throws TASK_NOT_FOUND when task does not belong to the board', async () => {
    vi.mocked(taskRepo.findByBoardId).mockResolvedValue([])

    const useCase = new UpdateKanbanTaskUseCase(memberRepo, taskRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-x', encryptedContent: 'x' }),
    ).rejects.toMatchObject({ code: 'TASK_NOT_FOUND' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new UpdateKanbanTaskUseCase(memberRepo, taskRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', taskId: 'task-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
