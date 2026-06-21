import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { ChatMessageEntity } from '../../../domain/entities/ChatMessage.js'
import { SendChatMessageUseCase } from '../../../domain/use-cases/SendChatMessage.js'

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

describe('SendChatMessageUseCase', () => {
  let memberRepo: IMemberRepository
  let chatRepo: IChatMessageRepository

  beforeEach(() => {
    memberRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    }
    chatRepo = {
      create: vi.fn().mockResolvedValue(makeMessage()),
      findByBoardId: vi.fn().mockResolvedValue([]),
    }
  })

  it('persists message and returns chat message with username', async () => {
    const useCase = new SendChatMessageUseCase(memberRepo, chatRepo)
    const result = await useCase.execute({ userId: 'user-1', boardId: 'board-1', text: 'encrypted-hello', username: 'alice' })

    expect(chatRepo.create).toHaveBeenCalledWith({
      boardId: 'board-1',
      memberId: 'member-1',
      content: 'encrypted-hello',
    })
    expect(result).toMatchObject({
      id: 'msg-1',
      boardId: 'board-1',
      memberId: 'member-1',
      text: 'encrypted-hello',
      username: 'alice',
    })
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('throws MEMBER_NOT_FOUND when user is not a member of the board', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new SendChatMessageUseCase(memberRepo, chatRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', text: 'hi', username: 'alice' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })

  it('throws INVALID_INPUT when text exceeds 2000 characters', async () => {
    const useCase = new SendChatMessageUseCase(memberRepo, chatRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', text: 'x'.repeat(2001), username: 'alice' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_INPUT when text is empty', async () => {
    const useCase = new SendChatMessageUseCase(memberRepo, chatRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', text: '', username: 'alice' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })
})
