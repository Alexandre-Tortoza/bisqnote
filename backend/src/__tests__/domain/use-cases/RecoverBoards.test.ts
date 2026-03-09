import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IBoardRepository } from '../../../domain/repositories/IBoardRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import type { IEmailService } from '../../../domain/services/IEmailService.js'
import type { BoardEntity } from '../../../domain/entities/Board.js'
import { RecoverBoardsUseCase } from '../../../domain/use-cases/RecoverBoards.js'

const makeBoard = (id: string): BoardEntity => ({
  id,
  isPrivate: false,
  passwordHash: null,
  ownerEmail: 'user@example.com',
  encryptedContent: JSON.stringify({ name: `Board ${id}` }),
  createdAt: new Date(),
})

describe('RecoverBoardsUseCase', () => {
  let boardRepo: IBoardRepository
  let goBackLinkRepo: IGoBackLinkRepository
  let emailService: IEmailService

  beforeEach(() => {
    boardRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByOwnerEmail: vi.fn().mockResolvedValue([makeBoard('b1'), makeBoard('b2')]),
    }
    goBackLinkRepo = {
      create: vi.fn().mockImplementation(({ token }) => Promise.resolve({
        id: 'link-id',
        boardId: 'b1',
        memberId: 'member-1',
        token,
        expiresAt: new Date(),
        usedAt: null,
      })),
      findByToken: vi.fn(),
      markUsed: vi.fn(),
    }
    emailService = {
      sendBoardCreated: vi.fn(),
      sendRecovery: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('calls findByOwnerEmail with given email', async () => {
    const useCase = new RecoverBoardsUseCase(boardRepo, goBackLinkRepo, emailService)
    await useCase.execute('user@example.com')
    expect(boardRepo.findByOwnerEmail).toHaveBeenCalledWith('user@example.com')
  })

  it('creates a GoBackLink per board found', async () => {
    const useCase = new RecoverBoardsUseCase(boardRepo, goBackLinkRepo, emailService)
    await useCase.execute('user@example.com')
    expect(goBackLinkRepo.create).toHaveBeenCalledTimes(2)
  })

  it('calls sendRecovery with board list', async () => {
    const useCase = new RecoverBoardsUseCase(boardRepo, goBackLinkRepo, emailService)
    await useCase.execute('user@example.com')
    expect(emailService.sendRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        boards: expect.arrayContaining([
          expect.objectContaining({ boardId: 'b1' }),
          expect.objectContaining({ boardId: 'b2' }),
        ]),
      }),
    )
  })

  it('is a silent no-op when no boards found', async () => {
    vi.mocked(boardRepo.findByOwnerEmail).mockResolvedValue([])
    const useCase = new RecoverBoardsUseCase(boardRepo, goBackLinkRepo, emailService)
    await useCase.execute('nobody@example.com')
    expect(goBackLinkRepo.create).not.toHaveBeenCalled()
    expect(emailService.sendRecovery).not.toHaveBeenCalled()
  })
})
