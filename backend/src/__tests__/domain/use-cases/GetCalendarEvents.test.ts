import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../../../domain/repositories/ICalendarEventRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { CalendarEventEntity } from '../../../domain/entities/CalendarEvent.js'
import { GetCalendarEventsUseCase } from '../../../domain/use-cases/GetCalendarEvents.js'

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

const makeEvent = (overrides: Partial<CalendarEventEntity> = {}): CalendarEventEntity => ({
  id: 'event-1',
  boardId: 'board-1',
  createdBy: 'member-1',
  title: 'Sprint Review',
  description: null,
  startAt: '2026-04-01T10:00:00.000Z',
  endAt: null,
  notifyStartDaysBefore: 0,
  notifyRepeatDaily: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('GetCalendarEventsUseCase', () => {
  let userRepo: IUserRepository
  let memberRepo: IMemberRepository
  let calendarRepo: ICalendarEventRepository

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
    calendarRepo = {
      create: vi.fn(),
      findByBoardId: vi.fn().mockResolvedValue([makeEvent()]),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('returns all calendar events for the board', async () => {
    const useCase = new GetCalendarEventsUseCase(userRepo, memberRepo, calendarRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1' })

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('event-1')
    expect(calendarRepo.findByBoardId).toHaveBeenCalledWith('board-1')
  })

  it('returns empty array when board has no events', async () => {
    vi.mocked(calendarRepo.findByBoardId).mockResolvedValue([])

    const useCase = new GetCalendarEventsUseCase(userRepo, memberRepo, calendarRepo)
    const result = await useCase.execute({ userToken: 'token', boardId: 'board-1' })

    expect(result).toHaveLength(0)
  })

  it('throws INVALID_USER_TOKEN when token is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new GetCalendarEventsUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new GetCalendarEventsUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
