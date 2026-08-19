<script setup lang="ts">
import { ArrowUp, FileText, Mic, Plus, Square, X } from '@lucide/vue'
import type { JSONContent } from '@tiptap/core'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { TiptapComposer, TiptapComposerInput, TiptapComposerTriggerPopover } from '@/components/tiptap'
import type { ComposerItem, ComposerSubmitPayload, ComposerTokenRenderer } from '@/components/tiptap'

export interface ThreadAttachment {
  id: string
  name: string
  size: number
  type: string
}

export interface ThreadMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  html?: string
  json?: JSONContent
  attachments?: ThreadAttachment[]
}

const emit = defineEmits<{
  send: [message: ThreadMessage]
}>()

const messages = defineModel<ThreadMessage[]>('messages', {
  default: () => [],
})

interface PendingAttachment extends ThreadAttachment {
  file: File
  previewUrl?: string
}

const attachments = ref<PendingAttachment[]>([])
const isRecording = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const viewport = ref<HTMLDivElement | null>(null)
const composer = ref<InstanceType<typeof TiptapComposer> | null>(null)
const composerHtml = ref('<p></p>')

const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
  composerItems?: ComposerItem[]
  tokenRenderer?: ComposerTokenRenderer
}>(), {
  placeholder: 'Send a message...',
  disabled: false,
  composerItems: () => [
    { id: 'weather', trigger: '@', kind: 'mention', label: 'Weather', description: 'Get a city\'s current weather', icon: 'W' },
    { id: 'search', trigger: '@', kind: 'mention', label: 'Web search', description: 'Search public web content', icon: 'S' },
    { id: 'knowledge', trigger: '@', kind: 'mention', label: 'Knowledge base', description: 'Search your connected documents', icon: 'K' },
    { id: 'summarize', trigger: '/', kind: 'command', label: 'Summarize', description: 'Turn the context into a concise summary', icon: 'S' },
    { id: 'translate', trigger: '/', kind: 'command', label: 'Translate to Chinese', description: 'Translate the current content', icon: 'T' },
    { id: 'plan', trigger: '/', kind: 'command', label: 'Make a plan', description: 'Create clear execution steps', icon: 'P' },
  ],
})

const canSend = computed(() => !props.disabled && (
  attachments.value.length > 0 || Boolean(composerHtml.value && composerHtml.value !== '<p></p>')
))

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function chooseFiles() {
  fileInput.value?.click()
}

function addFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const selectedFiles = Array.from(input.files ?? [])

  for (const file of selectedFiles) {
    attachments.value.push({
      id: createId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    })
  }

  input.value = ''
}

function removeAttachment(id: string) {
  const attachment = attachments.value.find((item) => item.id === id)
  if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
  attachments.value = attachments.value.filter((item) => item.id !== id)
}

function toggleRecording() {
  if (props.disabled) return
  isRecording.value = !isRecording.value
}

async function scrollToLatest() {
  await nextTick()
  viewport.value?.scrollTo({
    top: viewport.value.scrollHeight,
    behavior: 'smooth',
  })
}

function sendMessage(payload?: ComposerSubmitPayload) {
  if (!canSend.value) return

  const message: ThreadMessage = {
    id: createId(),
    role: 'user',
    content: payload?.text.trim() ?? '',
    html: payload?.html,
    json: payload?.json,
    attachments: attachments.value.map(({ id, name, size, type }) => ({ id, name, size, type })),
  }

  messages.value = [...messages.value, message]
  emit('send', message)

  for (const attachment of attachments.value) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
  }

  attachments.value = []
  isRecording.value = false
  composerHtml.value = '<p></p>'
  composer.value?.clearContent()
  nextTick(() => composer.value?.focus())
  scrollToLatest()
}

function addMessage(message: Omit<ThreadMessage, 'id'> & { id?: string }) {
  messages.value = [
    ...messages.value,
    { ...message, id: message.id ?? createId() },
  ]
  scrollToLatest()
}

function clear() {
  messages.value = []
  for (const attachment of attachments.value) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
  }
  attachments.value = []
  isRecording.value = false
  composerHtml.value = '<p></p>'
  composer.value?.clearContent()
}

onBeforeUnmount(() => {
  for (const attachment of attachments.value) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
  }
})

defineExpose({ addMessage, clear })
</script>

<template>
  <section
    class="thread-root flex min-h-0 flex-col"
    :class="messages.length ? 'h-[min(720px,calc(100vh-4rem))]' : ''"
    aria-label="Conversation"
  >
    <div
      v-if="messages.length"
      ref="viewport"
      class="mb-5 min-h-0 flex-1 space-y-7 overflow-y-auto px-1 py-4 sm:px-5"
      aria-live="polite"
    >
      <article
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[85%] text-[15px] leading-7 text-[#242424] sm:max-w-[72%]"
          :class="message.role === 'user' ? 'rounded-3xl bg-[#eeeeee] px-5 py-3' : 'px-1'"
        >
          <div v-if="message.html" class="message-content" v-html="message.html" />
          <p v-else-if="message.content" class="whitespace-pre-wrap break-words">
            {{ message.content }}
          </p>
          <div v-if="message.attachments?.length" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="attachment in message.attachments"
              :key="attachment.id"
              class="inline-flex max-w-full items-center gap-2 rounded-lg border border-black/8 bg-white px-3 py-2 text-xs text-[#555]"
            >
              <FileText class="size-4 shrink-0" />
              <span class="truncate">{{ attachment.name }}</span>
            </span>
          </div>
        </div>
      </article>
    </div>

    <TiptapComposer
      ref="composer"
      :items="props.composerItems"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      submit-on-empty
      :token-renderer="props.tokenRenderer"
      class="shrink-0"
      @update:html="composerHtml = $event"
      @submit="sendMessage"
    >
      <div class="relative shrink-0 rounded-4xl border bg-white p-4 shadow-lg transition-shadow focus-within:border-[#d2d2d2] focus-within:shadow-[0_10px_32px_rgba(0,0,0,0.09)]">
        <div v-if="attachments.length" class="mb-2 flex gap-2 overflow-x-auto pb-1">
        <div
          v-for="attachment in attachments"
          :key="attachment.id"
          class="group relative flex h-14 min-w-0 max-w-60 items-center gap-3 rounded-lg border border-black/8 bg-[#fafafa] p-2 pr-8"
        >
          <img
            v-if="attachment.previewUrl"
            :src="attachment.previewUrl"
            alt=""
            class="size-10 shrink-0 rounded-md object-cover"
          >
          <span v-else class="grid size-10 shrink-0 place-items-center rounded-md bg-white text-[#777]">
            <FileText class="size-5" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-xs font-medium text-[#333]">{{ attachment.name }}</span>
            <span class="mt-0.5 block text-[11px] text-[#999]">{{ formatSize(attachment.size) }}</span>
          </span>
          <button
            type="button"
            class="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full text-[#777] transition-colors hover:bg-black/6 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-1"
            :aria-label="`Remove ${attachment.name}`"
            :title="`Remove ${attachment.name}`"
            @click="removeAttachment(attachment.id)"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </div>

      <div class="relative">
        <TiptapComposerInput />
        <TiptapComposerTriggerPopover trigger="@" />
        <TiptapComposerTriggerPopover trigger="/" />
      </div>

      <div class="mt-1 flex h-11 items-center justify-between px-1">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-full text-[#777] transition-colors hover:bg-[#f2f2f2] hover:text-[#333] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40"
          :disabled="disabled"
          aria-label="Add attachment"
          title="Add attachment"
          @click="chooseFiles"
        >
          <Plus class="size-6" :stroke-width="1.8" />
        </button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx"
          @change="addFiles"
        >

        <div class="flex items-center gap-2">
          <span
            v-if="isRecording"
            class="hidden items-center gap-2 text-xs text-[#c43a3a] sm:flex"
            role="status"
          >
            <span class="size-2 animate-pulse rounded-full bg-[#d94747]" />
            Listening
          </span>
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full text-[#777] transition-colors hover:bg-[#f2f2f2] hover:text-[#333] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40"
            :class="isRecording ? 'bg-[#fff0f0] text-[#c43a3a]' : ''"
            :disabled="disabled"
            :aria-label="isRecording ? 'Stop voice input' : 'Start voice input'"
            :title="isRecording ? 'Stop voice input' : 'Start voice input'"
            :aria-pressed="isRecording"
            @click="toggleRecording"
          >
            <Square v-if="isRecording" class="size-4 fill-current" />
            <Mic v-else class="size-5" :stroke-width="2" />
          </button>
          <button
            type="submit"
            class="grid size-11 place-items-center rounded-full bg-[#909090] text-white transition-all hover:bg-[#777] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[#d7d7d7]"
            :disabled="!canSend"
            aria-label="Send message"
            title="Send message"
          >
            <ArrowUp class="size-6" :stroke-width="2" />
          </button>
        </div>
        </div>
      </div>
    </TiptapComposer>
  </section>
</template>

<style scoped>
.message-content :deep(p) {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-content :deep(p + p) {
  margin-top: 0.5rem;
}
</style>
