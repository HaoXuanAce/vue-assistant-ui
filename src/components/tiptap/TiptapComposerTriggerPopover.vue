<script setup lang="ts">
import { computed } from 'vue'
import { useTiptapComposer } from './context'
import type { ComposerTrigger } from './types'

const props = defineProps<{
  trigger: ComposerTrigger
  title?: string
}>()

const composer = useTiptapComposer()
const title = computed(() => props.title ?? (props.trigger === '@' ? 'Mention' : 'Commands'))
const visible = computed(() => composer.menuOpen.value && composer.activeTrigger.value === props.trigger)
</script>

<template>
  <div
    v-if="visible"
    class="fixed z-50 w-[min(20rem,calc(100vw-2rem))] -translate-y-full overflow-hidden rounded-lg border border-neutral-200 bg-white p-1.5 text-neutral-800 shadow-xl"
    :style="{ top: `${composer.menuPosition.value.top - 10}px`, left: `${composer.menuPosition.value.left}px` }"
    role="listbox"
    :aria-label="title"
  >
    <div class="flex items-center justify-between px-2 py-1.5">
      <slot name="header" :query="composer.activeQuery.value">
        <span class="text-xs font-semibold text-neutral-500">{{ title }}</span>
        <kbd class="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400">ESC</kbd>
      </slot>
    </div>

    <div v-if="composer.filteredItems.value.length" class="grid max-h-64 gap-0.5 overflow-y-auto">
      <button
        v-for="(item, index) in composer.filteredItems.value"
        :key="`${item.trigger}-${item.id}`"
        type="button"
        class="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors"
        :class="index === composer.highlightedIndex.value ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'"
        role="option"
        :aria-selected="index === composer.highlightedIndex.value"
        @mousedown.prevent="composer.selectItem(item)"
      >
        <slot name="item" :item="item" :active="index === composer.highlightedIndex.value">
          <span
            class="grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold"
            :class="item.kind === 'command' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
          >
            {{ item.icon || item.trigger }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium">{{ item.label }}</span>
            <span v-if="item.description" class="mt-0.5 block truncate text-xs text-neutral-400">{{ item.description }}</span>
          </span>
        </slot>
      </button>
    </div>

    <slot v-else name="empty" :query="composer.activeQuery.value">
      <p class="px-3 py-5 text-center text-xs text-neutral-400">No matching items</p>
    </slot>
  </div>
</template>
