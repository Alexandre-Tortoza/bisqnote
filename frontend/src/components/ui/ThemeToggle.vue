<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useThemeStore, type Theme } from "@/stores/theme";
import { TbSun, TbMoon, TbDeviceDesktop } from "vue-icons-plus/tb";

const { t } = useI18n();
const themeStore = useThemeStore();

const options: { value: Theme; labelKey: string; icon: typeof TbSun }[] = [
  { value: "light", labelKey: "theme.light", icon: TbSun },
  { value: "system", labelKey: "theme.system", icon: TbDeviceDesktop },
  { value: "dark", labelKey: "theme.dark", icon: TbMoon },
];

const activeOption = computed(() => options.find((o) => o.value === themeStore.theme));

function cycleTheme() {
  const index = options.findIndex((o) => o.value === themeStore.theme);
  const next = options[(index + 1) % options.length];
  themeStore.setTheme(next!.value);
}
</script>

<template>
  <button
    v-if="activeOption"
    :aria-label="t(activeOption.labelKey)"
    :title="t(activeOption.labelKey)"
    aria-pressed="true"
    class="inline-flex items-center justify-center px-3 py-1.5 border-2 border-nb-border bg-nb-border text-nb-bg transition-all hover:opacity-80"
    @click="cycleTheme"
  >
    <component :is="activeOption.icon" :size="16" />
  </button>
</template>
