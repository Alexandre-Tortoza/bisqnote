import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../../../domain/repositories/ICalendarEventRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { CalendarEventEntity } from '../../../domain/entities/CalendarEvent.js'
import { UpdateCalendarEventUseCase } from '../../../domain/use-cases/UpdateCalendarEvent.js'

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

describe('UpdateCalendarEventUseCase', () => {
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
      create: vi.fn(),
      findByBoardId: vi.fn(),
      findById: vi.fn().mockResolvedValue(makeEvent()),
      update: vi.fn().mockResolvedValue(makeEvent({ encryptedContent: 'encrypted-updated' })),
      delete: vi.fn(),
    }
  })

  it('updates and returns the calendar event', async () => {
    vi.mocked(calendarRepo.update).mockResolvedValue(makeEvent({ encryptedContent: 'encrypted-updated' }))

    const useCase = new UpdateCalendarEventUseCase(memberRepo, calendarRepo)
    const result = await useCase.execute({
      userId: 'user-1',
      boardId: 'board-1',
      eventId: 'event-1',
      encryptedContent: 'encrypted-updated',
    })

    expect(result.encryptedContent).toBe('encrypted-updated')
    expect(calendarRepo.update).toHaveBeenCalledWith('event-1', expect.objectContaining({ encryptedContent: 'encrypted-updated' }))
  })

  it('throws EVENT_NOT_FOUND when event does not exist', async () => {
    vi.mocked(calendarRepo.findById).mockResolvedValue(null)

    const useCase = new UpdateCalendarEventUseCase(memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', eventId: 'no-such', encryptedContent: 'x' }),
    ).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' })
  })

  it('throws EVENT_NOT_FOUND when event belongs to another board', async () => {
    vi.mocked(calendarRepo.findById).mockResolvedValue(makeEvent({ boardId: 'other-board' }))

    const useCase = new UpdateCalendarEventUseCase(memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', eventId: 'event-1', encryptedContent: 'x' }),
    ).rejects.toMatchObject({ code: 'EVENT_NOT_FOUND' })
  })

  it('throws MEMBER_NOT_FOUND when user is not a board member', async () => {
    vi.mocked(memberRepo.findByUserAndBoard).mockResolvedValue(null)

    const useCase = new UpdateCalendarEventUseCase(memberRepo, calendarRepo)
    await expect(
      useCase.execute({ userId: 'user-1', boardId: 'board-1', eventId: 'event-1' }),
    ).rejects.toMatchObject({ code: 'MEMBER_NOT_FOUND' })
  })
})
