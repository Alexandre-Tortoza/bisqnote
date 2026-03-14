<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useCalendar } from '../composables/useCalendar'
import CalendarGrid from '../components/CalendarGrid.vue'
import EventModal from '../components/EventModal.vue'
import type { CalendarEvent } from '../composables/useCalendar'

const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()

const { events, notifications, status, error, connect, createEvent, updateEvent, deleteEvent } = useCalendar()

const boardId = route.params['id'] as string

const isModalOpen = ref(false)
const activeEvent = ref<CalendarEvent | null>(null)
const defaultDate = ref<string | undefined>(undefined)

onMounted(() => {
  const token = userStore.user?.userToken
  if (token) connect(boardId, token)
})

function openCreateModal(date: string) {
  activeEvent.value = null
  defaultDate.value = date
  isModalOpen.value = true
}

function openEditModal(event: CalendarEvent) {
  activeEvent.value = event
  defaultDate.value = undefined
  isModalOpen.value = true
}

function handleModalSave(data: {
  title: string
  startAt: string
  endAt: string | null
  description: string | null
  notifyStartDaysBefore: number
  notifyRepeatDaily: boolean
}) {
  if (activeEvent.value) {
    updateEvent(activeEvent.value.id, data)
  } else {
    createEvent(data)
  }
  isModalOpen.value = false
}

function handleModalDelete() {
  if (activeEvent.value) {
    deleteEvent(activeEvent.value.id)
  }
  isModalOpen.value = false
}
</script>

<template>
  <div class="flex flex-col h-full bg-nb-bg">
    <!-- Status bar -->
    <div class="border-b-2 border-nb-border px-4 py-2 flex items-center gap-3 bg-nb-surface shrink-0">
      <span class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
        {{ t('calendar.title') }}
      </span>

      <span
        class="ml-auto font-mono text-xs"
        :class="{
          'text-nb-muted': status === 'connecting' || status === 'idle',
          'text-green-600': status === 'ready',
          'text-red-600': status === 'error' || status === 'closed',
        }"
      >
        <template v-if="status === 'connecting'">{{ t('calendar.statusConnecting') }}</template>
        <template v-else-if="status === 'ready'">{{ t('calendar.statusConnected') }}</template>
        <template v-else-if="status === 'closed'">{{ t('calendar.statusDisconnected') }}</template>
        <template v-else-if="status === 'error'">{{ t('calendar.statusError') }}</template>
      </span>
    </div>

    <!-- Notification banners -->
    <div
      v-if="notifications.length > 0 && status === 'ready'"
      class="border-b-2 border-nb-border bg-nb-surface shrink-0"
    >
      <div
        v-for="n in notifications"
        :key="n.eventId"
        class="px-4 py-2 font-mono text-xs text-nb-text border-b border-nb-border last:border-b-0"
      >
        <template v-if="n.daysUntil === 0">
          🗓 <strong>{{ n.title }}</strong> {{ t('calendar.notificationToday') }}
        </template>
        <template v-else-if="n.daysUntil === 1">
          🗓 {{ t('calendar.notificationTomorrow', { title: n.title }) }}
        </template>
        <template v-else>
          🗓 {{ t('calendar.notificationDays', { days: n.daysUntil, title: n.title }) }}
        </template>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="error && status === 'error'"
      class="border-b-2 border-nb-border bg-red-50 dark:bg-red-950 px-4 py-2 font-mono text-xs text-red-700 dark:text-red-300 shrink-0"
    >
      {{ error }}
    </div>

    <!-- Connecting placeholder -->
    <div
      v-if="status === 'connecting' || status === 'idle'"
      class="flex-1 flex items-center justify-center"
    >
      <span class="font-mono text-xs text-nb-muted">{{ t('calendar.statusConnecting') }}</span>
    </div>

    <!-- Calendar grid -->
    <CalendarGrid
      v-else-if="status === 'ready'"
      :events="events"
      class="flex-1 min-h-0"
      @day-click="openCreateModal"
      @event-click="openEditModal"
    />

    <!-- Event Modal -->
    <EventModal
      v-if="isModalOpen"
      :event="activeEvent"
      :default-date="defaultDate"
      @close="isModalOpen = false"
      @save="handleModalSave"
      @delete="handleModalDelete"
    />
  </div>
</template>
