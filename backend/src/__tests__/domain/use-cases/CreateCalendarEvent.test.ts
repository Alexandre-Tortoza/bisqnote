import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../../../domain/repositories/ICalendarEventRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { CalendarEventEntity } from '../../../domain/entities/CalendarEvent.js'
import { CreateCalendarEventUseCase } from '../../../domain/use-cases/CreateCalendarEvent.js'

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
  encryptedContent: 'encrypted-event',
  startAt: '2026-04-01T10:00:00.000Z',
  endAt: null,
  notifyStartDaysBefore: 0,
  notifyRepeatDaily: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('CreateCalendarEventUseCase', () => {
  let memberRepo: IMemberRepository
  let calendarRepo: ICalendarEventRepository

  beforeEach(() => {
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
    const useCase = new CreateCalendarEventUseCase(memberRepo, calendarRepo)
    const result = await useCase.execute({
      userId: 'user-1',
      boardId: 'board-1',
      encryptedContent: 'encrypted-event',
      startAt: '2026-04-01T10:00:00.000Z',
    })

    expect(result.id).toBe('event-1')
    expect(calendarRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ boardId: 'board-1', encryptedContent: 'encrypted-event', createdBy: 'member-1' }),
    )
  })

  it('passes optional fields through to repository', async () => {
    const useCase = new CreateCalendarEventUseCase(memberRepo, calendarRepo)
    await useCase.execute({
      userId: 'user-1',
      boardId: 'board-1',
      encryptedContent: 'encrypted-daily',
      startAt: '2026-04-01T09:00:00.000Z',
      endAt: '2026-04-01T09:15:00.000Z',
      notifyStartDaysBefore: 1,
      notifyRepeatDaily: true,
    })

    expect(calendarRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        endAt: '2026-04-01T09:15:00.000Z',
        notifyStartDaysBefore: 1,
        notifyRepeatDaily: true,
      }),
    )
  })

  it('throws INVALID_INPUT when startAt is missing', async () => {
    const useCase = new CreateCalendarEventUseCase(memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', encryptedContent: 'event', startAt: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new CreateCalendarEventUseCase(memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', encryptedContent: 'event', startAt: '2026-04-01T10:00:00.000Z' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
