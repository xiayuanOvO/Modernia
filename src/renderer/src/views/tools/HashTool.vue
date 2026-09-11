<script setup lang="ts">
import { NSpace, NButton, NInput, NSelect, useMessage } from 'naive-ui'
import SparkMD5 from 'spark-md5'
import { usePersistedRef } from '../../utils/persist'

const message = useMessage()
const input = usePersistedRef('tool.hash.input', 'Hello Modernia')
const algo = usePersistedRef<'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'>(
  'tool.hash.algo',
  'MD5',
)
const output = usePersistedRef('tool.hash.output', '')

const algoOptions = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-512', value: 'SHA-512' },
]

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function compute() {
  if (algo.value === 'MD5') {
    const data = new TextEncoder().encode(input.value)
    output.value = SparkMD5.ArrayBuffer.hash(data.buffer as ArrayBuffer)
  } else {
    const data = new TextEncoder().encode(input.value)
    const digest = await crypto.subtle.digest(algo.value, data)
    output.value = toHex(digest)
  }
  message.success('已计算')
}

async function copyHash() {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  message.success('已复制')
}
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 12px" align="center">
      <NSelect v-model:value="algo" :options="algoOptions" style="width: 140px" />
      <NButton type="primary" @click="compute">计算</NButton>
      <NButton secondary :disabled="!output" @click="copyHash">复制结果</NButton>
    </NSpace>

    <div class="label">输入</div>
    <NInput
      v-model:value="input"
      type="textarea"
      :autosize="{ minRows: 8, maxRows: 14 }"
      style="margin-bottom: 16px"
    />

    <div class="label">哈希</div>
    <NInput
      v-model:value="output"
      type="textarea"
      readonly
      placeholder="点击「计算」生成…"
      :autosize="{ minRows: 3, maxRows: 6 }"
      class="mono"
    />
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 720px;
}

.label {
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.7;
}

.mono :deep(textarea) {
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
}
</style>
