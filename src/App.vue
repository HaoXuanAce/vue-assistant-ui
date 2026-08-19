<script setup lang="ts">
import { Archive, ChevronDown, ChevronRight, CircleHelp, Ellipsis, FolderOpen, LogIn, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings, Sparkles, UserRound, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import Thread from '@/components/Thread.vue'
import type { ComposerItem, ComposerTokenRenderer } from '@/components/tiptap'

type Section = 'Today' | 'Yesterday' | 'Previous 7 days'
interface Conversation { id: string; title: string; time: string; section: Section }

const conversations = ref<Conversation[]>([
  { id: '1', title: 'Product launch checklist', time: '10:42', section: 'Today' },
  { id: '2', title: 'Research notes: AI agents', time: '09:18', section: 'Today' },
  { id: '3', title: 'Weekend itinerary', time: 'Yesterday', section: 'Yesterday' },
  { id: '4', title: 'Quick dinner recipes', time: 'Yesterday', section: 'Yesterday' },
  { id: '5', title: 'Portfolio feedback', time: 'Mon', section: 'Previous 7 days' },
])
const activeId = ref('1')
const query = ref('')
const sidebarOpen = ref(false)
const accountOpen = ref(false)
const thread = ref<InstanceType<typeof Thread> | null>(null)

const composerItems: ComposerItem[] = [
  { id: 'weather', trigger: '@', kind: 'mention', label: 'Weather', description: 'Get a city\'s current weather', icon: 'W' },
  { id: 'search', trigger: '@', kind: 'mention', label: 'Web search', description: 'Search public web content', icon: 'S' },
  { id: 'knowledge', trigger: '@', kind: 'mention', label: 'Knowledge base', description: 'Search connected documents', icon: 'K' },
  { id: 'summarize', trigger: '/', kind: 'command', label: 'Summarize', description: 'Create a concise summary', icon: 'S' },
  { id: 'translate', trigger: '/', kind: 'command', label: 'Translate', description: 'Translate the current content', icon: 'T' },
  { id: 'plan', trigger: '/', kind: 'command', label: 'Make a plan', description: 'Create clear execution steps', icon: 'P' },
]

const renderComposerToken: ComposerTokenRenderer = (item) => ({
  label: `${item.trigger}${item.label}`,
  className: item.kind === 'command'
    ? 'mx-0.5 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold leading-5 text-amber-800 ring-1 ring-amber-200'
    : 'mx-0.5 inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold leading-5 text-emerald-800 ring-1 ring-emerald-200',
})

const sections = computed(() => {
  const visible = conversations.value.filter(item => item.title.toLowerCase().includes(query.value.toLowerCase()))
  return (['Today', 'Yesterday', 'Previous 7 days'] as Section[])
    .map(label => ({ label, items: visible.filter(item => item.section === label) }))
    .filter(section => section.items.length)
})

function newChat() {
  const id = String(Date.now())
  conversations.value.unshift({ id, title: 'New conversation', time: 'Now', section: 'Today' })
  activeId.value = id
  thread.value?.clear()
  sidebarOpen.value = false
}
</script>

<template>
  <div class="flex min-h-screen bg-white text-neutral-800">
    <aside
      class="fixed inset-y-0 left-0 z-30 flex w-[min(84vw,280px)] -translate-x-full flex-col border-r border-neutral-200 bg-neutral-50 transition-transform duration-200 md:relative md:w-64 md:translate-x-0"
      :class="sidebarOpen && 'translate-x-0'"
    >
      <div class="px-3 pb-2 pt-4">
        <div class="flex h-9 items-center gap-2 px-2">
          <span class="grid size-7 place-items-center rounded-lg bg-neutral-900 text-white"><Sparkles class="size-4" /></span>
          <strong class="text-sm font-semibold">Assistant</strong>
          <button class="ml-auto grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-200 md:hidden" aria-label="Close sidebar" @click="sidebarOpen = false"><X class="size-4" /></button>
        </div>
        <button class="mt-4 flex h-10 w-full items-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700" @click="newChat">
          <Plus class="size-4" />New chat<span class="ml-auto text-xs font-normal text-neutral-400">⌘ K</span>
        </button>
        <label class="mt-2 flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 focus-within:border-neutral-400">
          <Search class="size-4 text-neutral-400" /><input v-model="query" class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" placeholder="Search chats">
        </label>
      </div>

      <nav class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <p v-if="!sections.length" class="py-8 text-center text-sm text-neutral-400">No conversations found</p>
        <section v-for="section in sections" :key="section.label" class="mb-5">
          <h2 class="mb-1 px-2 text-[11px] font-semibold uppercase text-neutral-400">{{ section.label }}</h2>
          <button
            v-for="item in section.items" :key="item.id"
            class="group flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
            :class="activeId === item.id && 'bg-neutral-200 text-neutral-900'"
            @click="activeId = item.id; sidebarOpen = false"
          >
            <MessageSquare class="size-4 shrink-0 text-neutral-400" /><span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
            <span class="text-[11px] text-neutral-400 group-hover:hidden">{{ item.time }}</span><MoreHorizontal class="hidden size-4 group-hover:block" />
          </button>
        </section>
      </nav>

      <div class="p-3">
        <button class="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-neutral-600 hover:bg-neutral-200"><FolderOpen class="size-4" />Projects</button>
        <button class="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-neutral-600 hover:bg-neutral-200"><Archive class="size-4" />Archived chats</button>
        <div class="my-2 h-px bg-neutral-200" />
        <div class="relative">
          <button class="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-neutral-200" @click="accountOpen = !accountOpen">
            <span class="grid size-8 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">JD</span>
            <span class="flex min-w-0 flex-1 flex-col"><strong class="truncate text-xs">Jordan Davis</strong><small class="text-[11px] text-neutral-400">Free plan</small></span>
            <ChevronDown class="size-4 text-neutral-400 transition-transform" :class="accountOpen && 'rotate-180'" />
          </button>
          <div v-if="accountOpen" class="absolute inset-x-0 bottom-[calc(100%+8px)] z-40 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl" role="menu">
            <div class="flex items-center gap-2 p-2"><span class="grid size-9 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">JD</span><span class="flex min-w-0 flex-col"><strong class="text-xs">Jordan Davis</strong><small class="truncate text-[11px] text-neutral-400">jordan@example.com</small></span></div>
            <div class="my-1 h-px bg-neutral-200" />
            <button class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-xs hover:bg-neutral-100"><LogIn class="size-4" />Log in / switch account<ChevronRight class="ml-auto size-4" /></button>
            <button class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-xs hover:bg-neutral-100"><UserRound class="size-4" />Edit profile<ChevronRight class="ml-auto size-4" /></button>
            <button class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-xs hover:bg-neutral-100"><Settings class="size-4" />Settings<ChevronRight class="ml-auto size-4" /></button>
            <button class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-xs hover:bg-neutral-100"><CircleHelp class="size-4" />Help &amp; support</button>
          </div>
        </div>
      </div>
    </aside>

    <button v-if="sidebarOpen" class="fixed inset-0 z-20 bg-black/20 md:hidden" aria-label="Close sidebar" @click="sidebarOpen = false" />

    <main class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 items-center border-b border-neutral-100 px-4 md:h-16 md:px-6">
        <button class="grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 md:hidden" aria-label="Open sidebar" @click="sidebarOpen = true"><Menu class="size-5" /></button>
        <button class="ml-2 flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-neutral-100 md:ml-0"><span class="size-2 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />Assistant<span class="text-xs font-normal text-neutral-400">2.1</span><ChevronDown class="size-4 text-neutral-400" /></button>
        <button class="ml-auto grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100"><Ellipsis class="size-5" /></button>
        <button class="ml-2 h-9 rounded-lg border border-neutral-200 px-3 text-xs font-medium hover:bg-neutral-50">Share</button>
      </header>
      <section class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-8 md:px-6">
        <div class="flex flex-col items-center text-center">
          <span class="mb-4 grid size-12 place-items-center rounded-xl bg-neutral-900 text-white shadow-lg"><Sparkles class="size-6" /></span>
          <h1 class="text-2xl font-semibold md:text-3xl">What can I help with?</h1>
          <p class="mt-2 text-sm text-neutral-400">Ask anything to start a new conversation.</p>
        </div>
        <Thread
          ref="thread"
          class="w-full"
          :composer-items="composerItems"
          :token-renderer="renderComposerToken"
        />
      </section>
      <footer class="pb-3 text-center text-[11px] text-neutral-400">Assistant can make mistakes. Check important info.</footer>
    </main>
  </div>
</template>
