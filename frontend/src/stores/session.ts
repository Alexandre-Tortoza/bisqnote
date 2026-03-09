import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface BoardSession {
  boardId: string
  memberToken: string
  role: 'owner' | 'member'
}

const STORAGE_KEY = 'bisqnode-session'

export const useSessionStore = defineStore('session', () => {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  const session = ref<BoardSession | null>(stored ? (JSON.parse(stored) as BoardSession) : null)

  function setSession(data: BoardSession) {
    session.value = data
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }

  function clearSession() {
    session.value = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function hasSession(boardId: string): boolean {
    return session.value?.boardId === boardId
  }

  return { session, setSession, clearSession, hasSession }
})
