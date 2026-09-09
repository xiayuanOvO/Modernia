<script setup lang="ts">
import { ref } from 'vue'
import { NSpace, NButton, NInput, NAlert, useMessage } from 'naive-ui'

const message = useMessage()
const input = ref('{\n  "hello": "world"\n}')
const error = ref('')

function formatJson() {
  try {
    input.value = JSON.stringify(JSON.parse(input.value), null, 2)
    error.value = ''
    message.success('已格式化')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'JSON 无效'
  }
}

function minifyJson() {
  try {
    input.value = JSON.stringify(JSON.parse(input.value))
    error.value = ''
    message.success('已压缩')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'JSON 无效'
  }
}

async function copyResult() {
  await navigator.clipboard.writeText(input.value)
  message.success('已复制')
}
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 12px">
      <NButton type="primary" @click="formatJson">格式化</NButton>
      <NButton @click="minifyJson">压缩</NButton>
      <NButton secondary @click="copyResult">复制</NButton>
    </NSpace>

    <NAlert v-if="error" type="error" style="margin-bottom: 12px" :title="error" />

    <NInput
      v-model:value="input"
      type="textarea"
      placeholder="粘贴 JSON…"
      :autosize="{ minRows: 16, maxRows: 28 }"
      class="mono"
    />
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 900px;
}

.mono :deep(textarea) {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
}
</style>
