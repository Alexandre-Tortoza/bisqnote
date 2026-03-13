import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { ChatMessageEntity } from '../../../domain/entities/ChatMessage.js'
import { GetChatHistoryUseCase } from '../../../domain/use-cases/GetChatHistory.js'

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-1',
  username: 'alice',
  passwordHash: 'hash',
  tokenHash: 'sha256token',
  createdAt: new Date(),
  ...overrides,
})

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
  content: JSON.stringify({ text: 'hello', username: 'alice' }),
  createdAt: new Date(),
  ...overrides,
})

describe('GetChatHistoryUseCase', () => {
  let userRepo: IUserRepository
  let memberRepo: IMemberRepository
  let chatRepo: IChatMessageRepository

  beforeEach(() => {
    userRepo = {
      create: vi.fn(),
      findByUsername: vi.fn(),
      findByTokenHash: vi.fn().mockResolvedValue(makeUser()),
      updateTokenHash: vi.fn(),
    }
    memberRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    }
    chatRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeMessage()]),
    }
  })

  it('returns parsed messages for a valid member', async () => {
    const useCase = new GetChatHistoryUseCase(userRepo, memberRepo, chatRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1' })

    expect(chatRepo.findByBoardId).toHaveBeenCalledWith('board-1', 50)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'msg-1', text: 'hello', username: 'alice' })
  })

  it('throws INVALID_USER_TOKEN when userToken is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new GetChatHistoryUseCase(userRepo, memberRepo, chatRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a member of the board', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new GetChatHistoryUseCase(userRepo, memberRepo, chatRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })

  it('returns empty array when board has no messages', async () => {
    vi.mocked(chatRepo.findByBoardId).mockResolvedValue([])

    const useCase = new GetChatHistoryUseCase(userRepo, memberRepo, chatRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1' })

    expect(result).toEqual([])
  })
})
