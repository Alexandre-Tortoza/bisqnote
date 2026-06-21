import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { ChatMessageEntity } from '../../../domain/entities/ChatMessage.js'
import { GetChatHistoryUseCase } from '../../../domain/use-cases/GetChatHistory.js'

const makeMember = (overrides: Partial<BoardMemberEntity> = {}): BoardMemberEntity => ({
  id: 'member-1',
  boardId: 'board-1',
  userId: 'user-1',
  tokenHash: 'hash',
  role: 'member',
  encryptedContent: '{}',
  ...overrides,
})

const makeMessage = (overrides: Partial<ChatMessageEntity> = {}): ChatMessageEntity => ({
  id: 'msg-1',
  boardId: 'board-1',
  memberId: 'member-1',
  content: 'encrypted-hello',
  createdAt: new Date(),
  ...overrides,
})

describe('GetChatHistoryUseCase', () => {
  let memberRepo: IMemberRepository
  let chatRepo: IChatMessageRepository

  beforeEach(() => {
    memberRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn().mockResolvedValue([
        { memberId: 'member-1', username: 'alice' },
        { memberId: 'member-2', username: 'bob' },
      ]),
    }
    chatRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeMessage()]),
    }
  })

  it('returns messages with username resolved from member list', async () => {
    const useCase = new GetChatHistoryUseCase(memberRepo, chatRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1' })

    expect(chatRepo.findByBoardId).toHaveBeenCalledWith('board-1', 50)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'msg-1', text: 'encrypted-hello', username: 'alice' })
  })

  it('returns empty username when member id is not found in member list', async () => {
    vi.mocked(chatRepo.findByBoardId).mockResolvedValue([
      { ...makeMessage(), memberId: 'unknown-member' },
    ])

    const useCase = new GetChatHistoryUseCase(memberRepo, chatRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1' })

    expect(result[0]!.username).toBe('')
  })

  it('throws MEMBER_NOT_FOUND when user is not a member of the board', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new GetChatHistoryUseCase(memberRepo, chatRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })

  it('returns empty array when board has no messages', async () => {
    vi.mocked(chatRepo.findByBoardId).mockResolvedValue([])

    const useCase = new GetChatHistoryUseCase(memberRepo, chatRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1' })

    expect(result).toEqual([])
  })
})
