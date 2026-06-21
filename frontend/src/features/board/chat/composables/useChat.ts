import { ref, onUnmounted } from 'vue'
import { importKeyFromBase64, encryptContent, decryptContent } from '@/utils/crypto'

export interface ChatMessage {
  id: string
  memberId: string | null
  username: string
  text: string
  createdAt: string
}

type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'error' | 'closed'

/** Derives the WebSocket base URL from the HTTP API base URL. */
function toWsUrl(apiBase: string): string {
  return apiBase.replace(/^http/, 'ws')
}

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * Manages a WebSocket connection to the board chat channel.
 * Handles auth handshake, history loading, and real-time messaging.
 */
export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const status = ref<ConnectionStatus>('idle')
  const error = ref<string | null>(null)

  let socket: WebSocket | null = null
  let cryptoKey: CryptoKey | null = null

  async function connect(boardId: string, boardKey: string) {
    if (socket && socket.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null

    try {
      cryptoKey = await importKeyFromBase64(boardKey)
    } catch {
      error.value = 'Failed to initialize encryption key'
      status.value = 'error'
      return
    }

    const url = `${toWsUrl(API_BASE)}/api/boards/${boardId}/chat`
    socket = new WebSocket(url)

    socket.onmessage = async (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>
      } catch {
        return
      }

      const key = cryptoKey
      if (!key) return

      if (msg['type'] === 'ready') {
        status.value = 'ready'
      } else if (msg['type'] === 'history') {
        const rawMessages = (msg['messages'] as Array<Record<string, unknown>>) ?? []
        messages.value = await Promise.all(
          rawMessages.map(async (raw) => {
            if (raw['text']) {
              const decrypted = await decryptContent(key, raw['text'] as string)
              raw['text'] = decrypted
            }
            return raw as unknown as ChatMessage
          }),
        )
      } else if (msg['type'] === 'message') {
        const raw = msg as unknown as Record<string, unknown>
        if (raw['text']) {
          const decrypted = await decryptContent(key, raw['text'] as string)
          raw['text'] = decrypted
        }
        messages.value = [...messages.value, raw as unknown as ChatMessage]
      } else if (msg['type'] === 'error') {
        error.value = (msg['message'] as string) ?? 'Chat error'
        status.value = 'error'
      }
    }

    socket.onerror = () => {
      error.value = 'Connection failed'
      status.value = 'error'
    }

    socket.onclose = () => {
      if (status.value !== 'error') {
        status.value = 'closed'
      }
      socket = null
    }
  }

  async function send(text: string) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !cryptoKey) return
    const trimmed = text.trim()
    if (!trimmed) return
    const encryptedContent = await encryptContent(cryptoKey, trimmed)
    socket.send(JSON.stringify({ type: 'message', encryptedContent }))
  }

  function disconnect() {
    socket?.close()
    socket = null
  }

  onUnmounted(disconnect)

  return { messages, status, error, connect, send, disconnect }
}
