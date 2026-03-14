<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import type { CalendarEvent } from '../composables/useCalendar'

const { t } = useI18n()

const props = defineProps<{
  event: CalendarEvent | null
  /** Pre-filled start date (YYYY-MM-DD) when creating from a day click. */
  defaultDate?: string
}>()

const emit = defineEmits<{
  close: []
  save: [
    data: {
      title: string
      startAt: string
      endAt: string | null
      description: string | null
      notifyStartDaysBefore: number
      notifyRepeatDaily: boolean
    },
  ]
  delete: []
}>()

const title = ref('')
const startDate = ref('')
const startTime = ref('09:00')
const endDate = ref('')
const endTime = ref('')
const description = ref('')
const notifyStartDaysBefore = ref(0)
const notifyRepeatDaily = ref(false)

const showRepeatDaily = computed(() => notifyStartDaysBefore.value > 0)

function isoToDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = d.toISOString().slice(0, 10)
  const time = d.toISOString().slice(11, 16)
  return { date, time }
}

function buildIso(date: string, time: string): string {
  if (!date) return ''
  const t2 = time || '00:00'
  return new Date(`${date}T${t2}:00`).toISOString()
}

watch(
  () => [props.event, props.defaultDate],
  () => {
    if (props.event) {
      title.value = props.event.title
      const s = isoToDateParts(props.event.startAt)
      startDate.value = s.date
      startTime.value = s.time
      if (props.event.endAt) {
        const e = isoToDateParts(props.event.endAt)
        endDate.value = e.date
        endTime.value = e.time
      } else {
        endDate.value = ''
        endTime.value = ''
      }
      description.value = props.event.description ?? ''
      notifyStartDaysBefore.value = props.event.notifyStartDaysBefore
      notifyRepeatDaily.value = props.event.notifyRepeatDaily
    } else {
      title.value = ''
      startDate.value = props.defaultDate ?? ''
      startTime.value = '09:00'
      endDate.value = ''
      endTime.value = ''
      description.value = ''
      notifyStartDaysBefore.value = 0
      notifyRepeatDaily.value = false
    }
  },
  { immediate: true },
)

function handleSave() {
  if (!title.value.trim() || !startDate.value) return
  const endAt = endDate.value ? buildIso(endDate.value, endTime.value) : null
  emit('save', {
    title: title.value.trim(),
    startAt: buildIso(startDate.value, startTime.value),
    endAt,
    description: description.value.trim() || null,
    notifyStartDaysBefore: notifyStartDaysBefore.value,
    notifyRepeatDaily: showRepeatDaily.value ? notifyRepeatDaily.value : false,
  })
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
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
          {{ event ? t('calendar.editEvent') : t('calendar.createEvent') }}
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
            {{ t('calendar.eventTitle') }} *
          </label>
          <input
            v-model="title"
            type="text"
            :placeholder="t('calendar.eventTitlePlaceholder')"
            maxlength="200"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted"
          />
        </div>

        <!-- Start date + time -->
        <div class="flex gap-3">
          <div class="flex flex-col gap-1 flex-1">
            <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
              {{ t('calendar.startDate') }} *
            </label>
            <input
              v-model="startDate"
              type="date"
              class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100"
            />
          </div>
          <div class="flex flex-col gap-1 w-28">
            <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
              {{ t('calendar.startTime') }}
            </label>
            <input
              v-model="startTime"
              type="time"
              class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100"
            />
          </div>
        </div>

        <!-- End date + time -->
        <div class="flex gap-3">
          <div class="flex flex-col gap-1 flex-1">
            <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
              {{ t('calendar.endDate') }}
            </label>
            <input
              v-model="endDate"
              type="date"
              class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100"
            />
          </div>
          <div class="flex flex-col gap-1 w-28">
            <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
              {{ t('calendar.endTime') }}
            </label>
            <input
              v-model="endTime"
              type="time"
              :disabled="!endDate"
              class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 disabled:opacity-40"
            />
          </div>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
            {{ t('calendar.description') }}
          </label>
          <textarea
            v-model="description"
            rows="3"
            :placeholder="t('calendar.descriptionPlaceholder')"
            class="resize-none bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted"
          />
        </div>

        <!-- Notify X days before -->
        <div class="flex flex-col gap-1">
          <label class="font-mono text-xs font-bold text-nb-text uppercase tracking-wide">
            {{ t('calendar.notifyDaysBefore') }}
          </label>
          <select
            v-model.number="notifyStartDaysBefore"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100"
          >
            <option :value="0">{{ t('calendar.notifyDisabled') }}</option>
            <option :value="1">1 {{ t('calendar.days') }}</option>
            <option :value="3">3 {{ t('calendar.days') }}</option>
            <option :value="7">7 {{ t('calendar.days') }}</option>
            <option :value="14">14 {{ t('calendar.days') }}</option>
            <option :value="30">30 {{ t('calendar.days') }}</option>
          </select>
        </div>

        <!-- Repeat daily -->
        <label
          v-if="showRepeatDaily"
          class="flex items-center gap-2 cursor-pointer"
        >
          <input
            v-model="notifyRepeatDaily"
            type="checkbox"
            class="w-4 h-4 border-2 border-nb-border bg-nb-bg accent-nb-text cursor-pointer"
          />
          <span class="font-mono text-xs text-nb-text">{{ t('calendar.notifyRepeatDaily') }}</span>
        </label>
      </div>

      <!-- Footer -->
      <div class="border-t-2 border-nb-border px-4 py-3 flex items-center justify-between bg-nb-surface">
        <AppButton
          v-if="event"
          variant="danger"
          size="sm"
          @click="emit('delete')"
        >
          {{ t('calendar.deleteEvent') }}
        </AppButton>
        <div v-else />

        <div class="flex gap-2">
          <AppButton variant="ghost" size="sm" @click="emit('close')">
            {{ t('calendar.cancel') }}
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            :disabled="!title.trim() || !startDate"
            @click="handleSave"
          >
            {{ t('calendar.save') }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>
