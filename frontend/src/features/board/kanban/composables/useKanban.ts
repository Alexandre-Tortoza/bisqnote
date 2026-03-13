import { ref, onUnmounted } from 'vue'

export interface BoardMember {
  memberId: string
  username: string
}

export interface KanbanTask {
  id: string
  columnId: string
  boardId: string
  assignedTo: string | null
  position: number
  title: string
  description: string | null
  effort: number | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface KanbanColumn {
  id: string
  boardId: string
  position: number
  title: string
  tasks: KanbanTask[]
  createdAt: string
}

type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'error' | 'closed'

function toWsUrl(apiBase: string): string {
  return apiBase.replace(/^http/, 'ws')
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * Manages a WebSocket connection to the board kanban channel.
 * Handles auth handshake, initial board state, and real-time updates.
 */
export function useKanban() {
  const columns = ref<KanbanColumn[]>([])
  const members = ref<BoardMember[]>([])
  const status = ref<ConnectionStatus>('idle')
  const error = ref<string | null>(null)

  let socket: WebSocket | null = null

  function connect(boardId: string, userToken: string) {
    if (socket && socket.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null
    columns.value = []
    members.value = []

    const url = `${toWsUrl(API_BASE)}/api/boards/${boardId}/kanban`
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
        columns.value = (msg['columns'] as KanbanColumn[]) ?? []
        members.value = (msg['members'] as BoardMember[]) ?? []
      } else if (type === 'column:created') {
        const col = msg['column'] as KanbanColumn
        col.tasks = col.tasks ?? []
        columns.value = [...columns.value, col].sort((a, b) => a.position - b.position)
      } else if (type === 'column:updated') {
        const updated = msg['column'] as KanbanColumn
        columns.value = columns.value
          .map((c) => (c.id === updated.id ? { ...updated, tasks: c.tasks } : c))
          .sort((a, b) => a.position - b.position)
      } else if (type === 'column:deleted') {
        const columnId = msg['columnId'] as string
        columns.value = columns.value.filter((c) => c.id !== columnId)
      } else if (type === 'task:created') {
        const task = msg['task'] as KanbanTask
        columns.value = columns.value.map((c) => {
          if (c.id !== task.columnId) return c
          return { ...c, tasks: [...c.tasks, task].sort((a, b) => a.position - b.position) }
        })
      } else if (type === 'task:updated') {
        const task = msg['task'] as KanbanTask
        columns.value = columns.value.map((c) => {
          if (c.id !== task.columnId) return c
          return { ...c, tasks: c.tasks.map((t) => (t.id === task.id ? task : t)) }
        })
      } else if (type === 'task:moved') {
        const task = msg['task'] as KanbanTask
        // Remove from all columns, re-insert in the target column
        columns.value = columns.value.map((c) => {
          const withoutTask = c.tasks.filter((t) => t.id !== task.id)
          if (c.id !== task.columnId) return { ...c, tasks: withoutTask }
          const withTask = [...withoutTask, task].sort((a, b) => a.position - b.position)
          return { ...c, tasks: withTask }
        })
      } else if (type === 'task:deleted') {
        const taskId = msg['taskId'] as string
        const columnId = msg['columnId'] as string
        columns.value = columns.value.map((c) => {
          if (c.id !== columnId) return c
          return { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }
        })
      } else if (type === 'error') {
        error.value = (msg['message'] as string) ?? 'Kanban error'
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

  function createColumn(title: string) {
    sendMessage({ type: 'column:create', title })
  }

  function updateColumn(columnId: string, data: { title?: string; position?: number }) {
    sendMessage({ type: 'column:update', columnId, ...data })
  }

  function deleteColumn(columnId: string) {
    sendMessage({ type: 'column:delete', columnId })
  }

  function createTask(columnId: string, title: string) {
    sendMessage({ type: 'task:create', columnId, title })
  }

  function updateTask(
    taskId: string,
    data: {
      title?: string
      description?: string | null
      effort?: number | null
      dueDate?: string | null
      assignedTo?: string | null
    },
  ) {
    sendMessage({ type: 'task:update', taskId, ...data })
  }

  function moveTask(taskId: string, columnId: string, position: number) {
    sendMessage({ type: 'task:move', taskId, columnId, position })
  }

  function deleteTask(taskId: string, columnId: string) {
    sendMessage({ type: 'task:delete', taskId, columnId })
  }

  function disconnect() {
    socket?.close()
    socket = null
  }

  onUnmounted(disconnect)

  return {
    columns,
    members,
    status,
    error,
    connect,
    disconnect,
    createColumn,
    updateColumn,
    deleteColumn,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
  }
}
