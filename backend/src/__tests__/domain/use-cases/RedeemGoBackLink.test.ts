import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IGoBackLinkRepository } from '../../../domain/repositories/IGoBackLinkRepository.js'
import type { GoBackLinkEntity } from '../../../domain/entities/GoBackLink.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import { RedeemGoBackLinkUseCase } from '../../../domain/use-cases/RedeemGoBackLink.js'

const makeLink = (overrides: Partial<GoBackLinkEntity> = {}): GoBackLinkEntity => ({
  id: 'link-1',
  boardId: 'board-1',
  memberId: 'member-1',
  token: 'valid-token',
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
  ...overrides,
})

const makeMember = (overrides: Partial<BoardMemberEntity> = {}): BoardMemberEntity => ({
  id: 'member-1',
  boardId: 'board-1',
  tokenHash: 'old-hash',
  role: 'owner',
  encryptedContent: '{}',
  ...overrides,
})

describe('RedeemGoBackLinkUseCase', () => {
  let memberRepo: IMemberRepository
  let goBackLinkRepo: IGoBackLinkRepository

  beforeEach(() => {
    memberRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn().mockResolvedValue(undefined),
    }
    goBackLinkRepo = {
      create: vi.fn(),
      findByToken: vi.fn().mockResolvedValue(makeLink()),
      markUsed: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('throws when token not found', async () => {
    vi.mocked(goBackLinkRepo.findByToken).mockResolvedValue(null)
    const useCase = new RedeemGoBackLinkUseCase(memberRepo, goBackLinkRepo)
    await expect(useCase.execute('bad-token')).rejects.toThrow('NotFoundError')
  })

  it('throws when token already used', async () => {
    vi.mocked(goBackLinkRepo.findByToken).mockResolvedValue(makeLink({ usedAt: new Date() }))
    const useCase = new RedeemGoBackLinkUseCase(memberRepo, goBackLinkRepo)
    await expect(useCase.execute('used-token')).rejects.toThrow('NotFoundError')
  })

  it('throws when token is expired', async () => {
    vi.mocked(goBackLinkRepo.findByToken).mockResolvedValue(
      makeLink({ expiresAt: new Date(Date.now() - 1000) }),
    )
    const useCase = new RedeemGoBackLinkUseCase(memberRepo, goBackLinkRepo)
    await expect(useCase.execute('expired-token')).rejects.toThrow('NotFoundError')
  })

  it('marks link as used and regenerates member token', async () => {
    const useCase = new RedeemGoBackLinkUseCase(memberRepo, goBackLinkRepo)
    await useCase.execute('valid-token')
    expect(goBackLinkRepo.markUsed).toHaveBeenCalledWith('link-1')
    expect(memberRepo.updateTokenHash).toHaveBeenCalledWith('member-1', expect.any(String))
  })

  it('returns boardId, memberToken, and role', async () => {
    const useCase = new RedeemGoBackLinkUseCase(memberRepo, goBackLinkRepo)
    const result = await useCase.execute('valid-token')
    expect(result).toMatchObject({ boardId: 'board-1', role: 'owner' })
    expect(typeof result.memberToken).toBe('string')
    expect(result.memberToken.length).toBeGreaterThan(0)
  })
})
