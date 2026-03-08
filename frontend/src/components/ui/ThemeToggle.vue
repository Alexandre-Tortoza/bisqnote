<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useThemeStore, type Theme } from "@/stores/theme";

const { t } = useI18n();
const themeStore = useThemeStore();

const options: { value: Theme; labelKey: string; icon: string }[] = [
  { value: "light", labelKey: "theme.light", icon: "☀" },
  { value: "system", labelKey: "theme.system", icon: "◑" },
  { value: "dark", labelKey: "theme.dark", icon: "●" },
];

const activeOption = computed(() => options.find((o) => o.value === themeStore.theme));

function cycleTheme() {
  const index = options.findIndex((o) => o.value === themeStore.theme);
  const next = options[(index + 1) % options.length];
  themeStore.setTheme(next.value);
}
</script>

<template>
  <button
    v-if="activeOption"
    :aria-label="t(activeOption.labelKey)"
    :title="t(activeOption.labelKey)"
    aria-pressed="true"
    class="inline-flex items-center justify-center px-3 py-1.5 font-mono text-xs border-2 border-nb-border bg-nb-border text-nb-bg transition-all hover:opacity-80"
    @click="cycleTheme"
  >
    {{ activeOption.icon }}
  </button>
</template>
