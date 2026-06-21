<script setup lang="ts">
import { ref } from 'vue'
import KanbanColumn from './KanbanColumn.vue'
import type { KanbanColumn as KanbanColumnType, KanbanTask, BoardMember } from '../composables/useKanban'

defineProps<{
  columns: KanbanColumnType[]
  members: BoardMember[]
}>()

const emit = defineEmits<{
  updateColumn: [columnId: string, data: { title?: string }]
  deleteColumn: [columnId: string]
  addTask: [columnId: string, title: string]
  openTask: [task: KanbanTask]
  moveTask: [taskId: string, columnId: string, position: number]
}>()

const draggedTask = ref<KanbanTask | null>(null)

function onDragStart(task: KanbanTask) {
  draggedTask.value = task
}

function onDrop(_hint: KanbanTask, targetColumn: KanbanColumnType, position: number) {
  const sourceTask = draggedTask.value
  if (!sourceTask) return
  draggedTask.value = null
  emit('moveTask', sourceTask.id, targetColumn.id, position)
}
</script>

<template>
  <div class="flex gap-4 p-4 overflow-x-auto h-full items-start">
    <KanbanColumn
      v-for="column in columns"
      :key="column.id"
      :column="column"
      :members="members"
      @update-column="(columnId, data) => emit('updateColumn', columnId, data)"
      @delete-column="(columnId) => emit('deleteColumn', columnId)"
      @add-task="(columnId, title) => emit('addTask', columnId, title)"
      @open-task="(task) => emit('openTask', task)"
      @dragstart="onDragStart"
      @drop="(task, col, pos) => onDrop(task, col, pos)"
    />
  </div>
</template>
