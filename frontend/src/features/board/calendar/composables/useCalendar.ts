import { ref, onUnmounted } from 'vue'

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

export interface CalendarNotification {
  eventId: string
  title: string
  daysUntil: number
}

type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'error' | 'closed'

function toWsUrl(apiBase: string): string {
  return apiBase.replace(/^http/, 'ws')
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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

    if (daysUntil < 0) return [] // event already passed
    if (daysUntil > event.notifyStartDaysBefore) return [] // notification window not open yet

    // notifyRepeatDaily: show every day within the window
    // !notifyRepeatDaily: show only on the exact first day of the window
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

  function connect(boardId: string, userToken: string) {
    if (socket && socket.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null
    events.value = []
    notifications.value = []

    const url = `${toWsUrl(API_BASE)}/api/boards/${boardId}/calendar`
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

      const type = msg['type'] as string

      if (type === 'ready') {
        status.value = 'ready'
      } else if (type === 'board-state') {
        const incoming = (msg['events'] as CalendarEvent[]) ?? []
        events.value = incoming
        notifications.value = computeNotifications(incoming)
      } else if (type === 'event:created') {
        const newEvent = msg['event'] as CalendarEvent
        events.value = [...events.value, newEvent].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        )
        notifications.value = computeNotifications(events.value)
      } else if (type === 'event:updated') {
        const updated = msg['event'] as CalendarEvent
        events.value = events.value
          .map((e) => (e.id === updated.id ? updated : e))
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        notifications.value = computeNotifications(events.value)
      } else if (type === 'event:deleted') {
        const eventId = msg['eventId'] as string
        events.value = events.value.filter((e) => e.id !== eventId)
        notifications.value = computeNotifications(events.value)
      } else if (type === 'error') {
        error.value = (msg['message'] as string) ?? 'Calendar error'
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

  function sendMessage(msg: Record<string, unknown>) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(msg))
  }

  function createEvent(data: {
    title: string
    startAt: string
    endAt?: string | null
    description?: string | null
    notifyStartDaysBefore?: number
    notifyRepeatDaily?: boolean
  }) {
    sendMessage({ type: 'event:create', ...data })
  }

  function updateEvent(
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
    sendMessage({ type: 'event:update', eventId, ...data })
  }

  function deleteEvent(eventId: string) {
    sendMessage({ type: 'event:delete', eventId })
  }

  function disconnect() {
    socket?.close()
    socket = null
  }

  onUnmounted(disconnect)

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
