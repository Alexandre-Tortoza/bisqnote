import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../ApiError'

// Reset module so api is re-imported with fresh fetch mock each test
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const { api } = await import('../api')

describe('api.post', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('throws ApiError with status and backend message on 4xx', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Password required for private boards' }),
    })

    await expect(api.post('/api/boards', {})).rejects.toThrow(ApiError)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Password required for private boards' }),
    })
    const err = (await api.post('/api/boards', {}).catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.message).toBe('Password required for private boards')
  })

  it('throws ApiError with status 500 and fallback message when body has no error field', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ something: 'else' }),
    })

    const err = (await api.post('/api/boards', {}).catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(500)
    expect(err.message).toBe('POST /api/boards failed')
  })

  it('throws ApiError when json() fails (non-JSON body)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => { throw new SyntaxError('unexpected token') },
    })

    const err = (await api.post('/api/boards', {}).catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(503)
    expect(err.message).toBe('POST /api/boards failed')
  })
})
