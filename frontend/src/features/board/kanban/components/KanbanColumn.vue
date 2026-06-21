<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import KanbanCard from './KanbanCard.vue'
import type { KanbanColumn, KanbanTask, BoardMember } from '../composables/useKanban'

const { t } = useI18n()

const props = defineProps<{
  column: KanbanColumn
  members: BoardMember[]
}>()

const emit = defineEmits<{
  updateColumn: [columnId: string, data: { title?: string }]
  deleteColumn: [columnId: string]
  addTask: [columnId: string, title: string]
  openTask: [task: KanbanTask]
  drop: [task: KanbanTask, targetColumn: KanbanColumn, position: number]
  dragstart: [task: KanbanTask]
}>()

const isEditingTitle = ref(false)
const editTitle = ref('')
const newTaskTitle = ref('')
const isAddingTask = ref(false)
const isDragOver = ref(false)

function startEditTitle() {
  editTitle.value = props.column.title
  isEditingTitle.value = true
}

function confirmTitle() {
  const trimmed = editTitle.value.trim()
  isEditingTitle.value = false
  if (trimmed && trimmed !== props.column.title) {
    emit('updateColumn', props.column.id, { title: trimmed })
  }
}

function handleTitleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') confirmTitle()
  else if (event.key === 'Escape') isEditingTitle.value = false
}

function confirmAddTask() {
  const trimmed = newTaskTitle.value.trim()
  if (!trimmed) return
  emit('addTask', props.column.id, trimmed)
  newTaskTitle.value = ''
  isAddingTask.value = false
}

function cancelAddTask() {
  newTaskTitle.value = ''
  isAddingTask.value = false
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  const taskId = event.dataTransfer?.getData('text/plain')
  if (!taskId) return
  // Position = after all current tasks
  const position = props.column.tasks.length + 1
  emit('drop', { id: taskId } as KanbanTask, props.column, position)
}
</script>

<template>
  <div
    class="flex flex-col w-72 shrink-0 border-2 border-nb-border bg-nb-surface shadow-[var(--nb-shadow)]"
    :class="{ 'border-nb-accent': isDragOver }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Column header -->
    <div class="border-b-2 border-nb-border px-3 py-2 flex items-center gap-2 bg-nb-bg shrink-0">
      <div class="flex-1 min-w-0">
        <input
          v-if="isEditingTitle"
          v-model="editTitle"
          class="w-full bg-nb-bg border-b-2 border-nb-border text-nb-text font-mono text-xs font-bold px-1 py-0.5 outline-none"
          @keydown="handleTitleKeydown"
          @blur="confirmTitle"
        />
        <button
          v-else
          class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide hover:text-nb-accent transition-colors truncate block max-w-full"
          @click="startEditTitle"
        >
          {{ column.title }}
        </button>
      </div>

      <span class="font-mono text-xs text-nb-muted shrink-0">{{ column.tasks.length }}</span>

      <button
        class="font-mono text-xs text-nb-muted hover:text-red-600 transition-colors shrink-0"
        :title="t('kanban.deleteColumn')"
        @click="emit('deleteColumn', column.id)"
      >
        ✕
      </button>
    </div>

    <!-- Task list -->
    <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-0">
      <KanbanCard
        v-for="task in column.tasks"
        :key="task.id"
        :task="task"
        :members="members"
        @click="emit('openTask', task)"
        @dragstart="emit('dragstart', $event)"
      />

      <!-- Add task inline input -->
      <div v-if="isAddingTask" class="flex flex-col gap-1">
        <input
          v-model="newTaskTitle"
          :placeholder="t('kanban.taskTitlePlaceholder')"
          class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-xs px-2 py-1.5 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted"
          @keydown.enter="confirmAddTask"
          @keydown.escape="cancelAddTask"
        />
        <div class="flex gap-1">
          <AppButton variant="primary" size="sm" :disabled="!newTaskTitle.trim()" @click="confirmAddTask">
            {{ t('kanban.add') }}
          </AppButton>
          <AppButton variant="ghost" size="sm" @click="cancelAddTask">
            {{ t('kanban.cancel') }}
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Add task button -->
    <div class="border-t-2 border-nb-border p-2 shrink-0">
      <button
        class="w-full font-mono text-xs text-nb-muted hover:text-nb-text transition-colors py-1"
        @click="isAddingTask = true"
      >
        + {{ t('kanban.addTask') }}
      </button>
    </div>
  </div>
</template>
