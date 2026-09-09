<script setup lang="ts">
import { ref } from 'vue'
import { NSpace, NButton, NInput, NAlert, useMessage } from 'naive-ui'

const message = useMessage()
const plain = ref('Hello Modernia')
const encoded = ref('')
const error = ref('')

function encode() {
  try {
    encoded.value = btoa(unescape(encodeURIComponent(plain.value)))
    error.value = ''
    message.success('已编码')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '编码失败'
  }
}

function decode() {
  try {
    plain.value = decodeURIComponent(escape(atob(encoded.value)))
    error.value = ''
    message.success('已解码')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解码失败，请检查 Base64 内容'
  }
}
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 12px">
      <NButton type="primary" @click="encode">编码 →</NButton>
      <NButton @click="decode">← 解码</NButton>
    </NSpace>

    <NAlert v-if="error" type="error" style="margin-bottom: 12px" :title="error" />

    <div class="split">
      <div>
        <div class="label">原文</div>
        <NInput
          v-model:value="plain"
          type="textarea"
          :autosize="{ minRows: 12, maxRows: 20 }"
        />
      </div>
      <div>
        <div class="label">Base64</div>
        <NInput
          v-model:value="encoded"
          type="textarea"
          :autosize="{ minRows: 12, maxRows: 20 }"
          class="mono"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 1000px;
}

.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.label {
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.7;
}

.mono :deep(textarea) {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
}

@media (max-width: 800px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
