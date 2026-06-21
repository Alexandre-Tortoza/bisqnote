import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { ICalendarEventRepository } from '../../../domain/repositories/ICalendarEventRepository.js'
import { GetCalendarEventsUseCase } from '../../../domain/use-cases/GetCalendarEvents.js'
import { CreateCalendarEventUseCase } from '../../../domain/use-cases/CreateCalendarEvent.js'
import { UpdateCalendarEventUseCase } from '../../../domain/use-cases/UpdateCalendarEvent.js'
import { DeleteCalendarEventUseCase } from '../../../domain/use-cases/DeleteCalendarEvent.js'
import { AppError } from '../../../domain/errors/AppError.js'
import type { CalendarEventEntity } from '../../../domain/entities/CalendarEvent.js'

interface CalendarRoutesOptions {
  memberRepo: IMemberRepository
  calendarRepo: ICalendarEventRepository
}

interface ConnInfo {
  userId: string
  memberId: string
}

type OutboundMessage =
  | { type: 'ready'; username: string }
  | { type: 'board-state'; events: CalendarEventEntity[] }
  | { type: 'event:created'; event: CalendarEventEntity }
  | { type: 'event:updated'; event: CalendarEventEntity }
  | { type: 'event:deleted'; eventId: string }
  | { type: 'error'; message: string }

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

/** Calendar WebSocket route — authenticates via JWT cookie on connection. */
export async function calendarRoutes(fastify: FastifyInstance, options: CalendarRoutesOptions) {
  const { memberRepo, calendarRepo } = options

  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/calendar',
    { websocket: true },
    (socket, request) => {
      const boardId = request.params.id
      let connInfo: ConnInfo | null = null
      let authResolve: (() => void) | null = null
      const authReady = new Promise<void>((resolve) => { authResolve = resolve })

      fastify.log.info({ boardId }, 'Calendar WS: new connection')

      ;(async () => {
        try {
          const token = request.cookies?.['token']
          if (!token) {
            fastify.log.warn({ boardId }, 'Calendar WS: missing token')
            throw new AppError('AUTH_FAILED', 'Missing authentication token')
          }

          let decoded: { userId: string; username: string }
          try {
            decoded = fastify.jwt.verify<{ userId: string; username: string }>(token)
            fastify.log.info({ userId: decoded.userId, username: decoded.username }, 'Calendar WS: JWT verified')
          } catch (jwtErr) {
            const msg = jwtErr instanceof Error ? jwtErr.message : 'Invalid token'
            fastify.log.warn({ boardId, err: jwtErr }, 'Calendar WS: JWT verification failed')
            throw new AppError('AUTH_FAILED', msg)
          }

          const member = await memberRepo.findByUserAndBoard(decoded.userId, boardId)
          if (!member) {
            fastify.log.warn({ userId: decoded.userId, boardId }, 'Calendar WS: member not found')
            throw new AppError('AUTH_FAILED', 'Not a member of this board')
          }
          fastify.log.info({ userId: decoded.userId, memberId: member.id }, 'Calendar WS: member found')

          connInfo = { userId: decoded.userId, memberId: member.id }

          if (!rooms.has(boardId)) rooms.set(boardId, new Map())
          rooms.get(boardId)!.set(socket, connInfo)
          fastify.log.info({ boardId }, 'Calendar WS: joined room')

          send(socket, { type: 'ready', username: decoded.username })
          fastify.log.info({ username: decoded.username }, 'Calendar WS: ready sent')

          const getUseCase = new GetCalendarEventsUseCase(memberRepo, calendarRepo)
          const events = await getUseCase.execute({ userId: decoded.userId, boardId })
          fastify.log.info({ count: events.length }, 'Calendar WS: board-state loaded')
          send(socket, { type: 'board-state', events })
        } catch (err) {
          let message: string
          if (err instanceof AppError) {
            message = err.message
            fastify.log.warn({ boardId, message }, 'Calendar WS: AppError')
          } else {
            fastify.log.error(
              { err: err instanceof Error ? { message: err.message, stack: err.stack, name: err.name } : err },
              'Calendar WS: unexpected error',
            )
            message = 'Authentication failed'
          }
          send(socket, { type: 'error', message })
          fastify.log.info({ message }, 'Calendar WS: error sent, closing socket')
          socket.close()
        }
        authResolve!()
      })()

      socket.on('message', async (raw: Buffer) => {
        await authReady
        if (!connInfo) return

        let msg: Record<string, unknown>
        try {
          msg = JSON.parse(raw.toString()) as Record<string, unknown>
        } catch {
          return
        }

        try {
          const type = msg['type'] as string

          if (type === 'event:create') {
            const useCase = new CreateCalendarEventUseCase(memberRepo, calendarRepo)
            const event = await useCase.execute({
              userId: connInfo.userId,
              boardId,
              encryptedContent: msg['encryptedContent'] as string,
              startAt: msg['startAt'] as string,
              endAt: msg['endAt'] as string | null | undefined,
              notifyStartDaysBefore: msg['notifyStartDaysBefore'] as number | undefined,
              notifyRepeatDaily: msg['notifyRepeatDaily'] as boolean | undefined,
            })
            broadcast(boardId, { type: 'event:created', event })
          } else if (type === 'event:update') {
            const useCase = new UpdateCalendarEventUseCase(memberRepo, calendarRepo)
            const event = await useCase.execute({
              userId: connInfo.userId,
              boardId,
              eventId: msg['eventId'] as string,
              encryptedContent: msg['encryptedContent'] as string | undefined,
              startAt: msg['startAt'] as string | undefined,
              endAt: msg['endAt'] as string | null | undefined,
              notifyStartDaysBefore: msg['notifyStartDaysBefore'] as number | undefined,
              notifyRepeatDaily: msg['notifyRepeatDaily'] as boolean | undefined,
            })
            broadcast(boardId, { type: 'event:updated', event })
          } else if (type === 'event:delete') {
            const eventId = msg['eventId'] as string
            const useCase = new DeleteCalendarEventUseCase(memberRepo, calendarRepo)
            await useCase.execute({ userId: connInfo.userId, boardId, eventId })
            broadcast(boardId, { type: 'event:deleted', eventId })
          }
        } catch (err) {
          const message = err instanceof AppError ? err.message : 'Operation failed'
          send(socket, { type: 'error', message })
        }
      })

      socket.on('close', () => {
        fastify.log.info({ boardId, hadConnInfo: !!connInfo }, 'Calendar WS: socket closed')
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
