import { ref, computed, onUnmounted } from 'vue'
import { api } from '@/services/api'
import { importKeyFromBase64, encryptFile, decryptFile } from '@/utils/crypto'

const API_BASE = import.meta.env['VITE_API_URL'] ?? ''

function toWsUrl(apiBase: string): string {
  return apiBase.replace(/^http/, 'ws')
}

export interface BoardFile {
  id: string
  boardId: string
  uploadedBy: string | null
  type: 'file' | 'link'
  name: string
  url: string | null
  mimeType: string | null
  sizeBytes: number | null
  storageKey: string | null
  createdAt: string
}

type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'error' | 'closed'

export function useFiles() {
  const files = ref<BoardFile[]>([])
  const loading = ref(false)
  const wsStatus = ref<ConnectionStatus>('idle')
  const error = ref<string | null>(null)
  const search = ref('')

  let socket: WebSocket | null = null

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return files.value
    return files.value.filter((f) => {
      const nameMatch = f.name.toLowerCase().includes(q)
      const typeMatch = f.type.includes(q) || (f.mimeType ?? '').toLowerCase().includes(q)
      return nameMatch || typeMatch
    })
  })

  async function load(boardId: string) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ files: BoardFile[] }>(
        `/api/boards/${boardId}/files/list`,
        {},
      )
      files.value = res.files
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load files'
    } finally {
      loading.value = false
    }
  }

  function ensureWsReady() {
    if (wsStatus.value !== 'ready') {
      throw new Error('WebSocket not connected')
    }
  }

  async function addLink(_boardId: string, name: string, url: string) {
    ensureWsReady()
    socket!.send(JSON.stringify({ type: 'link:create', name, url }))
  }

  async function uploadFile(
    _boardId: string,
    name: string,
    file: File,
    boardKey: string | null,
  ) {
    let uploadBlob: Blob = file

    if (boardKey) {
      const key = await importKeyFromBase64(boardKey)
      const encBuffer = await encryptFile(key, await file.arrayBuffer())
      uploadBlob = new Blob([encBuffer], { type: 'application/octet-stream' })
    }

    ensureWsReady()
    const fileBase64 = await blobToBase64(uploadBlob)
    socket!.send(JSON.stringify({
      type: 'file:upload',
      name,
      mimeType: file.type || 'application/octet-stream',
      file: fileBase64,
    }))
  }

  async function deleteFile(boardId: string, fileId: string) {
    await api.del(`/api/boards/${boardId}/files/${fileId}`, {})
    files.value = files.value.filter((f) => f.id !== fileId)
  }

  async function connect(boardId: string) {
    if (socket && socket.readyState === WebSocket.OPEN) return

    wsStatus.value = 'connecting'
    error.value = null
    files.value = []

    const url = `${toWsUrl(API_BASE)}/api/boards/${boardId}/files/ws`
    socket = new WebSocket(url)

    socket.onmessage = (event) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>
      } catch {
        return
      }

      if (msg['type'] === 'ready') {
        wsStatus.value = 'ready'
      } else if (msg['type'] === 'board-state') {
        files.value = (msg['files'] as BoardFile[]) ?? []
        wsStatus.value = 'ready'
      } else if (msg['type'] === 'file:created') {
        const file = msg['file'] as BoardFile
        if (!files.value.some((f) => f.id === file.id)) {
          files.value = [file, ...files.value]
        }
      } else if (msg['type'] === 'file:deleted') {
        const fileId = msg['fileId'] as string
        files.value = files.value.filter((f) => f.id !== fileId)
      } else if (msg['type'] === 'error') {
        error.value = (msg['message'] as string) ?? 'Connection error'
        wsStatus.value = 'error'
      }
    }

    socket.onerror = () => {
      error.value = 'Connection failed'
      wsStatus.value = 'error'
    }

    socket.onclose = () => {
      if (wsStatus.value !== 'error') {
        wsStatus.value = 'closed'
      }
      socket = null
    }
  }

  function disconnectWs() {
    socket?.close()
    socket = null
  }

  onUnmounted(disconnectWs)

  /**
   * Downloads, decrypts (if boardKey present), and triggers a browser save-as
   * for the given file entry.
   */
  async function downloadFile(
    boardId: string,
    fileId: string,
    fileName: string,
    mimeType: string | null,
    boardKey: string | null,
  ) {
    const url = getDownloadUrl(boardId, fileId)
    const res = await fetch(url)
    if (!res.ok) throw new Error('Download failed')

    let buffer = await res.arrayBuffer()

    if (boardKey) {
      const key = await importKeyFromBase64(boardKey)
      buffer = await decryptFile(key, buffer)
    }

    const blob = new Blob([buffer], { type: mimeType ?? 'application/octet-stream' })
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    a.click()
    URL.revokeObjectURL(objectUrl)
  }

  function getDownloadUrl(boardId: string, fileId: string): string {
    return `${API_BASE}/api/boards/${boardId}/files/${fileId}/download`
  }

  return {
    files,
    filtered,
    loading,
    wsStatus,
    error,
    search,
    load,
    connect,
    disconnectWs,
    addLink,
    uploadFile,
    deleteFile,
    downloadFile,
    getDownloadUrl,
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}
