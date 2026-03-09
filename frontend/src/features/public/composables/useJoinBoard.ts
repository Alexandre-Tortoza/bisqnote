import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { ApiError } from '@/services/ApiError'
import { useSessionStore } from '@/stores/session'

export interface BoardMeta {
  isPrivate: boolean
  name: string
}

interface JoinBoardResponse {
  boardId: string
  memberToken: string
  role: 'owner' | 'member'
}

export function useJoinBoard() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const router = useRouter()
  const session = useSessionStore()
  const { t } = useI18n()

  async function getBoardMeta(boardId: string): Promise<BoardMeta | null> {
    try {
      return await api.get<BoardMeta>(`/api/boards/${boardId}/meta`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }

  async function joinBoard(boardId: string, password?: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.post<JoinBoardResponse>('/api/boards/join', { boardId, password })
      session.setSession(result)
      await router.push(`/board/${result.boardId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          error.value = t('errors.joinBoard.notFound')
        } else if (err.status === 403) {
          error.value = t('errors.joinBoard.wrongPassword')
        } else if (err.status >= 500) {
          error.value = t('errors.serverError')
        } else {
          error.value = err.message
        }
      } else {
        error.value = t('errors.joinBoard.unknown')
      }
    } finally {
      loading.value = false
    }
  }

  return { getBoardMeta, joinBoard, loading, error }
}
