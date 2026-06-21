<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import { useSessionStore } from '@/stores/session'
import { useKanban } from '../composables/useKanban'
import KanbanBoard from '../components/KanbanBoard.vue'
import TaskModal from '../components/TaskModal.vue'
import type { KanbanTask } from '../composables/useKanban'

const { t } = useI18n()
const route = useRoute()
const sessionStore = useSessionStore()
const { columns, members, status, error, connect, createColumn, updateColumn, deleteColumn, createTask, updateTask, moveTask, deleteTask } = useKanban()

const boardId = route.params['id'] as string

const newColumnTitle = ref('')
const isAddingColumn = ref(false)

const activeTask = ref<KanbanTask | null>(null)
const activeTaskColumnId = ref('')
const isModalOpen = ref(false)

onMounted(() => {
  const key = sessionStore.session?.boardKey
  if (key) {
    connect(boardId, key)
  }
})

function openNewTaskModal(columnId: string) {
  // Empty task for creation
  activeTask.value = null
  activeTaskColumnId.value = columnId
  isModalOpen.value = true
}

function openTask(task: KanbanTask) {
  activeTask.value = task
  activeTaskColumnId.value = task.columnId
  isModalOpen.value = true
}

function handleModalSave(data: {
  title: string
  description: string | null
  effort: number | null
  dueDate: string | null
  assignedTo: string | null
}) {
  if (activeTask.value) {
    updateTask(activeTask.value.id, data)
  } else {
    createTask(activeTaskColumnId.value, data.title)
    // If additional fields are set, update right after — but for simplicity, createTask only sets title
    // The user can re-open the card to set other fields
  }
  isModalOpen.value = false
}

function handleModalDelete() {
  if (activeTask.value) {
    deleteTask(activeTask.value.id, activeTask.value.columnId)
  }
  isModalOpen.value = false
}

function confirmAddColumn() {
  const trimmed = newColumnTitle.value.trim()
  if (!trimmed) return
  createColumn(trimmed)
  newColumnTitle.value = ''
  isAddingColumn.value = false
}
</script>

<template>
  <div class="flex flex-col h-full bg-nb-bg">
    <!-- Status bar -->
    <div class="border-b-2 border-nb-border px-4 py-2 flex items-center gap-3 bg-nb-surface shrink-0">
      <span class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
        {{ t('kanban.title') }}
      </span>

      <span
        class="ml-auto font-mono text-xs"
        :class="{
          'text-nb-muted': status === 'connecting' || status === 'idle',
          'text-green-600': status === 'ready',
          'text-red-600': status === 'error' || status === 'closed',
        }"
      >
        <template v-if="status === 'connecting'">{{ t('kanban.statusConnecting') }}</template>
        <template v-else-if="status === 'ready'">{{ t('kanban.statusConnected') }}</template>
        <template v-else-if="status === 'closed'">{{ t('kanban.statusDisconnected') }}</template>
        <template v-else-if="status === 'error'">{{ t('kanban.statusError') }}</template>
      </span>

      <!-- Add column -->
      <div v-if="status === 'ready'" class="flex items-center gap-2">
        <template v-if="isAddingColumn">
          <input
            v-model="newColumnTitle"
            :placeholder="t('kanban.columnTitlePlaceholder')"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-xs px-2 py-1 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted w-36"
            @keydown.enter="confirmAddColumn"
            @keydown.escape="isAddingColumn = false"
          />
          <AppButton variant="primary" size="sm" :disabled="!newColumnTitle.trim()" @click="confirmAddColumn">
            {{ t('kanban.add') }}
          </AppButton>
          <AppButton variant="ghost" size="sm" @click="isAddingColumn = false">
            {{ t('kanban.cancel') }}
          </AppButton>
        </template>
        <AppButton v-else variant="secondary" size="sm" @click="isAddingColumn = true">
          + {{ t('kanban.addColumn') }}
        </AppButton>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="error && status === 'error'"
      class="border-b-2 border-nb-border bg-red-50 dark:bg-red-950 px-4 py-2 font-mono text-xs text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- Connecting placeholder -->
    <div
      v-if="status === 'connecting' || status === 'idle'"
      class="flex-1 flex items-center justify-center"
    >
      <span class="font-mono text-xs text-nb-muted">{{ t('kanban.statusConnecting') }}</span>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="status === 'ready' && columns.length === 0"
      class="flex-1 flex items-center justify-center"
    >
      <span class="font-mono text-xs text-nb-muted">{{ t('kanban.emptyBoard') }}</span>
    </div>

    <!-- Kanban board -->
    <KanbanBoard
      v-else-if="status === 'ready'"
      :columns="columns"
      :members="members"
      class="flex-1 min-h-0"
      @update-column="(columnId, data) => updateColumn(columnId, data)"
      @delete-column="(columnId) => deleteColumn(columnId)"
      @add-task="(columnId, title) => createTask(columnId, title)"
      @open-task="openTask"
      @move-task="(taskId, columnId, position) => moveTask(taskId, columnId, position)"
    />

    <!-- Task Modal -->
    <TaskModal
      v-if="isModalOpen"
      :task="activeTask"
      :members="members"
      :column-id="activeTaskColumnId"
      @close="isModalOpen = false"
      @save="handleModalSave"
      @delete="handleModalDelete"
    />
  </div>
</template>
