import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../../../domain/repositories/ICalendarEventRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { CalendarEventEntity } from '../../../domain/entities/CalendarEvent.js'
import { UpdateCalendarEventUseCase } from '../../../domain/use-cases/UpdateCalendarEvent.js'

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

describe('UpdateCalendarEventUseCase', () => {
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
      findByBoardId: vi.fn(),
      findById: vi.fn().mockResolvedValue(makeEvent()),
      update: vi.fn().mockResolvedValue(makeEvent({ title: 'Updated' })),
      delete: vi.fn(),
    }
  })

  it('updates and returns the calendar event', async () => {
    const useCase = new UpdateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    const result = await useCase.execute({
      userToken: 'token',
      boardId: 'board-1',
      eventId: 'event-1',
      title: 'Updated',
    })

    expect(result.title).toBe('Updated')
    expect(calendarRepo.update).toHaveBeenCalledWith('event-1', expect.objectContaining({ title: 'Updated' }))
  })

  it('throws EVENT_NOT_FOUND when event does not exist', async () => {
    vi.mocked(calendarRepo.findById).mockResolvedValue(null)

    const useCase = new UpdateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', eventId: 'no-such', title: 'x' }),
    ).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' })
  })

  it('throws EVENT_NOT_FOUND when event belongs to another board', async () => {
    vi.mocked(calendarRepo.findById).mockResolvedValue(makeEvent({ boardId: 'other-board' }))

    const useCase = new UpdateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', eventId: 'event-1', title: 'x' }),
    ).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' })
  })

  it('throws INVALID_INPUT when title exceeds 200 characters', async () => {
    const useCase = new UpdateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', eventId: 'event-1', title: 'a'.repeat(201) }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_USER_TOKEN when token is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new UpdateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1', eventId: 'event-1' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new UpdateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', eventId: 'event-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
