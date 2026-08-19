import type { Editor } from '@tiptap/vue-3'
import { inject, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue'
import type { ComposerItem, ComposerTrigger } from './types'

export interface TiptapComposerContext {
  editor: ShallowRef<Editor | null>
  rootElement: ShallowRef<HTMLElement | null>
  activeTrigger: ShallowRef<ComposerTrigger | null>
  activeQuery: ShallowRef<string>
  activeRange: ShallowRef<{ from: number; to: number } | null>
  highlightedIndex: ShallowRef<number>
  menuPosition: ShallowRef<{ top: number; left: number }>
  menuOpen: ComputedRef<boolean>
  filteredItems: ComputedRef<ComposerItem[]>
  canSend: ComputedRef<boolean>
  closeMenu: () => void
  selectItem: (item: ComposerItem) => void
  submit: () => void
}

export const TiptapComposerKey: InjectionKey<TiptapComposerContext> = Symbol('tiptap-composer')

export function useTiptapComposer() {
  const context = inject(TiptapComposerKey)
  if (!context) {
    throw new Error('Tiptap composer primitives must be used inside <TiptapComposer>.')
  }
  return context
}
