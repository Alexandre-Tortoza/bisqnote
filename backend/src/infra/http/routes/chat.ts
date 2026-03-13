import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IChatMessageRepository } from '../../../domain/repositories/IChatMessageRepository.js'
import { SendChatMessageUseCase } from '../../../domain/use-cases/SendChatMessage.js'
import { GetChatHistoryUseCase } from '../../../domain/use-cases/GetChatHistory.js'
import { AppError } from '../../../domain/errors/AppError.js'

interface ChatRoutesOptions {
  userRepo: IUserRepository
  memberRepo: IMemberRepository
  chatRepo: IChatMessageRepository
}

interface ConnInfo {
  username: string
  memberId: string
  userToken: string
}

/** Outbound message shapes broadcast to connected clients. */
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

/** Chat HTTP + WebSocket routes. */
export async function chatRoutes(fastify: FastifyInstance, options: ChatRoutesOptions) {
  const { userRepo, memberRepo, chatRepo } = options

  /**
   * WebSocket endpoint: ws://host/api/boards/:id/chat
   *
   * Protocol (messages are JSON strings):
   *   Client → Server: { type: 'auth', userToken: string }
   *   Server → Client: { type: 'ready', username }  then  { type: 'history', messages }
   *   Client → Server: { type: 'message', text: string }
   *   Server → all:   { type: 'message', id, memberId, username, text, createdAt }
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/chat',
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
          // Expecting auth message first
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

            // Add to room
            if (!rooms.has(boardId)) rooms.set(boardId, new Map())
            rooms.get(boardId)!.set(socket, connInfo)

            send(socket, { type: 'ready', username: user.username })

            // Send message history
            const historyUseCase = new GetChatHistoryUseCase(userRepo, memberRepo, chatRepo)
            const history = await historyUseCase.execute({ userToken, boardId })
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
            const message = err instanceof AppError ? err.message : 'Authentication failed'
            send(socket, { type: 'error', message })
            socket.close()
          }

          return
        }

        // Authenticated: handle chat messages
        if (msg['type'] === 'message' && typeof msg['text'] === 'string') {
          try {
            const sendUseCase = new SendChatMessageUseCase(userRepo, memberRepo, chatRepo)
            const saved = await sendUseCase.execute({
              userToken: connInfo.userToken,
              boardId,
              text: msg['text'] as string,
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
