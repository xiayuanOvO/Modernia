<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NIcon,
  NInput,
  NProgress,
  NSpace,
  NSpin,
  NText,
  useMessage,
} from 'naive-ui'
import { DocumentOutline } from '@vicons/ionicons5'

interface FileHashResult {
  fileName: string
  filePath: string
  size: number
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

const message = useMessage()
const loading = ref(false)
const progress = ref(0)
const error = ref('')
const result = ref<FileHashResult | null>(null)
const dragging = ref(false)
const expectHash = ref('')

let stopProgress: (() => void) | null = null

const hashRows = computed(() => {
  if (!result.value) return []
  const r = result.value
  return [
    { label: 'MD5', value: r.md5 },
    { label: 'SHA-1', value: r.sha1 },
    { label: 'SHA-256', value: r.sha256 },
    { label: 'SHA-512', value: r.sha512 },
  ]
})

const expectNormalized = computed(() =>
  expectHash.value.replace(/[\s:]/g, '').toLowerCase(),
)

const expectMatch = computed(() => {
  const expect = expectNormalized.value
  if (!expect || !result.value) return null
  for (const row of hashRows.value) {
    if (row.value === expect) return row.label
  }
  return false as const
})

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function runHash(filePath: string) {
  if (!window.fileHashApi) {
    message.error('当前环境不支持文件哈希（需在 Electron 中运行）')
    return
  }
  loading.value = true
  progress.value = 0
  error.value = ''
  result.value = null
  try {
    const res = await window.fileHashApi.hashPath(filePath)
    if ('error' in res) {
      error.value = res.error
      return
    }
    result.value = res
  } catch (e) {
    error.value = e instanceof Error ? e.message : '计算失败'
  } finally {
    loading.value = false
    progress.value = 0
  }
}

async function selectFile() {
  if (!window.fileHashApi) {
    message.error('当前环境不支持选择本地文件（需在 Electron 中运行）')
    return
  }
  loading.value = true
  progress.value = 0
  error.value = ''
  try {
    const res = await window.fileHashApi.selectAndHash()
    if ('canceled' in res && res.canceled) return
    if ('error' in res && res.error) {
      error.value = res.error
      result.value = null
      return
    }
    if ('fileName' in res) {
      result.value = res
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '计算失败'
    result.value = null
  } finally {
    loading.value = false
    progress.value = 0
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  if (loading.value) return
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const filePath = window.fileHashApi?.pathForFile(file) || ''
  if (!filePath) {
    message.error('无法读取文件路径，请改用「选择文件」')
    return
  }
  void runHash(filePath)
}

async function copyText(text: string, label: string) {
  await navigator.clipboard.writeText(text)
  message.success(`已复制${label}`)
}

async function copyAll() {
  if (!result.value) return
  const lines = [
    `文件：${result.value.fileName}`,
    `大小：${formatSize(result.value.size)}`,
    ...hashRows.value.map((row) => `${row.label}：${row.value}`),
  ]
  await navigator.clipboard.writeText(lines.join('\n'))
  message.success('已复制全部')
}

onMounted(() => {
  if (!window.fileHashApi) return
  stopProgress = window.fileHashApi.onProgress((pct) => {
    progress.value = pct
  })
})

onBeforeUnmount(() => {
  stopProgress?.()
  stopProgress = null
})
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 12px">
      <NButton type="primary" :loading="loading" @click="selectFile">选择文件</NButton>
      <NButton secondary :disabled="!result" @click="copyAll">复制全部</NButton>
    </NSpace>

    <div
      class="dropzone"
      :class="{ dragging, disabled: loading, filled: !!result }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
      @click="selectFile"
    >
      <NIcon :component="DocumentOutline" :size="result ? 22 : 28" class="drop-icon" />
      <div v-if="result" class="drop-meta">
        <div class="drop-name">{{ result.fileName }}</div>
        <div class="drop-size">{{ formatSize(result.size) }}</div>
      </div>
    </div>

    <NProgress
      v-if="loading"
      type="line"
      :percentage="progress"
      :show-indicator="true"
      style="margin-bottom: 12px"
    />

    <NSpin :show="loading && progress === 0">
      <NAlert v-if="error" type="error" style="margin-bottom: 12px" :title="error" />

      <template v-if="result">
        <NDescriptions bordered :column="1" label-placement="left" size="small">
          <NDescriptionsItem v-for="row in hashRows" :key="row.label" :label="row.label">
            <div class="row">
              <span class="mono" :class="{ match: expectMatch === row.label }">
                {{ row.value }}
              </span>
              <NButton text type="primary" size="tiny" @click="copyText(row.value, row.label)">
                复制
              </NButton>
            </div>
          </NDescriptionsItem>
        </NDescriptions>

        <div class="expect">
          <NText depth="3" class="expect-label">校验</NText>
          <NInput
            v-model:value="expectHash"
            size="small"
            clearable
            placeholder="粘贴期望哈希"
            class="mono-input"
          />
          <NText v-if="expectMatch" type="success" class="expect-status">
            匹配 {{ expectMatch }}
          </NText>
          <NText
            v-else-if="expectNormalized.length > 0"
            type="error"
            class="expect-status"
          >
            不匹配
          </NText>
        </div>
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 820px;
}

.dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 88px;
  margin-bottom: 16px;
  padding: 16px 20px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dropzone.filled {
  justify-content: flex-start;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.08);
}

.drop-icon {
  flex-shrink: 0;
  color: #2f6fed;
  opacity: 0.7;
}

.dropzone.filled .drop-icon {
  opacity: 1;
}

.drop-meta {
  min-width: 0;
}

.drop-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drop-size {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.55;
}

.dropzone.dragging {
  border-color: #2f6fed;
  background: rgba(47, 111, 237, 0.06);
}

.dropzone.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mono {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
  line-height: 1.5;
}

.mono.match {
  color: #18a058;
  font-weight: 600;
}

.expect {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.expect-label {
  font-size: 13px;
}

.expect-status {
  font-size: 13px;
}

.mono-input {
  flex: 1;
  min-width: 200px;
}

.mono-input :deep(input) {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
