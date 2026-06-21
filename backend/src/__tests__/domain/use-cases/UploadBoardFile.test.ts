import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../../../domain/repositories/IBoardFileRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { BoardFileEntity } from '../../../domain/entities/BoardFile.js'
import { UploadBoardFileUseCase } from '../../../domain/use-cases/UploadBoardFile.js'

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

const VALID_INPUT = {
  userId: 'user-1',
  boardId: 'board-1',
  name: 'report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 4200000,
  storageKey: 'uuid-1',
}

describe('UploadBoardFileUseCase', () => {
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
      createFile: vi.fn().mockResolvedValue(makeFileEntity()),
      findByBoardId: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates and returns a file entry', async () => {
    const useCase = new UploadBoardFileUseCase(memberRepo, fileRepo)
    const result = await useCase.execute(VALID_INPUT)

    expect(result.type).toBe('file')
    expect(result.name).toBe('report.pdf')
    expect(fileRepo.createFile).toHaveBeenCalledWith({
      boardId: 'board-1',
      uploadedBy: 'member-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4200000,
      storageKey: 'uuid-1',
    })
  })

  it('throws INVALID_INPUT when name is empty', async () => {
    const useCase = new UploadBoardFileUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ ...VALID_INPUT, name: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_INPUT when name exceeds 200 chars', async () => {
    const useCase = new UploadBoardFileUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ ...VALID_INPUT, name: 'a'.repeat(201) }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_INPUT when sizeBytes exceeds 10 MB', async () => {
    const useCase = new UploadBoardFileUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ ...VALID_INPUT, sizeBytes: 10_485_761 }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new UploadBoardFileUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute(VALID_INPUT),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
