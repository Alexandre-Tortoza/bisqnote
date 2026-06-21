import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import { errorHandlerPlugin } from '../../infra/http/plugins/errorHandler.js'
import { AppError } from '../../domain/errors/AppError.js'

async function buildTestApp() {
  const app = Fastify({ logger: false })
  await app.register(errorHandlerPlugin)
  return app
}

describe('errorHandlerPlugin', () => {
  it('returns 500 with generic message when unknown error thrown', async () => {
    const app = await buildTestApp()
    app.get('/throw', async () => {
      throw new Error('SELECT * FROM users WHERE id = 1; raw db detail')
    })

    const res = await app.inject({ method: 'GET', url: '/throw' })
    expect(res.statusCode).toBe(500)
    const body = res.json()
    expect(body.error).toBe('Internal server error')
    expect(body.error).not.toContain('SELECT')
    expect(body.error).not.toContain('db')
  })

  it('returns 400 with AppError.message when AppError is thrown', async () => {
    const app = await buildTestApp()
    app.get('/app-error', async () => {
      throw new AppError('INVALID_INPUT', 'Password required for private boards')
    })

    const res = await app.inject({ method: 'GET', url: '/app-error' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Password required for private boards' })
  })

  it('logs the original error regardless of type', async () => {
    const app = Fastify({ logger: false })
    const logSpy = vi.fn()
    await app.register(errorHandlerPlugin)
    app.log.error = logSpy

    app.get('/log-test', async () => {
      throw new Error('original error')
    })

    await app.inject({ method: 'GET', url: '/log-test' })
    expect(logSpy).toHaveBeenCalled()
  })
})
