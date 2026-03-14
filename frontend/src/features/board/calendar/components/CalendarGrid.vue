<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarEvent } from '../composables/useCalendar'

const { t } = useI18n()

const props = defineProps<{
  events: CalendarEvent[]
}>()

const emit = defineEmits<{
  dayClick: [date: string]
  eventClick: [event: CalendarEvent]
}>()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth()) // 0-based

const monthLabel = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase()
})

/** 0 = Sunday through 6 = Saturday */
const weekDayHeaders = computed(() => {
  return [
    t('calendar.sun'),
    t('calendar.mon'),
    t('calendar.tue'),
    t('calendar.wed'),
    t('calendar.thu'),
    t('calendar.fri'),
    t('calendar.sat'),
  ]
})

interface CalendarDay {
  date: string // YYYY-MM-DD
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

const calendarDays = computed((): CalendarDay[][] => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Pad the start: fill with days from previous month
  const startPad = firstDay.getDay() // 0=Sun
  const cells: CalendarDay[] = []

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push(makeDay(d, false))
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(makeDay(new Date(year, month, d), true))
  }

  // Pad the end to complete the last row
  const endPad = 6 - lastDay.getDay()
  for (let d = 1; d <= endPad; d++) {
    cells.push(makeDay(new Date(year, month + 1, d), false))
  }

  // Split into weeks
  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
})

function makeDay(date: Date, isCurrentMonth: boolean): CalendarDay {
  const dateStr = toDateStr(date)
  const todayStr = toDateStr(today)
  return {
    date: dateStr,
    day: date.getDate(),
    isCurrentMonth,
    isToday: dateStr === todayStr,
    events: props.events.filter((e) => e.startAt.slice(0, 10) === dateStr),
  }
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function eventChipColor(index: number): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
  ]
  return colors[index % colors.length]!
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Month nav -->
    <div class="flex items-center gap-3 px-4 py-2 border-b-2 border-nb-border bg-nb-surface shrink-0">
      <button
        class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors px-1"
        @click="prevMonth"
      >
        ←
      </button>
      <span class="font-mono text-xs font-bold text-nb-text tracking-wider flex-1 text-center">
        {{ monthLabel }}
      </span>
      <button
        class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors px-1"
        @click="nextMonth"
      >
        →
      </button>
    </div>

    <!-- Grid -->
    <div class="flex-1 overflow-auto">
      <table class="w-full h-full border-collapse table-fixed">
        <!-- Day-of-week headers -->
        <thead>
          <tr>
            <th
              v-for="day in weekDayHeaders"
              :key="day"
              class="font-mono text-xs font-bold text-nb-muted uppercase tracking-wider py-2 border-b-2 border-nb-border text-center"
            >
              {{ day }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, wi) in calendarDays" :key="wi" class="h-24">
            <td
              v-for="cell in week"
              :key="cell.date"
              class="border border-nb-border p-1 align-top cursor-pointer hover:bg-nb-surface transition-colors"
              :class="{ 'opacity-40': !cell.isCurrentMonth }"
              @click="emit('dayClick', cell.date)"
            >
              <!-- Day number -->
              <div
                class="font-mono text-xs font-bold mb-1"
                :class="
                  cell.isToday
                    ? 'text-nb-bg bg-nb-text rounded-full w-5 h-5 flex items-center justify-center'
                    : 'text-nb-text'
                "
              >
                {{ cell.day }}
              </div>

              <!-- Events chips -->
              <div class="flex flex-col gap-0.5">
                <div
                  v-for="(ev, idx) in cell.events.slice(0, 3)"
                  :key="ev.id"
                  :class="['text-white font-mono text-[10px] px-1 rounded truncate cursor-pointer', eventChipColor(idx)]"
                  :title="ev.title"
                  @click.stop="emit('eventClick', ev)"
                >
                  {{ ev.title }}
                </div>
                <div
                  v-if="cell.events.length > 3"
                  class="font-mono text-[10px] text-nb-muted"
                >
                  +{{ cell.events.length - 3 }} {{ t('calendar.more') }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
