import { ApiError } from './ApiError'

const BASE = import.meta.env.VITE_API_URL ?? ''

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

async function postForm<T>(path: string, formData: FormData): Promise<T> {
  // Do NOT set Content-Type — the browser sets the multipart boundary automatically
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message = typeof data?.error === 'string' ? data.error : `POST ${path} failed`
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

async function del<T = void>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message = typeof data?.error === 'string' ? data.error : `DELETE ${path} failed`
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = { post, get, postForm, del }
