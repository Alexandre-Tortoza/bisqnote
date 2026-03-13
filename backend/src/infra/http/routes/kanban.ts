import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { IUserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IKanbanColumnRepository } from '../../../domain/repositories/IKanbanColumnRepository.js'
import type { IKanbanTaskRepository } from '../../../domain/repositories/IKanbanTaskRepository.js'
import { GetKanbanBoardUseCase } from '../../../domain/use-cases/GetKanbanBoard.js'
import { CreateKanbanColumnUseCase } from '../../../domain/use-cases/CreateKanbanColumn.js'
import { UpdateKanbanColumnUseCase } from '../../../domain/use-cases/UpdateKanbanColumn.js'
import { DeleteKanbanColumnUseCase } from '../../../domain/use-cases/DeleteKanbanColumn.js'
import { CreateKanbanTaskUseCase } from '../../../domain/use-cases/CreateKanbanTask.js'
import { UpdateKanbanTaskUseCase } from '../../../domain/use-cases/UpdateKanbanTask.js'
import { MoveKanbanTaskUseCase } from '../../../domain/use-cases/MoveKanbanTask.js'
import { DeleteKanbanTaskUseCase } from '../../../domain/use-cases/DeleteKanbanTask.js'
import { AppError } from '../../../domain/errors/AppError.js'
import type { KanbanColumnWithTasks } from '../../../domain/use-cases/GetKanbanBoard.js'
import type { KanbanTaskEntity } from '../../../domain/entities/KanbanTask.js'
import type { KanbanColumnEntity } from '../../../domain/entities/KanbanColumn.js'
import type { BoardMemberInfo } from '../../../domain/repositories/IMemberRepository.js'

interface KanbanRoutesOptions {
  userRepo: IUserRepository
  memberRepo: IMemberRepository
  columnRepo: IKanbanColumnRepository
  taskRepo: IKanbanTaskRepository
}

interface ConnInfo {
  username: string
  memberId: string
  userToken: string
}

type OutboundMessage =
  | { type: 'ready'; username: string }
  | { type: 'board-state'; columns: KanbanColumnWithTasks[]; members: BoardMemberInfo[] }
  | { type: 'column:created'; column: KanbanColumnEntity }
  | { type: 'column:updated'; column: KanbanColumnEntity }
  | { type: 'column:deleted'; columnId: string }
  | { type: 'task:created'; task: KanbanTaskEntity }
  | { type: 'task:updated'; task: KanbanTaskEntity }
  | { type: 'task:moved'; task: KanbanTaskEntity }
  | { type: 'task:deleted'; taskId: string; columnId: string }
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

/** Kanban WebSocket routes. */
export async function kanbanRoutes(fastify: FastifyInstance, options: KanbanRoutesOptions) {
  const { userRepo, memberRepo, columnRepo, taskRepo } = options

  /**
   * WebSocket endpoint: ws://host/api/boards/:id/kanban
   *
   * Client → Server:
   *   { type: 'auth', userToken }
   *   { type: 'column:create', title }
   *   { type: 'column:update', columnId, title?, position? }
   *   { type: 'column:delete', columnId }
   *   { type: 'task:create', columnId, title }
   *   { type: 'task:update', taskId, title?, description?, effort?, dueDate?, assignedTo? }
   *   { type: 'task:move', taskId, columnId, position }
   *   { type: 'task:delete', taskId }
   *
   * Server → Client (on auth):
   *   { type: 'ready', username }
   *   { type: 'board-state', columns, members }
   *
   * Server → all (broadcast):
   *   { type: 'column:created', column }  etc.
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/kanban',
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

            const boardUseCase = new GetKanbanBoardUseCase(userRepo, memberRepo, columnRepo, taskRepo)
            const boardState = await boardUseCase.execute({ userToken, boardId })
            send(socket, { type: 'board-state', columns: boardState.columns, members: boardState.members })
          } catch (err) {
            const message = err instanceof AppError ? err.message : 'Authentication failed'
            send(socket, { type: 'error', message })
            socket.close()
          }

          return
        }

        // Authenticated — handle kanban commands
        try {
          const type = msg['type'] as string

          if (type === 'column:create') {
            const title = msg['title'] as string
            const useCase = new CreateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
            const column = await useCase.execute({ userToken: connInfo.userToken, boardId, title })
            broadcast(boardId, { type: 'column:created', column })
          } else if (type === 'column:update') {
            const columnId = msg['columnId'] as string
            const useCase = new UpdateKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
            const column = await useCase.execute({
              userToken: connInfo.userToken,
              boardId,
              columnId,
              title: msg['title'] as string | undefined,
              position: msg['position'] as number | undefined,
            })
            broadcast(boardId, { type: 'column:updated', column })
          } else if (type === 'column:delete') {
            const columnId = msg['columnId'] as string
            const useCase = new DeleteKanbanColumnUseCase(userRepo, memberRepo, columnRepo)
            await useCase.execute({ userToken: connInfo.userToken, boardId, columnId })
            broadcast(boardId, { type: 'column:deleted', columnId })
          } else if (type === 'task:create') {
            const columnId = msg['columnId'] as string
            const title = msg['title'] as string
            const useCase = new CreateKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
            const task = await useCase.execute({ userToken: connInfo.userToken, boardId, columnId, title })
            broadcast(boardId, { type: 'task:created', task })
          } else if (type === 'task:update') {
            const taskId = msg['taskId'] as string
            const useCase = new UpdateKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
            const task = await useCase.execute({
              userToken: connInfo.userToken,
              boardId,
              taskId,
              title: msg['title'] as string | undefined,
              description: msg['description'] as string | null | undefined,
              effort: msg['effort'] as number | null | undefined,
              dueDate: msg['dueDate'] as string | null | undefined,
              assignedTo: msg['assignedTo'] as string | null | undefined,
            })
            broadcast(boardId, { type: 'task:updated', task })
          } else if (type === 'task:move') {
            const taskId = msg['taskId'] as string
            const columnId = msg['columnId'] as string
            const position = msg['position'] as number
            const useCase = new MoveKanbanTaskUseCase(userRepo, memberRepo, columnRepo, taskRepo)
            const task = await useCase.execute({ userToken: connInfo.userToken, boardId, taskId, columnId, position })
            broadcast(boardId, { type: 'task:moved', task })
          } else if (type === 'task:delete') {
            const taskId = msg['taskId'] as string
            const columnIdForDelete = msg['columnId'] as string
            const useCase = new DeleteKanbanTaskUseCase(userRepo, memberRepo, taskRepo)
            await useCase.execute({ userToken: connInfo.userToken, boardId, taskId })
            broadcast(boardId, { type: 'task:deleted', taskId, columnId: columnIdForDelete })
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
