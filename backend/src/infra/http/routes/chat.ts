import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository.js'
import { SendChatMessageUseCase } from '../../../domain/use-cases/SendChatMessage.js'
import { GetChatHistoryUseCase } from '../../../domain/use-cases/GetChatHistory.js'
import { AppError } from '../../../domain/errors/AppError.js'

interface ChatRoutesOptions {
  memberRepo: IMemberRepository
  chatRepo: IChatMessageRepository
}

interface ConnInfo {
  userId: string
  username: string
  memberId: string
}

type OutboundMessage =
  | { type: 'ready'; username: string }
  | { type: 'history'; messages: HistoryMsg[] }
  | { type: 'message'; id: string; memberId: string | null; username: string; text: string; createdAt: string }
  | { type: 'error'; message: string }

interface HistoryMsg {
  id: string
  memberId: string | null
  username: string
  text: string
  createdAt: string
}

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

/** Chat WebSocket route — authenticates via JWT cookie on connection. */
export async function chatRoutes(fastify: FastifyInstance, options: ChatRoutesOptions) {
  const { memberRepo, chatRepo } = options

  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/chat',
    { websocket: true },
    (socket, request) => {
      const boardId = request.params.id
      let connInfo: ConnInfo | null = null
      let authResolve: (() => void) | null = null
      const authReady = new Promise<void>((resolve) => { authResolve = resolve })

      // Authenticate via JWT cookie
      ;(async () => {
        try {
          const token = request.cookies?.['token']
          if (!token) throw new AppError('AUTH_FAILED', 'Missing authentication token')

          let decoded: { userId: string; username: string }
          try {
            decoded = fastify.jwt.verify<{ userId: string; username: string }>(token)
          } catch (jwtErr) {
            const msg = jwtErr instanceof Error ? jwtErr.message : 'Invalid token'
            throw new AppError('AUTH_FAILED', msg)
          }

          const member = await memberRepo.findByUserAndBoard(decoded.userId, boardId)
          if (!member) throw new AppError('AUTH_FAILED', 'Not a member of this board')

          connInfo = { userId: decoded.userId, username: decoded.username, memberId: member.id }

          if (!rooms.has(boardId)) rooms.set(boardId, new Map())
          rooms.get(boardId)!.set(socket, connInfo)

          send(socket, { type: 'ready', username: decoded.username })

          const historyUseCase = new GetChatHistoryUseCase(memberRepo, chatRepo)
          const history = await historyUseCase.execute({ userId: decoded.userId, boardId })
          send(socket, {
            type: 'history',
            messages: history.map((m) => ({
              id: m.id,
              memberId: m.memberId,
              username: m.username,
              text: m.text,
              createdAt: m.createdAt.toISOString(),
            })),
          })
        } catch (err) {
          let message: string
          if (err instanceof AppError) {
            message = err.message
          } else {
            fastify.log.error({ err }, 'Chat WebSocket auth error')
            message = 'Authentication failed'
          }
          send(socket, { type: 'error', message })
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

        if (msg['type'] === 'message' && typeof msg['encryptedContent'] === 'string') {
          try {
            const sendUseCase = new SendChatMessageUseCase(memberRepo, chatRepo)
            const saved = await sendUseCase.execute({
              userId: connInfo.userId,
              boardId,
              text: msg['encryptedContent'] as string,
              username: connInfo.username,
            })

            broadcast(boardId, {
              type: 'message',
              id: saved.id,
              memberId: saved.memberId,
              username: saved.username,
              text: saved.text,
              createdAt: saved.createdAt.toISOString(),
            })
          } catch (err) {
            const message = err instanceof AppError ? err.message : 'Failed to send message'
            send(socket, { type: 'error', message })
          }
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
