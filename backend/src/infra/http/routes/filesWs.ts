import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../../../domain/repositories/IBoardFileRepository.js'
import { ListBoardFilesUseCase } from '../../../domain/use-cases/ListBoardFiles.js'
import { AddBoardLinkUseCase } from '../../../domain/use-cases/AddBoardLink.js'
import { UploadBoardFileUseCase } from '../../../domain/use-cases/UploadBoardFile.js'
import { AppError } from '../../../domain/errors/AppError.js'
import { joinRoom, leaveRoom, send, broadcast } from '../plugins/boardEventBus.js'
import type { BoardFileEntity } from '../../../domain/entities/BoardFile.js'

const uploadsDir = process.env['UPLOADS_DIR'] ?? './uploads'
const MAX_FILE_BYTES = 10_485_760 // 10 MB

interface FilesWsRoutesOptions {
  memberRepo: IMemberRepository
  fileRepo: IBoardFileRepository
}

export type FilesOutboundMessage =
  | { type: 'ready'; username: string }
  | { type: 'board-state'; files: BoardFileEntity[] }
  | { type: 'file:created'; file: BoardFileEntity }
  | { type: 'file:deleted'; fileId: string; boardId: string }
  | { type: 'error'; message: string }

/** Files WebSocket route — broadcasts file upload/link/deletion events in real time. */
export async function filesWsRoutes(fastify: FastifyInstance, options: FilesWsRoutesOptions) {
  const { memberRepo, fileRepo } = options

  mkdirSync(uploadsDir, { recursive: true })

  fastify.get<{ Params: { id: string } }>(
    '/api/boards/:id/files/ws',
    { websocket: true },
    (socket, request) => {
      const boardId = request.params.id
      let authResolve: (() => void) | null = null
      const authReady = new Promise<void>((resolve) => { authResolve = resolve })
      let authed = false
      let authUserId: string | null = null

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

          authUserId = decoded.userId

          joinRoom(boardId, socket, {
            userId: decoded.userId,
            username: decoded.username,
            memberId: member.id,
          })
          authed = true

          send(socket, { type: 'ready', username: decoded.username })

          const listUseCase = new ListBoardFilesUseCase(memberRepo, fileRepo)
          const files = await listUseCase.execute({ userId: decoded.userId, boardId })
          send(socket, { type: 'board-state', files })
        } catch (err) {
          let message: string
          if (err instanceof AppError) {
            message = err.message
          } else {
            fastify.log.error({ err }, 'Files WebSocket auth error')
            message = 'Authentication failed'
          }
          send(socket, { type: 'error', message })
          socket.close()
        }
        authResolve!()
      })()

      socket.on('message', async (raw: Buffer) => {
        await authReady
        if (!authed || !authUserId) return

        let msg: Record<string, unknown>
        try {
          msg = JSON.parse(raw.toString()) as Record<string, unknown>
        } catch {
          return
        }

        const type = msg['type'] as string

        if (type === 'link:create') {
          const name = msg['name'] as string | undefined
          const url = msg['url'] as string | undefined
          if (!name || !url) {
            send(socket, { type: 'error', message: 'Name and URL are required' })
            return
          }
          try {
            const useCase = new AddBoardLinkUseCase(memberRepo, fileRepo)
            const entry = await useCase.execute({
              userId: authUserId,
              boardId,
              name,
              url,
            })
            broadcast(boardId, { type: 'file:created', file: entry })
          } catch (err) {
            const message = err instanceof AppError ? err.message : 'Failed to create link'
            send(socket, { type: 'error', message })
          }
        } else if (type === 'file:upload') {
          const name = msg['name'] as string | undefined
          const mimeType = (msg['mimeType'] as string) || 'application/octet-stream'
          const fileBase64 = msg['file'] as string | undefined
          if (!name || !fileBase64) {
            send(socket, { type: 'error', message: 'Name and file data are required' })
            return
          }
          const fileBuffer = Buffer.from(fileBase64, 'base64')
          if (fileBuffer.length > MAX_FILE_BYTES) {
            send(socket, { type: 'error', message: 'File must be 10 MB or smaller' })
            return
          }
          const storageKey = randomUUID()
          const filePath = path.join(uploadsDir, storageKey)
          await writeFile(filePath, fileBuffer)
          try {
            const useCase = new UploadBoardFileUseCase(memberRepo, fileRepo)
            const entry = await useCase.execute({
              userId: authUserId,
              boardId,
              name,
              mimeType,
              sizeBytes: fileBuffer.length,
              storageKey,
            })
            broadcast(boardId, { type: 'file:created', file: entry })
          } catch (err) {
            await unlink(filePath).catch(() => undefined)
            const message = err instanceof AppError ? err.message : 'Failed to upload file'
            send(socket, { type: 'error', message })
          }
        }
      })

      socket.on('close', () => {
        if (authed) {
          leaveRoom(boardId, socket)
        }
      })
    },
  )
}
