import { ApiError } from './ApiError'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message = typeof data?.error === 'string' ? data.error : `POST ${path} failed`
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message = typeof data?.error === 'string' ? data.error : `GET ${path} failed`
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

export const api = { post, get }
