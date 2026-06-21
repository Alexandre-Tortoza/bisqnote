<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { BoardFile } from "../composables/useFiles";

defineProps<{ file: BoardFile }>();
const emit = defineEmits<{ delete: [] }>();

const { t } = useI18n();
</script>

<template>
  <div
    class="border-2 border-nb-border bg-nb-surface p-4 shadow-[var(--nb-shadow-sm)] flex flex-col gap-3 transition-transform duration-200 ease-in-out hover:scale-[1.03]"
  >
    <!-- Icon + name -->
    <div class="flex items-start gap-2">
      <svg
        class="w-4 h-4 mt-0.5 text-nb-muted shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <p class="font-mono text-sm text-nb-text font-semibold leading-snug break-all">
        {{ file.name }}
      </p>
    </div>

    <!-- URL -->
    <p class="font-mono text-xs text-nb-muted truncate">{{ file.url }}</p>

    <!-- Actions -->
    <div class="flex items-center gap-2 mt-auto pt-1">
      <a
        :href="file.url ?? '#'"
        target="_blank"
        rel="noopener noreferrer"
        class="flex-1 border-2 border-nb-border bg-nb-bg hover:bg-nb-surface px-3 py-1.5 font-mono text-xs font-bold text-nb-text transition-colors text-center"
      >
        {{ t("files.open") }}
      </a>
      <button
        class="border-2 border-nb-border bg-nb-bg hover:bg-red-50 dark:hover:bg-red-950 px-3 py-1.5 font-mono text-xs font-bold text-nb-muted hover:text-red-600 transition-colors"
        @click="emit('delete')"
      >
        ✕
      </button>
    </div>
  </div>
</template>
