import type { JSONContent } from '@tiptap/core'

export type ComposerTrigger = '@' | '/'
export type ComposerTokenKind = 'mention' | 'command'

export interface ComposerItem {
  id: string
  trigger: ComposerTrigger
  kind: ComposerTokenKind
  label: string
  description?: string
  icon?: string
  data?: Record<string, unknown>
}

export interface ComposerTokenRender {
  label?: string
  icon?: string
  className?: string
  attributes?: Record<string, string>
}

export type ComposerTokenRenderer = (item: ComposerItem) => ComposerTokenRender

export interface ComposerSubmitPayload {
  html: string
  json: JSONContent
  text: string
}
