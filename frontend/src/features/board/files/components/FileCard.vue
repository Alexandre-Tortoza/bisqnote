<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { BoardFile } from "../composables/useFiles";

const props = defineProps<{
  file: BoardFile;
  downloading: boolean;
}>();

const emit = defineEmits<{
  download: [];
  delete: [];
}>();

const { t } = useI18n();

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p class="font-mono text-sm text-nb-text font-semibold leading-snug break-all">
        {{ file.name }}
      </p>
    </div>

    <!-- Size -->
    <p v-if="file.sizeBytes" class="font-mono text-xs text-nb-muted">
      {{ formatBytes(file.sizeBytes) }}
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-2 mt-auto pt-1">
      <button
        class="flex-1 border-2 border-nb-border bg-nb-bg hover:bg-nb-surface px-3 py-1.5 font-mono text-xs font-bold text-nb-text transition-colors disabled:opacity-50"
        :disabled="downloading"
        @click="emit('download')"
      >
        {{ downloading ? "..." : t("files.download") }}
      </button>
      <button
        class="border-2 border-nb-border bg-nb-bg hover:bg-red-50 dark:hover:bg-red-950 px-3 py-1.5 font-mono text-xs font-bold text-nb-muted hover:text-red-600 transition-colors"
        @click="emit('delete')"
      >
        ✕
      </button>
    </div>
  </div>
</template>
