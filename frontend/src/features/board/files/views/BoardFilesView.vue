<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import AppInput from "@/components/ui/AppInput.vue";
import AppButton from "@/components/ui/AppButton.vue";
import { useSessionStore } from "@/stores/session";
import { useFiles } from "../composables/useFiles";
import FileCard from "../components/FileCard.vue";
import LinkCard from "../components/LinkCard.vue";
import AddLinkModal from "../components/AddLinkModal.vue";
import UploadFileModal from "../components/UploadFileModal.vue";

const { t } = useI18n();
const route = useRoute();
const sessionStore = useSessionStore();

const boardId = route.params["id"] as string;

const {
  filtered,
  loading,
  wsStatus,
  error,
  search,
  connect,
  addLink,
  uploadFile,
  deleteFile,
  downloadFile,
} = useFiles();

const showAddLink = ref(false);
const showUpload = ref(false);
const downloadingId = ref<string | null>(null);
const linkError = ref<string | null>(null);
const uploadError = ref<string | null>(null);
const deleteError = ref<string | null>(null);

onMounted(() => {
  connect(boardId);
});

async function handleAddLink(data: { name: string; url: string }) {
  linkError.value = null;
  try {
    await addLink(boardId, data.name, data.url);
    showAddLink.value = false;
  } catch (e) {
    linkError.value = e instanceof Error ? e.message : t("errors.serverError");
  }
}

async function handleUpload(data: { name: string; file: File }) {
  uploadError.value = null;
  try {
    await uploadFile(boardId, data.name, data.file, sessionStore.session?.boardKey ?? null);
    showUpload.value = false;
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : t("errors.serverError");
  }
}

async function handleDownload(fileId: string, fileName: string, mimeType: string | null) {
  downloadingId.value = fileId;
  try {
    await downloadFile(
      boardId,
      fileId,
      fileName,
      mimeType,
      sessionStore.session?.boardKey ?? null,
    );
  } catch {
    // ignore download errors silently
  } finally {
    downloadingId.value = null;
  }
}

async function handleDelete(fileId: string) {
  deleteError.value = null;
  try {
    await deleteFile(boardId, fileId);
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : t("errors.serverError");
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-nb-bg">
    <!-- Header bar -->
    <div
      class="border-b-2 border-nb-border px-4 py-2 flex items-center gap-3 bg-nb-surface shrink-0"
    >
      <span class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
        {{ t("files.title") }}
      </span>
      <div class="flex items-center gap-2 ml-auto">
        <AppButton size="sm" @click="showUpload = true">{{ t("files.uploadFile") }}</AppButton>
        <AppButton size="sm" variant="secondary" @click="showAddLink = true">
          {{ t("files.addLink") }}
        </AppButton>
      </div>
    </div>

    <!-- Search bar -->
    <div class="border-b-2 border-nb-border px-4 py-3 bg-nb-surface shrink-0">
      <AppInput v-model="search" :placeholder="t('files.searchPlaceholder')" />
    </div>

    <!-- Error banner -->
    <div
      v-if="error || deleteError"
      class="border-b-2 border-nb-border bg-red-50 dark:bg-red-950 px-4 py-2 font-mono text-xs text-red-700 dark:text-red-300 shrink-0"
    >
      {{ deleteError ?? error }}
    </div>

    <!-- Loading -->
    <div v-if="loading || wsStatus === 'connecting'" class="flex-1 flex items-center justify-center">
      <span class="font-mono text-xs text-nb-muted">{{ t("files.loading") }}</span>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && filtered.length === 0"
      class="flex-1 flex items-center justify-center p-8 text-center"
    >
      <span class="font-mono text-xs text-nb-muted">{{ t("files.empty") }}</span>
    </div>

    <!-- Cards grid -->
    <div v-else class="flex-1 overflow-auto p-4">
      <div class="grid grid-cols-2 gap-6" style="grid-auto-rows: 9rem">
        <template v-for="entry in filtered" :key="entry.id">
          <LinkCard v-if="entry.type === 'link'" :file="entry" @delete="handleDelete(entry.id)" />
          <FileCard
            v-else
            :file="entry"
            :downloading="downloadingId === entry.id"
            @download="handleDownload(entry.id, entry.name, entry.mimeType)"
            @delete="handleDelete(entry.id)"
          />
        </template>
      </div>
    </div>

    <AddLinkModal
      v-if="showAddLink"
      :server-error="linkError"
      @save="handleAddLink"
      @close="
        showAddLink = false;
        linkError = null;
      "
    />
    <UploadFileModal
      v-if="showUpload"
      :server-error="uploadError"
      @save="handleUpload"
      @close="
        showUpload = false;
        uploadError = null;
      "
    />
  </div>
</template>
