<script setup lang="ts">
import { ref, nextTick, watch, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import AppButton from "@/components/ui/AppButton.vue";
import { useUserStore } from "@/stores/user";
import { useSessionStore } from "@/stores/session";
import { useChat } from "../composables/useChat";
import type { ChatMessage } from "../composables/useChat";

const { t } = useI18n();
const route = useRoute();
const userStore = useUserStore();
const sessionStore = useSessionStore();

const { messages, status, error, connect, send } = useChat();

const inputText = ref("");
const messagesEndRef = ref<HTMLDivElement | null>(null);

const boardId = route.params["id"] as string;

onMounted(() => {
  const key = sessionStore.session?.boardKey;
  if (key) {
    connect(boardId, key);
  }
});

function scrollToBottom() {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: "smooth" });
  });
}

watch(messages, scrollToBottom, { deep: true });

function handleSend() {
  const text = inputText.value.trim();
  if (!text) return;
  send(text);
  inputText.value = "";
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function avatarInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}

const currentUsername = computed(() => userStore.user?.username);

function isSelf(msg: ChatMessage): boolean {
  return msg.username === currentUsername.value;
}

const USER_COLORS = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#d97706",
  "#db2777",
  "#0891b2",
  "#dc2626",
  "#7c3aed",
];

function getUserColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) - hash + username.charCodeAt(i)) | 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]!;
}
</script>

<template>
  <div class="flex flex-col h-full bg-nb-bg">
    <!-- Status bar -->
    <div
      class="border-b-2 border-nb-border px-4 py-2 flex items-center gap-2 bg-nb-surface shrink-0"
    >
      <span class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
        {{ t("chat.title") }}
      </span>
      <span
        class="ml-auto font-mono text-xs"
        :class="{
          'text-nb-muted': status === 'connecting' || status === 'idle',
          'text-green-600': status === 'ready',
          'text-red-600': status === 'error' || status === 'closed',
        }"
      >
        <template v-if="status === 'connecting'">{{ t("chat.statusConnecting") }}</template>
        <template v-else-if="status === 'ready'">{{ t("chat.statusConnected") }}</template>
        <template v-else-if="status === 'closed'">{{ t("chat.statusDisconnected") }}</template>
        <template v-else-if="status === 'error'">{{ t("chat.statusError") }}</template>
      </span>
    </div>

    <!-- Error banner -->
    <div
      v-if="error && status === 'error'"
      class="border-b-2 border-nb-border bg-red-50 dark:bg-red-950 px-4 py-2 font-mono text-xs text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- Messages list -->
    <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
      <!-- Empty state -->
      <div
        v-if="messages.length === 0 && status === 'ready'"
        class="flex-1 flex items-center justify-center"
      >
        <span class="font-mono text-xs text-nb-muted">{{ t("chat.empty") }}</span>
      </div>

      <!-- Connecting placeholder -->
      <div
        v-if="status === 'connecting' || status === 'idle'"
        class="flex-1 flex items-center justify-center"
      >
        <span class="font-mono text-xs text-nb-muted">{{ t("chat.statusConnecting") }}</span>
      </div>

      <!-- Messages -->
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['flex items-start gap-3', isSelf(msg) ? 'flex-row-reverse' : '']"
      >
        <!-- Avatar -->
        <div
          class="shrink-0 w-8 h-8 border-2 border-nb-border text-white font-mono text-xs font-bold flex items-center justify-center shadow-[var(--nb-shadow-sm)]"
          :style="{ backgroundColor: getUserColor(msg.username) }"
        >
          {{ avatarInitial(msg.username) }}
        </div>

        <!-- Bubble -->
        <div :class="['flex flex-col gap-1 min-w-0', isSelf(msg) ? 'items-end' : '']">
          <div :class="['flex items-baseline gap-2', isSelf(msg) ? 'flex-row-reverse' : '']">
            <span class="font-mono text-xs font-bold text-nb-text">{{ msg.username }}</span>
            <span class="font-mono text-xs text-nb-muted">{{ formatTime(msg.createdAt) }}</span>
          </div>
          <div
            :class="[
              'border-2 border-nb-border px-3 py-2 shadow-[var(--nb-shadow-sm)] font-mono text-sm break-words',
              isSelf(msg) ? 'bg-nb-accent text-white' : 'bg-nb-surface text-nb-text',
            ]"
          >
            {{ msg.text }}
          </div>
        </div>
      </div>

      <!-- Scroll anchor -->
      <div ref="messagesEndRef" />
    </div>

    <!-- Input bar -->
    <div
      class="border-t-2 border-nb-border px-4 py-[0.83rem] flex gap-3 items-center bg-nb-surface shrink-0"
    >
      <textarea
        v-model="inputText"
        :placeholder="t('chat.placeholder')"
        :disabled="status !== 'ready'"
        rows="2"
        class="flex-1 resize-none bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted disabled:opacity-40 disabled:cursor-not-allowed"
        @keydown="handleKeydown"
      />
      <AppButton
        variant="primary"
        size="md"
        :disabled="status !== 'ready' || !inputText.trim()"
        @click="handleSend"
      >
        {{ t("chat.send") }}
      </AppButton>
    </div>
  </div>
</template>
