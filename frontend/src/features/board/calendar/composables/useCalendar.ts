import { ref, onUnmounted } from 'vue'
import { importKeyFromBase64, encryptContent, decryptContent } from '@/utils/crypto'

export interface CalendarEvent {
  id: string
  boardId: string
  createdBy: string | null
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  notifyStartDaysBefore: number
  notifyRepeatDaily: boolean
  createdAt: string
  updatedAt: string
}

export interface CalendarCellItem {
  id: string
  title: string
  startAt: string
  source: 'event' | 'kanban'
}

export interface CalendarNotification {
  eventId: string
  title: string
  daysUntil: number
}

type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'error' | 'closed'

function toWsUrl(apiBase: string): string {
  return apiBase.replace(/^http/, 'ws')
}

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * Computes in-app notifications from the list of events, based on today's date
 * and each event's notifyStartDaysBefore / notifyRepeatDaily settings.
 */
export function computeNotifications(events: CalendarEvent[]): CalendarNotification[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return events.flatMap((event) => {
    if (!event.notifyStartDaysBefore) return []

    const start = new Date(event.startAt)
    start.setHours(0, 0, 0, 0)
    const daysUntil = Math.ceil((start.getTime() - today.getTime()) / 86_400_000)

    if (daysUntil < 0) return []
    if (daysUntil > event.notifyStartDaysBefore) return []

    if (!event.notifyRepeatDaily && daysUntil !== event.notifyStartDaysBefore) return []

    return [{ eventId: event.id, title: event.title, daysUntil }]
  })
}

/**
 * Manages a WebSocket connection to the board calendar channel.
 * Handles auth handshake, initial board state, and real-time updates.
 */
export function useCalendar() {
  const events = ref<CalendarEvent[]>([])
  const notifications = ref<CalendarNotification[]>([])
  const status = ref<ConnectionStatus>('idle')
  const error = ref<string | null>(null)

  let socket: WebSocket | null = null
  let cryptoKey: CryptoKey | null = null

  async function connect(boardId: string, boardKey: string) {
    if (socket && socket.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null
    events.value = []
    notifications.value = []

    try {
      cryptoKey = await importKeyFromBase64(boardKey)
    } catch (err) {
      console.error('[Calendar] Crypto key import failed:', err)
      error.value = 'Failed to initialize encryption key'
      status.value = 'error'
      return
    }

    const url = `${toWsUrl(API_BASE)}/api/boards/${boardId}/calendar`
    console.log('[Calendar] Connecting to:', url, 'API_BASE:', API_BASE)
    socket = new WebSocket(url)

    socket.onmessage = async (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>
      } catch {
        console.warn('[Calendar] Failed to parse message:', event.data)
        return
      }

      const key = cryptoKey
      if (!key) {
        console.warn('[Calendar] No crypto key available')
        return
      }

      const type = msg['type'] as string
      console.log('[Calendar] Received:', type, type === 'error' ? msg : '')

      if (type === 'ready') {
        status.value = 'ready'
      } else if (type === 'board-state') {
        const raw = (msg['events'] as Array<Record<string, unknown>>) ?? []
        console.log('[Calendar] Board-state events count:', raw.length)
        events.value = await Promise.all(raw.map((e) => decryptEventContent(key, e)))
        notifications.value = computeNotifications(events.value)
      } else if (type === 'event:created') {
        const raw = msg['event'] as Record<string, unknown>
        const newEvent = await decryptEventContent(key, raw)
        events.value = [...events.value, newEvent].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        )
        notifications.value = computeNotifications(events.value)
      } else if (type === 'event:updated') {
        const raw = msg['event'] as Record<string, unknown>
        const updated = await decryptEventContent(key, raw)
        events.value = events.value
          .map((e) => (e.id === updated.id ? updated : e))
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        notifications.value = computeNotifications(events.value)
      } else if (type === 'event:deleted') {
        const eventId = msg['eventId'] as string
        events.value = events.value.filter((e) => e.id !== eventId)
        notifications.value = computeNotifications(events.value)
      } else if (type === 'error') {
        const msgText = (msg['message'] as string) ?? 'Calendar error'
        console.error('[Calendar] Error from server:', msgText)
        error.value = msgText
        status.value = 'error'
      }
    }

    socket.onerror = (event) => {
      console.error('[Calendar] Socket error event:', event)
      error.value = 'Connection failed'
      status.value = 'error'
    }

    socket.onclose = (event) => {
      console.log('[Calendar] Socket closed, code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
      if (status.value !== 'error') {
        status.value = 'closed'
      }
      socket = null
    }
  }

  function sendMessage(msg: Record<string, unknown>) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[Calendar] Cannot send, socket not open')
      return
    }
    console.log('[Calendar] Sending:', msg.type)
    socket.send(JSON.stringify(msg))
  }

  async function createEvent(data: {
    title: string
    startAt: string
    endAt?: string | null
    description?: string | null
    notifyStartDaysBefore?: number
    notifyRepeatDaily?: boolean
  }) {
    if (!cryptoKey) return
    const encryptedContent = await encryptContent(
      cryptoKey,
      JSON.stringify({ title: data.title, description: data.description ?? null }),
    )
    sendMessage({
      type: 'event:create',
      encryptedContent,
      startAt: data.startAt,
      endAt: data.endAt ?? null,
      notifyStartDaysBefore: data.notifyStartDaysBefore ?? 0,
      notifyRepeatDaily: data.notifyRepeatDaily ?? false,
    })
  }

  async function updateEvent(
    eventId: string,
    data: {
      title?: string
      description?: string | null
      startAt?: string
      endAt?: string | null
      notifyStartDaysBefore?: number
      notifyRepeatDaily?: boolean
    },
  ) {
    if (!cryptoKey) return
    const payload: Record<string, unknown> = { type: 'event:update', eventId }
    if (data.title !== undefined || data.description !== undefined) {
      payload.encryptedContent = await encryptContent(
        cryptoKey,
        JSON.stringify({ title: data.title, description: data.description }),
      )
    }
    if (data.startAt !== undefined) payload.startAt = data.startAt
    if (data.endAt !== undefined) payload.endAt = data.endAt
    if (data.notifyStartDaysBefore !== undefined) payload.notifyStartDaysBefore = data.notifyStartDaysBefore
    if (data.notifyRepeatDaily !== undefined) payload.notifyRepeatDaily = data.notifyRepeatDaily
    sendMessage(payload)
  }

  function deleteEvent(eventId: string) {
    sendMessage({ type: 'event:delete', eventId })
  }

  function disconnect() {
    console.log('[Calendar] disconnect() called')
    socket?.close()
    socket = null
  }

  onUnmounted(() => {
    console.log('[Calendar] component unmounted, disconnecting')
    disconnect()
  })

  return {
    events,
    notifications,
    status,
    error,
    connect,
    disconnect,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}

async function decryptEventContent(key: CryptoKey, raw: Record<string, unknown>): Promise<CalendarEvent> {
  if (raw['encryptedContent']) {
    try {
      const decrypted = await decryptContent(key, raw['encryptedContent'] as string)
      const data = JSON.parse(decrypted) as Record<string, unknown>
      raw['title'] = (data['title'] as string) ?? raw['title']
      raw['description'] = (data['description'] as string | null) ?? null
      delete raw['encryptedContent']
    } catch (err) {
      console.error('[Calendar] Failed to decrypt event:', raw.id, err)
    }
  }
  return raw as unknown as CalendarEvent
}
