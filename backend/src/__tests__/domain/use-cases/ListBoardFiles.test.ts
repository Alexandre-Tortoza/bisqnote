import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../../../domain/repositories/IBoardFileRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { BoardFileEntity } from '../../../domain/entities/BoardFile.js'
import { ListBoardFilesUseCase } from '../../../domain/use-cases/ListBoardFiles.js'

const makeMember = (overrides: Partial<BoardMemberEntity> = {}): BoardMemberEntity => ({
  id: 'member-1',
  boardId: 'board-1',
  userId: 'user-1',
  tokenHash: 'hash',
  role: 'member',
  encryptedContent: '{}',
  ...overrides,
})

const makeFile = (overrides: Partial<BoardFileEntity> = {}): BoardFileEntity => ({
  id: 'file-1',
  boardId: 'board-1',
  uploadedBy: 'member-1',
  type: 'file',
  name: 'report.pdf',
  url: null,
  mimeType: 'application/pdf',
  sizeBytes: 4200000,
  storageKey: 'uuid-1',
  createdAt: new Date(),
  ...overrides,
})

describe('ListBoardFilesUseCase', () => {
  let memberRepo: IMemberRepository
  let fileRepo: IBoardFileRepository

  beforeEach(() => {
    memberRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    }
    fileRepo = {
      createLink: vi.fn(),
      createFile: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeFile()]),
      findById: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('returns all files for the board', async () => {
    const useCase = new ListBoardFilesUseCase(memberRepo, fileRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1' })

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('file-1')
    expect(fileRepo.findByBoardId).toHaveBeenCalledWith('board-1')
  })

  it('returns empty array when board has no files', async () => {
    vi.mocked(fileRepo.findByBoardId).mockResolvedValue([])

    const useCase = new ListBoardFilesUseCase(memberRepo, fileRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1' })

    expect(result).toHaveLength(0)
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new ListBoardFilesUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
