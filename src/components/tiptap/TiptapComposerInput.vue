<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { useTiptapComposer } from './context'

const { editor } = useTiptapComposer()
</script>

<template>
  <EditorContent v-if="editor" :editor="editor" />
</template>
