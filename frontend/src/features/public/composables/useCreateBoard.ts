import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { ApiError } from '@/services/ApiError'
import { useSessionStore } from '@/stores/session'
import { useUserStore } from '@/stores/user'

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
  const userStore = useUserStore()
  const { t } = useI18n()

  async function createBoard(payload: CreateBoardPayload): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.post<CreateBoardResponse>('/api/boards', {
        ...payload,
        userToken: userStore.user?.userToken,
      })
      session.setSession(result)
      await router.push(`/board/${result.boardId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.status >= 500 ? t('errors.serverError') : err.message
      } else {
        error.value = t('errors.createBoard.unknown')
      }
    } finally {
      loading.value = false
    }
  }

  return { createBoard, loading, error }
}
