import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../../../domain/repositories/IBoardFileRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { BoardFileEntity } from '../../../domain/entities/BoardFile.js'
import { DeleteBoardFileUseCase } from '../../../domain/use-cases/DeleteBoardFile.js'

const makeMember = (overrides: Partial<BoardMemberEntity> = {}): BoardMemberEntity => ({
  id: 'member-1',
  boardId: 'board-1',
  userId: 'user-1',
  tokenHash: 'hash',
  role: 'member',
  encryptedContent: '{}',
  ...overrides,
})

const makeFileEntity = (overrides: Partial<BoardFileEntity> = {}): BoardFileEntity => ({
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

describe('DeleteBoardFileUseCase', () => {
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
      findByBoardId: vi.fn(),
      findById: vi.fn().mockResolvedValue(makeFileEntity()),
      delete: vi.fn(),
    }
  })

  it('deletes the file and returns the entity', async () => {
    const useCase = new DeleteBoardFileUseCase(memberRepo, fileRepo)
    const result = await useCase.execute({
      userId: 'user-1',
      boardId: 'board-1',
      fileId: 'file-1',
    })

    expect(result.id).toBe('file-1')
    expect(fileRepo.delete).toHaveBeenCalledWith('file-1')
  })

  it('throws FILE_NOT_FOUND when the file does not exist', async () => {
    vi.mocked(fileRepo.findById).mockResolvedValue(null)

    const useCase = new DeleteBoardFileUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', fileId: 'missing' }),
    ).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' })
  })

  it('throws BOARD_MISMATCH when file belongs to a different board', async () => {
    vi.mocked(fileRepo.findById).mockResolvedValue(makeFileEntity({ boardId: 'board-other' }))

    const useCase = new DeleteBoardFileUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', fileId: 'file-1' }),
    ).rejects.toMatchObject({ code: 'BOARD_MISMATCH' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new DeleteBoardFileUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', fileId: 'file-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
