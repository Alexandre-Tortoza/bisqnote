import { randomUUID } from 'node:crypto'
import { createReadStream, mkdirSync } from 'node:fs'
import { writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import { AppError } from '../../../domain/errors/AppError.js'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../../../domain/repositories/IBoardFileRepository.js'
import { ListBoardFilesUseCase } from '../../../domain/use-cases/ListBoardFiles.js'
import { AddBoardLinkUseCase } from '../../../domain/use-cases/AddBoardLink.js'
import { UploadBoardFileUseCase } from '../../../domain/use-cases/UploadBoardFile.js'
import { DeleteBoardFileUseCase } from '../../../domain/use-cases/DeleteBoardFile.js'
import { broadcast } from '../plugins/boardEventBus.js'

interface FilesRoutesOptions {
  memberRepo: IMemberRepository
  fileRepo: IBoardFileRepository
}

const uploadsDir = process.env['UPLOADS_DIR'] ?? './uploads'

function mapAppError(err: AppError): { status: number; message: string } {
  switch (err.code) {
    case 'MEMBER_NOT_FOUND': return { status: 403, message: err.message }
    case 'FILE_NOT_FOUND': return { status: 404, message: err.message }
    case 'BOARD_MISMATCH': return { status: 403, message: err.message }
    default: return { status: 400, message: err.message }
  }
}

/** REST routes for board files and links. */
export async function filesRoutes(fastify: FastifyInstance, options: FilesRoutesOptions) {
  mkdirSync(uploadsDir, { recursive: true })

  // List files and links
  fastify.post<{ Params: { boardId: string } }>(
    '/api/boards/:boardId/files/list',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const useCase = new ListBoardFilesUseCase(options.memberRepo, options.fileRepo)
      try {
        const files = await useCase.execute({ userId: request.userId, boardId: request.params.boardId })
        return reply.send({ files })
      } catch (err) {
        if (err instanceof AppError) {
          const { status, message } = mapAppError(err)
          return reply.status(status).send({ error: message })
        }
        throw err
      }
    },
  )

  // Add a link
  fastify.post<{
    Params: { boardId: string }
    Body: { name: string; url: string }
  }>(
    '/api/boards/:boardId/files/links',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'url'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            url: { type: 'string', minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const useCase = new AddBoardLinkUseCase(options.memberRepo, options.fileRepo)
      try {
        const entry = await useCase.execute({ userId: request.userId, boardId: request.params.boardId, ...request.body })
        broadcast(request.params.boardId, { type: 'file:created', file: entry })
        return reply.status(201).send(entry)
      } catch (err) {
        if (err instanceof AppError) {
          const { status, message } = mapAppError(err)
          return reply.status(status).send({ error: message })
        }
        throw err
      }
    },
  )

  // Upload a file (multipart)
  fastify.post<{ Params: { boardId: string } }>(
    '/api/boards/:boardId/files/upload',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parts = request.parts({ limits: { fileSize: 10_485_760 } })

      let name = ''
      let fileBuffer: Buffer | null = null
      let mimeType = 'application/octet-stream'
      const storageKey = randomUUID()

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'name') name = part.value as string
        } else {
          mimeType = part.mimetype
          const chunks: Buffer[] = []
          for await (const chunk of part.file) {
            chunks.push(chunk)
          }
          fileBuffer = Buffer.concat(chunks)
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return reply.status(400).send({ error: 'No file provided' })
      }

      const filePath = path.join(uploadsDir, storageKey)
      await writeFile(filePath, fileBuffer)

      const useCase = new UploadBoardFileUseCase(options.memberRepo, options.fileRepo)
      try {
        const entry = await useCase.execute({
          userId: request.userId,
          boardId: request.params.boardId,
          name,
          mimeType,
          sizeBytes: fileBuffer.length,
          storageKey,
        })
        broadcast(request.params.boardId, { type: 'file:created', file: entry })
        return reply.status(201).send(entry)
      } catch (err) {
        await unlink(filePath).catch(() => undefined)
        if (err instanceof AppError) {
          const { status, message } = mapAppError(err)
          return reply.status(status).send({ error: message })
        }
        throw err
      }
    },
  )

  // Delete a file or link
  fastify.delete<{ Params: { boardId: string; fileId: string } }>(
    '/api/boards/:boardId/files/:fileId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const useCase = new DeleteBoardFileUseCase(options.memberRepo, options.fileRepo)
      try {
        const entity = await useCase.execute({
          userId: request.userId,
          boardId: request.params.boardId,
          fileId: request.params.fileId,
        })
        if (entity.type === 'file' && entity.storageKey) {
          await unlink(path.join(uploadsDir, entity.storageKey)).catch(() => undefined)
        }
        broadcast(request.params.boardId, { type: 'file:deleted', fileId: entity.id, boardId: request.params.boardId })
        return reply.status(204).send()
      } catch (err) {
        if (err instanceof AppError) {
          const { status, message } = mapAppError(err)
          return reply.status(status).send({ error: message })
        }
        throw err
      }
    },
  )

  // Download a file
  fastify.get<{ Params: { boardId: string; fileId: string } }>(
    '/api/boards/:boardId/files/:fileId/download',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const member = await options.memberRepo.findByUserAndBoard(request.userId, request.params.boardId)
      if (!member) return reply.status(403).send({ error: 'User is not a member of this board' })

      const entity = await options.fileRepo.findById(request.params.fileId)
      if (!entity) return reply.status(404).send({ error: 'File not found' })
      if (entity.boardId !== request.params.boardId) return reply.status(403).send({ error: 'File does not belong to this board' })
      if (entity.type !== 'file' || !entity.storageKey) return reply.status(400).send({ error: 'This entry is not a downloadable file' })

      const filePath = path.join(uploadsDir, entity.storageKey)
      const stream = createReadStream(filePath)

      return reply
        .header('Content-Type', entity.mimeType ?? 'application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${entity.name}"`)
        .send(stream)
    },
  )
}
