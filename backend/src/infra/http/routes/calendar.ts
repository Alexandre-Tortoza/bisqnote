import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../../../domain/repositories/ICalendarEventRepository.js'
import { GetCalendarEventsUseCase } from '../../../domain/use-cases/GetCalendarEvents.js'
import { CreateCalendarEventUseCase } from '../../../domain/use-cases/CreateCalendarEvent.js'
import { UpdateCalendarEventUseCase } from '../../../domain/use-cases/UpdateCalendarEvent.js'
import { DeleteCalendarEventUseCase } from '../../../domain/use-cases/DeleteCalendarEvent.js'
import { AppError } from '../../../domain/errors/AppError.js'
import type { CalendarEventEntity } from '../../../domain/entities/CalendarEvent.js'

interface CalendarRoutesOptions {
  userRepo: IUserRepository
  memberRepo: IMemberRepository
  calendarRepo: ICalendarEventRepository
}

interface ConnInfo {
  username: string
  memberId: string
  userToken: string
}

type OutboundMessage =
  | { type: 'ready'; username: string }
  | { type: 'board-state'; events: CalendarEventEntity[] }
  | { type: 'event:created'; event: CalendarEventEntity }
  | { type: 'event:updated'; event: CalendarEventEntity }
  | { type: 'event:deleted'; eventId: string }
  | { type: 'error'; message: string }

/** Per-board WebSocket rooms: boardId → Map<socket, connection info>. */
const rooms = new Map<string, Map<WebSocket, ConnInfo>>()

function send(socket: WebSocket, msg: OutboundMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(msg))
  }
}

function broadcast(boardId: string, msg: OutboundMessage) {
  const room = rooms.get(boardId)
  if (!room) return
  for (const [socket] of room) {
    send(socket, msg)
  }
}

/** Calendar WebSocket routes. */
export async function calendarRoutes(fastify: FastifyInstance, options: CalendarRoutesOptions) {
  const { userRepo, memberRepo, calendarRepo } = options

  /**
   * WebSocket endpoint: ws://host/api/boards/:id/calendar
   *
   * Client → Server:
   *   { type: 'auth', userToken }
   *   { type: 'event:create', title, startAt, endAt?, description?, notifyStartDaysBefore?, notifyRepeatDaily? }
   *   { type: 'event:update', eventId, title?, description?, startAt?, endAt?, notifyStartDaysBefore?, notifyRepeatDaily? }
   *   { type: 'event:delete', eventId }
   *
   * Server → Client (on auth):
   *   { type: 'ready', username }
   *   { type: 'board-state', events }
   *
   * Server → all (broadcast):
   *   { type: 'event:created', event }
   *   { type: 'event:updated', event }
   *   { type: 'event:deleted', eventId }
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/calendar',
    { websocket: true },
    (socket, request) => {
      const boardId = request.params.id
      let connInfo: ConnInfo | null = null

      socket.on('message', async (raw: Buffer) => {
        let msg: Record<string, unknown>
        try {
          msg = JSON.parse(raw.toString()) as Record<string, unknown>
        } catch {
          return
        }

        if (!connInfo) {
          if (msg['type'] !== 'auth' || typeof msg['userToken'] !== 'string') {
            send(socket, { type: 'error', message: 'First message must be auth' })
            socket.close()
            return
          }

          try {
            const userToken = msg['userToken'] as string
            const tokenHash = createHash('sha256').update(userToken).digest('hex')
            const user = await userRepo.findByTokenHash(tokenHash)
            if (!user) throw new AppError('INVALID_USER_TOKEN', 'Invalid or expired user token')

            const member = await memberRepo.findByUserAndBoard(user.id, boardId)
            if (!member) throw new AppError('MEMBER_NOT_FOUND', 'User is not a member of this board')

            connInfo = { username: user.username, memberId: member.id, userToken }

            if (!rooms.has(boardId)) rooms.set(boardId, new Map())
            rooms.get(boardId)!.set(socket, connInfo)

            send(socket, { type: 'ready', username: user.username })

            const getUseCase = new GetCalendarEventsUseCase(userRepo, memberRepo, calendarRepo)
            const events = await getUseCase.execute({ userToken, boardId })
            send(socket, { type: 'board-state', events })
          } catch (err) {
            const message = err instanceof AppError ? err.message : 'Authentication failed'
            send(socket, { type: 'error', message })
            socket.close()
          }

          return
        }

        // Authenticated — handle calendar commands
        try {
          const type = msg['type'] as string

          if (type === 'event:create') {
            const useCase = new CreateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
            const event = await useCase.execute({
              userToken: connInfo.userToken,
              boardId,
              title: msg['title'] as string,
              startAt: msg['startAt'] as string,
              endAt: msg['endAt'] as string | null | undefined,
              description: msg['description'] as string | null | undefined,
              notifyStartDaysBefore: msg['notifyStartDaysBefore'] as number | undefined,
              notifyRepeatDaily: msg['notifyRepeatDaily'] as boolean | undefined,
            })
            broadcast(boardId, { type: 'event:created', event })
          } else if (type === 'event:update') {
            const useCase = new UpdateCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
            const event = await useCase.execute({
              userToken: connInfo.userToken,
              boardId,
              eventId: msg['eventId'] as string,
              title: msg['title'] as string | undefined,
              description: msg['description'] as string | null | undefined,
              startAt: msg['startAt'] as string | undefined,
              endAt: msg['endAt'] as string | null | undefined,
              notifyStartDaysBefore: msg['notifyStartDaysBefore'] as number | undefined,
              notifyRepeatDaily: msg['notifyRepeatDaily'] as boolean | undefined,
            })
            broadcast(boardId, { type: 'event:updated', event })
          } else if (type === 'event:delete') {
            const eventId = msg['eventId'] as string
            const useCase = new DeleteCalendarEventUseCase(userRepo, memberRepo, calendarRepo)
            await useCase.execute({ userToken: connInfo.userToken, boardId, eventId })
            broadcast(boardId, { type: 'event:deleted', eventId })
          }
        } catch (err) {
          const message = err instanceof AppError ? err.message : 'Operation failed'
          send(socket, { type: 'error', message })
        }
      })

      socket.on('close', () => {
        if (connInfo) {
          const room = rooms.get(boardId)
          if (room) {
            room.delete(socket)
            if (room.size === 0) rooms.delete(boardId)
          }
        }
      })
    },
  )
}
