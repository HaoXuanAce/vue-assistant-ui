<script setup lang="ts">
import { Editor, Node as TiptapNode } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { TiptapComposerKey } from './context'
import type { ComposerItem, ComposerSubmitPayload, ComposerTokenRenderer, ComposerTrigger } from './types'

interface Props {
  html?: string
  items?: ComposerItem[]
  placeholder?: string
  disabled?: boolean
  submitOnEmpty?: boolean
  tokenRenderer?: ComposerTokenRenderer
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  placeholder: 'Send a message... Type @ to mention or / for commands',
  disabled: false,
  submitOnEmpty: false,
})

const emit = defineEmits<{
  'update:html': [html: string]
  submit: [payload: ComposerSubmitPayload]
}>()

function createComposerToken(renderer?: ComposerTokenRenderer) {
  return TiptapNode.create({
    name: 'composerToken',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
      return {
        id: { default: '' },
        trigger: { default: '@' },
        kind: { default: 'mention' },
        label: { default: '' },
        description: { default: '' },
        icon: { default: '' },
        data: { default: null },
      }
    },

    parseHTML() {
      return [{
        tag: 'span[data-composer-token]',
        getAttrs: (element) => {
          const token = element as HTMLElement
          return {
            id: token.dataset.composerToken ?? '',
            trigger: token.dataset.tokenTrigger ?? '@',
            kind: token.dataset.tokenKind ?? 'mention',
            label: token.dataset.tokenLabel ?? token.textContent?.trim() ?? '',
            description: token.dataset.tokenDescription ?? '',
            icon: token.dataset.tokenIcon ?? '',
          }
        },
      }]
    },

    renderHTML({ node }) {
      const item: ComposerItem = {
        id: node.attrs.id,
        trigger: node.attrs.trigger,
        kind: node.attrs.kind,
        label: node.attrs.label,
        description: node.attrs.description,
        icon: node.attrs.icon,
        data: node.attrs.data,
      }
      const custom = renderer?.(item)
      const defaultClass = item.kind === 'command'
        ? 'mx-0.5 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold leading-5 text-amber-800 ring-1 ring-amber-200'
        : 'mx-0.5 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold leading-5 text-emerald-800 ring-1 ring-emerald-200'
      const attributes = {
        ...custom?.attributes,
        'data-composer-token': item.id,
        'data-token-trigger': item.trigger,
        'data-token-kind': item.kind,
        'data-token-label': item.label,
        'data-token-description': item.description ?? '',
        'data-token-icon': item.icon ?? '',
        class: custom?.className ?? defaultClass,
      }
      const icon = custom?.icon ?? item.icon ?? ''
      const label = custom?.label ?? item.label

      return ['span', attributes, `${icon}${icon ? ' ' : ''}${label}`]
    },
  })
}

const root = useTemplateRef<HTMLFormElement>('root')
const editor = shallowRef<Editor | null>(null)
const rootElement = shallowRef<HTMLElement | null>(null)
const activeTrigger = shallowRef<ComposerTrigger | null>(null)
const activeQuery = shallowRef('')
const activeRange = shallowRef<{ from: number; to: number } | null>(null)
const highlightedIndex = shallowRef(0)
const menuPosition = shallowRef({ top: 0, left: 0 })

const menuOpen = computed(() => activeTrigger.value !== null)
const filteredItems = computed(() => {
  if (!activeTrigger.value) return []
  const query = activeQuery.value.toLocaleLowerCase()
  return props.items.filter((item) => {
    if (item.trigger !== activeTrigger.value) return false
    if (!query) return true
    return [item.id, item.label, item.description ?? ''].some((value) => value.toLocaleLowerCase().includes(query))
  })
})
const canSend = computed(() => Boolean(!props.disabled && editor.value && (props.submitOnEmpty || !editor.value.isEmpty)))

function closeMenu() {
  activeTrigger.value = null
  activeQuery.value = ''
  activeRange.value = null
  highlightedIndex.value = 0
}

function syncTriggerMenu() {
  const currentEditor = editor.value
  if (!currentEditor || props.disabled) {
    closeMenu()
    return
  }

  const { selection } = currentEditor.state
  if (!selection.empty) {
    closeMenu()
    return
  }

  const { $from } = selection
  const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, '\n', '\n')
  const match = textBeforeCursor.match(/(^|\s)([@/])([^\s]*)$/)
  if (!match) {
    closeMenu()
    return
  }

  const trigger = match[2] as ComposerTrigger
  const triggerOffset = (match.index ?? 0) + match[1].length
  activeTrigger.value = trigger
  activeQuery.value = match[3]
  activeRange.value = { from: $from.start() + triggerOffset, to: selection.from }
  highlightedIndex.value = Math.min(highlightedIndex.value, Math.max(filteredItems.value.length - 1, 0))

  const cursor = currentEditor.view.coordsAtPos(selection.from)
  menuPosition.value = {
    top: cursor.top,
    left: Math.max(16, Math.min(cursor.left, window.innerWidth - 336)),
  }
}

function selectItem(item: ComposerItem) {
  const currentEditor = editor.value
  const range = activeRange.value
  if (!currentEditor || !range) return

  currentEditor.chain().focus().insertContentAt({ from: range.from, to: range.to }, [
    { type: 'composerToken', attrs: item },
    { type: 'text', text: ' ' },
  ]).run()
  closeMenu()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing) return false

  if (menuOpen.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, Math.max(filteredItems.value.length - 1, 0))
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      return true
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const item = filteredItems.value[highlightedIndex.value]
      if (item) selectItem(item)
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return true
    }
  }

  if (event.key === 'Enter' && !event.shiftKey && canSend.value) {
    event.preventDefault()
    submit()
    return true
  }

  return false
}

function submit() {
  const currentEditor = editor.value
  if (!currentEditor || !canSend.value) return
  emit('submit', {
    html: currentEditor.getHTML(),
    json: currentEditor.getJSON(),
    text: currentEditor.getText({ blockSeparator: '\n' }),
  })
  closeMenu()
}

function clearContent() {
  editor.value?.commands.clearContent()
  editor.value?.commands.focus()
  closeMenu()
}

function focus() {
  editor.value?.commands.focus()
}

const context = {
  editor,
  rootElement,
  activeTrigger,
  activeQuery,
  activeRange,
  highlightedIndex,
  menuPosition,
  menuOpen,
  filteredItems,
  canSend,
  closeMenu,
  selectItem,
  submit,
}

provide(TiptapComposerKey, context)

defineExpose({
  editor,
  getHTML: () => editor.value?.getHTML() ?? '',
  getJSON: () => editor.value?.getJSON() ?? { type: 'doc', content: [] },
  getText: () => editor.value?.getText({ blockSeparator: '\n' }) ?? '',
  clearContent,
  focus,
})

watch([activeTrigger, activeQuery], () => {
  highlightedIndex.value = 0
})

watch(() => props.html, (html) => {
  if (editor.value && html !== undefined && html !== editor.value.getHTML()) {
    editor.value.commands.setContent(html, { emitUpdate: false })
  }
})

onMounted(() => {
  rootElement.value = root.value
  const instance = new Editor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: props.placeholder }),
      createComposerToken(props.tokenRenderer),
    ],
    content: props.html || '<p></p>',
    editable: !props.disabled,
    editorProps: {
      attributes: {
        class: 'min-h-16 max-h-44 overflow-y-auto px-3 py-1 text-[18px] leading-7 text-[#242424] outline-none sm:text-[19px]',
        spellcheck: 'false',
        'aria-label': props.placeholder,
      },
      handleKeyDown: (_view, event) => handleKeydown(event),
    },
  })

  editor.value = instance
  instance.on('update', () => {
    syncTriggerMenu()
    emit('update:html', instance.getHTML())
  })
  instance.on('selectionUpdate', syncTriggerMenu)
})

watch(() => props.disabled, (disabled) => {
  editor.value?.setEditable(!disabled)
  if (disabled) closeMenu()
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <form ref="root" class="relative" @submit.prevent="submit">
    <slot :editor="editor" :active-trigger="activeTrigger" />
  </form>
</template>

<style scoped>
:deep(.ProseMirror) {
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.ProseMirror p) {
  margin: 0;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  float: left;
  height: 0;
  color: #aaa;
  content: attr(data-placeholder);
  pointer-events: none;
}
</style>
