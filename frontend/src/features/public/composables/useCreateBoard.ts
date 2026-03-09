import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useSessionStore } from '@/stores/session'

export interface CreateBoardPayload {
  name: string
  isPrivate: boolean
  password?: string
  ownerEmail?: string
}

interface CreateBoardResponse {
  boardId: string
  memberToken: string
  role: 'owner' | 'member'
}

export function useCreateBoard() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const router = useRouter()
  const session = useSessionStore()

  async function createBoard(payload: CreateBoardPayload): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.post<CreateBoardResponse>('/api/boards', payload)
      session.setSession(result)
      await router.push(`/board/${result.boardId}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create board'
    } finally {
      loading.value = false
    }
  }

  return { createBoard, loading, error }
}
