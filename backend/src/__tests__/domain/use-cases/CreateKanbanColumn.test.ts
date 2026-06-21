import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../../../domain/repositories/IKanbanColumnRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { KanbanColumnEntity } from '../../../domain/entities/KanbanColumn.js'
import { CreateKanbanColumnUseCase } from '../../../domain/use-cases/CreateKanbanColumn.js'

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

describe('CreateKanbanColumnUseCase', () => {
  let memberRepo: IMemberRepository
  let columnRepo: IKanbanColumnRepository

  beforeEach(() => {
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

    const useCase = new CreateKanbanColumnUseCase(memberRepo, columnRepo)
    await useCase.execute({ userId: 'user-1', boardId: 'board-1', encryptedContent: 'encrypted-backlog' })

    expect(columnRepo.create).toHaveBeenCalledWith({
      boardId: 'board-1',
      encryptedContent: 'encrypted-backlog',
      position: 3,
    })
  })

  it('returns the created column entity', async () => {
    const useCase = new CreateKanbanColumnUseCase(memberRepo, columnRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1', encryptedContent: 'encrypted-backlog' })

    expect(result.id).toBe('col-1')
    expect(result.encryptedContent).toBe('encrypted-backlog')
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new CreateKanbanColumnUseCase(memberRepo, columnRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', encryptedContent: 'col' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
