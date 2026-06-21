import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../../../domain/repositories/IBoardFileRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { BoardFileEntity } from '../../../domain/entities/BoardFile.js'
import { AddBoardLinkUseCase } from '../../../domain/use-cases/AddBoardLink.js'

const makeMember = (overrides: Partial<BoardMemberEntity> = {}): BoardMemberEntity => ({
  id: 'member-1',
  boardId: 'board-1',
  userId: 'user-1',
  tokenHash: 'hash',
  role: 'member',
  encryptedContent: '{}',
  ...overrides,
})

const makeLink = (overrides: Partial<BoardFileEntity> = {}): BoardFileEntity => ({
  id: 'file-1',
  boardId: 'board-1',
  uploadedBy: 'member-1',
  type: 'link',
  name: 'Figma',
  url: 'https://figma.com/file/abc',
  mimeType: null,
  sizeBytes: null,
  storageKey: null,
  createdAt: new Date(),
  ...overrides,
})

describe('AddBoardLinkUseCase', () => {
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
      createLink: vi.fn().mockResolvedValue(makeLink()),
      createFile: vi.fn(),
      findByBoardId: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates and returns a link entry', async () => {
    const useCase = new AddBoardLinkUseCase(memberRepo, fileRepo)
    const result = await useCase.execute({
      userId: 'user-1',
      boardId: 'board-1',
      name: 'Figma',
      url: 'https://figma.com/file/abc',
    })

    expect(result.type).toBe('link')
    expect(result.name).toBe('Figma')
    expect(fileRepo.createLink).toHaveBeenCalledWith({
      boardId: 'board-1',
      uploadedBy: 'member-1',
      name: 'Figma',
      url: 'https://figma.com/file/abc',
    })
  })

  it('throws INVALID_INPUT when name is empty', async () => {
    const useCase = new AddBoardLinkUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', name: '', url: 'https://x.com' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_INPUT when name exceeds 200 chars', async () => {
    const useCase = new AddBoardLinkUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({
        userId: 'user-1',
        boardId: 'board-1',
        name: 'a'.repeat(201),
        url: 'https://x.com',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_INPUT when url is empty', async () => {
    const useCase = new AddBoardLinkUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', name: 'Link', url: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new AddBoardLinkUseCase(memberRepo, fileRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', name: 'Link', url: 'https://x.com' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
