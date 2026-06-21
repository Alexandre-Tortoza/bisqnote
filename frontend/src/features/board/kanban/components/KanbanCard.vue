<script setup lang="ts">
import type { KanbanTask, BoardMember } from '../composables/useKanban'

const props = defineProps<{
  task: KanbanTask
  members: BoardMember[]
}>()

const emit = defineEmits<{
  click: []
  dragstart: [task: KanbanTask]
}>()

function assigneeName(): string | null {
  if (!props.task.assignedTo) return null
  return props.members.find((m) => m.memberId === props.task.assignedTo)?.username ?? null
}

function avatarInitial(username: string): string {
  return username.charAt(0).toUpperCase()
}

function onDragStart(event: DragEvent) {
  event.dataTransfer?.setData('text/plain', props.task.id)
  emit('dragstart', props.task)
}
</script>

<template>
  <div
    class="border-2 border-nb-border bg-nb-surface p-3 shadow-[var(--nb-shadow-sm)] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[var(--nb-shadow)] transition-all duration-100 select-none"
    draggable="true"
    @dragstart="onDragStart"
    @click="emit('click')"
  >
    <!-- Title -->
    <p class="font-mono text-sm text-nb-text font-semibold leading-snug break-words">
      {{ task.title }}
    </p>

    <!-- Meta row -->
    <div class="mt-2 flex items-center gap-2 flex-wrap">
      <!-- Effort badge -->
      <span
        v-if="task.effort"
        class="inline-flex items-center border-2 border-nb-border bg-nb-bg px-1.5 py-0.5 font-mono text-xs text-nb-muted"
      >
        E{{ task.effort }}
      </span>

      <!-- Due date -->
      <span
        v-if="task.dueDate"
        class="font-mono text-xs text-nb-muted"
      >
        {{ task.dueDate }}
      </span>

      <!-- Assignee avatar -->
      <div
        v-if="assigneeName()"
        class="ml-auto w-6 h-6 border-2 border-nb-border bg-nb-accent text-white font-mono text-xs font-bold flex items-center justify-center shrink-0"
        :title="assigneeName()!"
      >
        {{ avatarInitial(assigneeName()!) }}
      </div>
    </div>
  </div>
</template>
