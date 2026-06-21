import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import fp from 'fastify-plugin'
import type { IMemberRepository } from '../../../domain/repositories/IMemberRepository.js'
import type { IBoardFileRepository } from '../../../domain/repositories/IBoardFileRepository.js'
import type { BoardMemberEntity } from '../../../domain/entities/BoardMember.js'
import type { BoardFileEntity } from '../../../domain/entities/BoardFile.js'
import { filesRoutes } from '../../../infra/http/routes/files.js'
import { errorHandlerPlugin } from '../../../infra/http/plugins/errorHandler.js'

const makeMember = (): BoardMemberEntity => ({
  id: 'member-1',
  boardId: 'board-1',
  userId: 'user-1',
  tokenHash: 'hash',
  role: 'member',
  encryptedContent: '{}',
})

const makeFileEntity = (overrides: Partial<BoardFileEntity> = {}): BoardFileEntity => ({
  id: 'file-1',
  boardId: 'board-1',
  uploadedBy: 'member-1',
  type: 'file',
  name: 'report.pdf',
  url: null,
  mimeType: 'application/pdf',
  sizeBytes: 100,
  storageKey: 'uuid-1',
  createdAt: new Date(),
  ...overrides,
})

function makeFakes() {
  return {
    memberRepo: {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserAndBoard: vi.fn().mockResolvedValue(makeMember()),
      updateTokenHash: vi.fn(),
      findAllByBoardId: vi.fn(),
    } satisfies IMemberRepository,
    fileRepo: {
      createLink: vi.fn().mockResolvedValue(makeFileEntity({ type: 'link', url: 'https://x.com', mimeType: null, sizeBytes: null, storageKey: null })),
      createFile: vi.fn().mockResolvedValue(makeFileEntity()),
      findByBoardId: vi.fn().mockResolvedValue([makeFileEntity()]),
      findById: vi.fn().mockResolvedValue(makeFileEntity()),
      delete: vi.fn().mockResolvedValue(undefined),
    } satisfies IBoardFileRepository,
  }
}

async function buildTestApp() {
  const fakes = makeFakes()
  const app = Fastify({ logger: false })

  await app.register(errorHandlerPlugin)

  const authMockPlugin = fp(async (fastify) => {
    fastify.decorateRequest('userId', '')
    fastify.decorate('authenticate', async (request) => {
      request.userId = 'user-1'
    })
  })

  await app.register(authMockPlugin)

  const dbMockPlugin = fp(async (fastify) => {
    fastify.decorate('db', {} as never)
  })

  await app.register(dbMockPlugin)
  await app.register(multipart)
  await app.register(filesRoutes, fakes)

  return { app, fakes }
}

describe('POST /api/boards/:boardId/files/list', () => {
  it('returns 200 with files array for valid member', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards/board-1/files/list',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ files: BoardFileEntity[] }>()
    expect(body.files).toHaveLength(1)
  })

  it('returns 403 when user is not a board member', async () => {
    const { app, fakes } = await buildTestApp()
    vi.mocked(fakes.memberRepo.findByUserAndBoard).mockResolvedValueOnce(null)
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards/board-1/files/list',
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('POST /api/boards/:boardId/files/links', () => {
  it('returns 201 with created link', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards/board-1/files/links',
      payload: { name: 'Figma', url: 'https://figma.com/abc' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ type: 'link' })
  })

  it('returns 400 when name is missing', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards/board-1/files/links',
      payload: { url: 'https://x.com' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE /api/boards/:boardId/files/:fileId', () => {
  it('returns 204 when file is deleted', async () => {
    const { app } = await buildTestApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/boards/board-1/files/file-1',
    })
    expect(res.statusCode).toBe(204)
  })

  it('returns 404 when file does not exist', async () => {
    const { app, fakes } = await buildTestApp()
    vi.mocked(fakes.fileRepo.findById).mockResolvedValueOnce(null)
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/boards/board-1/files/missing',
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('Route registration', () => {
  it('registers all expected routes', async () => {
    const { app } = await buildTestApp()
    const routes = app.printRoutes()
    expect(routes).toContain('st (POST)')   // list
    expect(routes).toContain('nks (POST)')  // links
    expect(routes).toContain('upload (POST)')
    expect(routes).toContain('download (GET')
  })
})
