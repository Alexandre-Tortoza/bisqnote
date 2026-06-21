import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
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
  memberRepo: IMemberRepository
  columnRepo: IKanbanColumnRepository
  taskRepo: IKanbanTaskRepository
}

interface ConnInfo {
  userId: string
  memberId: string
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

/** Kanban WebSocket route — authenticates via JWT cookie on connection. */
export async function kanbanRoutes(fastify: FastifyInstance, options: KanbanRoutesOptions) {
  const { memberRepo, columnRepo, taskRepo } = options

  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/kanban',
    { websocket: true },
    (socket, request) => {
      const boardId = request.params.id
      let connInfo: ConnInfo | null = null
      let authResolve: (() => void) | null = null
      const authReady = new Promise<void>((resolve) => { authResolve = resolve })

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

          connInfo = { userId: decoded.userId, memberId: member.id }

          if (!rooms.has(boardId)) rooms.set(boardId, new Map())
          rooms.get(boardId)!.set(socket, connInfo)

          send(socket, { type: 'ready', username: decoded.username })

          const boardUseCase = new GetKanbanBoardUseCase(memberRepo, columnRepo, taskRepo)
          const boardState = await boardUseCase.execute({ userId: decoded.userId, boardId })
          send(socket, { type: 'board-state', columns: boardState.columns, members: boardState.members })
        } catch (err) {
          let message: string
          if (err instanceof AppError) {
            message = err.message
          } else {
            fastify.log.error({ err }, 'Kanban WebSocket auth error')
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

        try {
          const type = msg['type'] as string

          if (type === 'column:create') {
            const encryptedContent = msg['encryptedContent'] as string
            const useCase = new CreateKanbanColumnUseCase(memberRepo, columnRepo)
            const column = await useCase.execute({ userId: connInfo.userId, boardId, encryptedContent })
            broadcast(boardId, { type: 'column:created', column })
          } else if (type === 'column:update') {
            const columnId = msg['columnId'] as string
            const useCase = new UpdateKanbanColumnUseCase(memberRepo, columnRepo)
            const column = await useCase.execute({
              userId: connInfo.userId,
              boardId,
              columnId,
              encryptedContent: msg['encryptedContent'] as string | undefined,
              position: msg['position'] as number | undefined,
            })
            broadcast(boardId, { type: 'column:updated', column })
          } else if (type === 'column:delete') {
            const columnId = msg['columnId'] as string
            const useCase = new DeleteKanbanColumnUseCase(memberRepo, columnRepo)
            await useCase.execute({ userId: connInfo.userId, boardId, columnId })
            broadcast(boardId, { type: 'column:deleted', columnId })
          } else if (type === 'task:create') {
            const columnId = msg['columnId'] as string
            const encryptedContent = msg['encryptedContent'] as string
            const useCase = new CreateKanbanTaskUseCase(memberRepo, columnRepo, taskRepo)
            const task = await useCase.execute({ userId: connInfo.userId, boardId, columnId, encryptedContent })
            broadcast(boardId, { type: 'task:created', task })
          } else if (type === 'task:update') {
            const taskId = msg['taskId'] as string
            const useCase = new UpdateKanbanTaskUseCase(memberRepo, taskRepo)
            const task = await useCase.execute({
              userId: connInfo.userId,
              boardId,
              taskId,
              encryptedContent: msg['encryptedContent'] as string | undefined,
              assignedTo: msg['assignedTo'] as string | null | undefined,
            })
            broadcast(boardId, { type: 'task:updated', task })
          } else if (type === 'task:move') {
            const taskId = msg['taskId'] as string
            const columnId = msg['columnId'] as string
            const position = msg['position'] as number
            const useCase = new MoveKanbanTaskUseCase(memberRepo, columnRepo, taskRepo)
            const task = await useCase.execute({ userId: connInfo.userId, boardId, taskId, columnId, position })
            broadcast(boardId, { type: 'task:moved', task })
          } else if (type === 'task:delete') {
            const taskId = msg['taskId'] as string
            const columnIdForDelete = msg['columnId'] as string
            const useCase = new DeleteKanbanTaskUseCase(memberRepo, taskRepo)
            await useCase.execute({ userId: connInfo.userId, boardId, taskId })
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
