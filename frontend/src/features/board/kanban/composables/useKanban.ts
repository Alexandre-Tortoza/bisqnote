import { ref, onUnmounted } from 'vue'
import { importKeyFromBase64, encryptContent, decryptContent } from '@/utils/crypto'

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

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function useKanban() {
  const columns = ref<KanbanColumn[]>([])
  const members = ref<BoardMember[]>([])
  const status = ref<ConnectionStatus>('idle')
  const error = ref<string | null>(null)

  let socket: WebSocket | null = null
  let cryptoKey: CryptoKey | null = null

  async function connect(boardId: string, boardKey: string) {
    if (socket && socket.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null
    columns.value = []
    members.value = []

    try {
      cryptoKey = await importKeyFromBase64(boardKey)
    } catch {
      error.value = 'Failed to initialize encryption key'
      status.value = 'error'
      return
    }

    const url = `${toWsUrl(API_BASE)}/api/boards/${boardId}/kanban`
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

      const type = msg['type'] as string

      if (type === 'ready') {
        status.value = 'ready'
      } else if (type === 'board-state') {
        const rawCols = (msg['columns'] as Array<Record<string, unknown>>) ?? []
        members.value = (msg['members'] as BoardMember[]) ?? []

        columns.value = await Promise.all(
          rawCols.map(async (raw) => {
            const col = await decryptColumnContent(key, raw)
            const rawTasks = (raw['tasks'] as Array<Record<string, unknown>>) ?? []
            col.tasks = await Promise.all(rawTasks.map((t) => decryptTaskContent(key, t)))
            return col
          }),
        )
      } else if (type === 'column:created') {
        const raw = msg['column'] as Record<string, unknown>
        const col = await decryptColumnContent(key, raw)
        col.tasks = col.tasks ?? []
        columns.value = [...columns.value, col].sort((a, b) => a.position - b.position)
      } else if (type === 'column:updated') {
        const raw = msg['column'] as Record<string, unknown>
        const updated = await decryptColumnContent(key, raw)
        columns.value = columns.value
          .map((c) => (c.id === updated.id ? { ...updated, tasks: c.tasks } : c))
          .sort((a, b) => a.position - b.position)
      } else if (type === 'column:deleted') {
        const columnId = msg['columnId'] as string
        columns.value = columns.value.filter((c) => c.id !== columnId)
      } else if (type === 'task:created') {
        const raw = msg['task'] as Record<string, unknown>
        const task = await decryptTaskContent(key, raw)
        columns.value = columns.value.map((c) => {
          if (c.id !== task.columnId) return c
          return { ...c, tasks: [...c.tasks, task].sort((a, b) => a.position - b.position) }
        })
      } else if (type === 'task:updated') {
        const raw = msg['task'] as Record<string, unknown>
        const task = await decryptTaskContent(key, raw)
        columns.value = columns.value.map((c) => {
          if (c.id !== task.columnId) return c
          return { ...c, tasks: c.tasks.map((t) => (t.id === task.id ? task : t)) }
        })
      } else if (type === 'task:moved') {
        const raw = msg['task'] as Record<string, unknown>
        const task = await decryptTaskContent(key, raw)
        columns.value = columns.value.map((c) => {
          const withoutTask = c.tasks.filter((t) => t.id !== task.id)
          if (c.id !== task.columnId) return { ...c, tasks: withoutTask }
          return { ...c, tasks: [...withoutTask, task].sort((a, b) => a.position - b.position) }
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

  async function createColumn(title: string) {
    if (!cryptoKey) return
    const encryptedContent = await encryptContent(cryptoKey, JSON.stringify({ title }))
    sendMessage({ type: 'column:create', encryptedContent })
  }

  async function updateColumn(columnId: string, data: { title?: string; position?: number }) {
    if (!cryptoKey) return
    const payload: Record<string, unknown> = { type: 'column:update', columnId }
    if (data.title !== undefined) {
      payload.encryptedContent = await encryptContent(cryptoKey, JSON.stringify({ title: data.title }))
    }
    if (data.position !== undefined) {
      payload.position = data.position
    }
    sendMessage(payload)
  }

  function deleteColumn(columnId: string) {
    sendMessage({ type: 'column:delete', columnId })
  }

  async function createTask(columnId: string, title: string) {
    if (!cryptoKey) return
    const encryptedContent = await encryptContent(cryptoKey, JSON.stringify({ title }))
    sendMessage({ type: 'task:create', columnId, encryptedContent })
  }

  async function updateTask(
    taskId: string,
    data: {
      title?: string
      description?: string | null
      effort?: number | null
      dueDate?: string | null
      assignedTo?: string | null
    },
  ) {
    if (!cryptoKey) return
    const encryptedContent = await encryptContent(cryptoKey, JSON.stringify(data))
    sendMessage({ type: 'task:update', taskId, encryptedContent })
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

async function decryptColumnContent(key: CryptoKey, raw: Record<string, unknown>): Promise<KanbanColumn> {
  if (raw['encryptedContent']) {
    const decrypted = await decryptContent(key, raw['encryptedContent'] as string)
    const data = JSON.parse(decrypted) as Record<string, unknown>
    raw['title'] = (data['title'] as string) ?? raw['title']
    delete raw['encryptedContent']
  }
  return {
    id: raw['id'] as string,
    boardId: raw['boardId'] as string,
    position: raw['position'] as number,
    title: (raw['title'] as string) ?? '',
    tasks: (raw['tasks'] as KanbanTask[]) ?? [],
    createdAt: raw['createdAt'] as string,
  }
}

async function decryptTaskContent(key: CryptoKey, raw: Record<string, unknown>): Promise<KanbanTask> {
  if (raw['encryptedContent']) {
    const decrypted = await decryptContent(key, raw['encryptedContent'] as string)
    const data = JSON.parse(decrypted) as Record<string, unknown>
    raw['title'] = (data['title'] as string) ?? raw['title']
    raw['description'] = (data['description'] as string | null) ?? null
    raw['effort'] = (data['effort'] as number | null) ?? null
    raw['dueDate'] = (data['dueDate'] as string | null) ?? null
    delete raw['encryptedContent']
  }
  return raw as unknown as KanbanTask
}
