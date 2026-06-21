<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import type { KanbanTask, BoardMember } from '../composables/useKanban'

const { t } = useI18n()

const props = defineProps<{
  task: KanbanTask | null
  members: BoardMember[]
  columnId: string
}>()

const emit = defineEmits<{
  close: []
  save: [data: {
    title: string
    description: string | null
    effort: number | null
    dueDate: string | null
    assignedTo: string | null
  }]
  delete: []
}>()

const title = ref('')
const description = ref('')
const effort = ref<number | null>(null)
const dueDate = ref('')
const assignedTo = ref<string | null>(null)

watch(
  () => props.task,
  (task) => {
    title.value = task?.title ?? ''
    description.value = task?.description ?? ''
    effort.value = task?.effort ?? null
    dueDate.value = task?.dueDate ?? ''
    assignedTo.value = task?.assignedTo ?? null
  },
  { immediate: true },
)

function handleSave() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value.trim(),
    description: description.value.trim() || null,
    effort: effort.value,
    dueDate: dueDate.value || null,
    assignedTo: assignedTo.value || null,
  })
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click="handleBackdropClick"
  >
    <div class="w-full max-w-md border-2 border-nb-border bg-nb-bg shadow-[var(--nb-shadow)] mx-4">
      <!-- Header -->
      <div class="border-b-2 border-nb-border px-4 py-3 flex items-center justify-between bg-nb-surface">
        <span class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
          {{ task ? t('kanban.editTask') : t('kanban.createTask') }}
        </span>
        <button
          class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Form -->
      <div class="p-4 flex flex-col gap-4">
        <!-- Title -->
        <div class="flex flex-col gap-1">
          <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
            {{ t('kanban.taskTitle') }} *
          </label>
          <input
            v-model="title"
            type="text"
            :placeholder="t('kanban.taskTitlePlaceholder')"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted"
            @keydown.enter="handleSave"
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
            {{ t('kanban.taskDescription') }}
          </label>
          <textarea
            v-model="description"
            rows="3"
            :placeholder="t('kanban.taskDescriptionPlaceholder')"
            class="resize-none bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted"
          />
        </div>

        <!-- Effort + Due date row -->
        <div class="flex gap-3">
          <div class="flex flex-col gap-1 flex-1">
            <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
              {{ t('kanban.taskEffort') }}
            </label>
            <select
              v-model="effort"
              class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100"
            >
              <option :value="null">—</option>
              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-1 flex-1">
            <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
              {{ t('kanban.taskDueDate') }}
            </label>
            <input
              v-model="dueDate"
              type="date"
              class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100"
            />
          </div>
        </div>

        <!-- Assignee -->
        <div class="flex flex-col gap-1">
          <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
            {{ t('kanban.taskAssignee') }}
          </label>
          <select
            v-model="assignedTo"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100"
          >
            <option :value="null">{{ t('kanban.unassigned') }}</option>
            <option
              v-for="member in members"
              :key="member.memberId"
              :value="member.memberId"
            >
              {{ member.username }}
            </option>
          </select>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t-2 border-nb-border px-4 py-3 flex items-center justify-between bg-nb-surface">
        <AppButton
          v-if="task"
          variant="danger"
          size="sm"
          @click="emit('delete')"
        >
          {{ t('kanban.deleteTask') }}
        </AppButton>
        <div v-else />

        <div class="flex gap-2">
          <AppButton variant="ghost" size="sm" @click="emit('close')">
            {{ t('kanban.cancel') }}
          </AppButton>
          <AppButton variant="primary" size="sm" :disabled="!title.trim()" @click="handleSave">
            {{ t('kanban.save') }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>
