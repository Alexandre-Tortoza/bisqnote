import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../../../domain/repositories/ICalendarEventRepository.js'
import type { UserEntity } from '../../../domain/entities/User.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { CalendarEventEntity } from '../../../domain/entities/CalendarEvent.js'
import { CreateCalendarEventUseCase } from '../../../domain/use-cases/CreateCalendarEvent.js'

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

describe('CreateCalendarEventUseCase', () => {
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
      create: vi.fn().mockResolvedValue(makeEvent()),
      findByBoardId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('creates and returns a calendar event', async () => {
    const useCase = new CreateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    const result = await useCase.execute({
      userToken: 'token',
      boardId: 'board-1',
      title: 'Sprint Review',
      startAt: '2026-04-01T10:00:00.000Z',
    })

    expect(result.id).toBe('event-1')
    expect(calendarRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ boardId: 'board-1', title: 'Sprint Review', createdBy: 'member-1' }),
    )
  })

  it('passes optional fields through to repository', async () => {
    const useCase = new CreateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await useCase.execute({
      userToken: 'token',
      boardId: 'board-1',
      title: 'Daily',
      startAt: '2026-04-01T09:00:00.000Z',
      endAt: '2026-04-01T09:15:00.000Z',
      description: 'Daily standup',
      notifyStartDaysBefore: 1,
      notifyRepeatDaily: true,
    })

    expect(calendarRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        endAt: '2026-04-01T09:15:00.000Z',
        description: 'Daily standup',
        notifyStartDaysBefore: 1,
        notifyRepeatDaily: true,
      }),
    )
  })

  it('throws INVALID_INPUT when title is empty', async () => {
    const useCase = new CreateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', title: '', startAt: '2026-04-01T10:00:00.000Z' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_INPUT when title exceeds 200 characters', async () => {
    const useCase = new CreateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({
        userToken: 'token',
        boardId: 'board-1',
        title: 'a'.repeat(201),
        startAt: '2026-04-01T10:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws INVALID_USER_TOKEN when token is invalid', async () => {
    vi.mocked(userRepo.findByTokenHash).mockResolvedValue(null)

    const useCase = new CreateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'bad', boardId: 'board-1', title: 'Event', startAt: '2026-04-01T10:00:00.000Z' }),
    ).rejects.toMatchObject({ code: 'INVALID_USER_TOKEN' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new CreateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userToken: 'token', boardId: 'board-1', title: 'Event', startAt: '2026-04-01T10:00:00.000Z' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
