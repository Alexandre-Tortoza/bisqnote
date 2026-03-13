import { ref, onUnmounted } from 'vue'

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

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * Manages a WebSocket connection to the board chat channel.
 * Handles auth handshake, history loading, and real-time messaging.
 */
export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const status = ref<ConnectionStatus>('idle')
  const error = ref<string | null>(null)

  let socket: WebSocket | null = null

  function connect(boardId: string, userToken: string) {
    if (socket && socket.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null

    const url = `${toWsUrl(API_BASE)}/api/boards/${boardId}/chat`
    socket = new WebSocket(url)

    socket.onopen = () => {
      socket!.send(JSON.stringify({ type: 'auth', userToken }))
    }

    socket.onmessage = (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>
      } catch {
        return
      }

      if (msg['type'] === 'ready') {
        status.value = 'ready'
      } else if (msg['type'] === 'history') {
        messages.value = (msg['messages'] as ChatMessage[]) ?? []
      } else if (msg['type'] === 'message') {
        messages.value = [...messages.value, msg as unknown as ChatMessage]
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

  function send(text: string) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    const trimmed = text.trim()
    if (!trimmed) return
    socket.send(JSON.stringify({ type: 'message', text: trimmed }))
  }

  function disconnect() {
    socket?.close()
    socket = null
  }

  onUnmounted(disconnect)

  return { messages, status, error, connect, send, disconnect }
}
