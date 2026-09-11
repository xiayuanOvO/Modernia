<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  NButton,
  NSelect,
  NSlider,
  NSpace,
  NSpin,
  NText,
  useMessage,
} from 'naive-ui'
import Compressor from 'compressorjs'
import { usePersistedRef } from '../../utils/persist'

type OutputFormat = 'keep' | 'image/webp' | 'image/jpeg' | 'image/png'

interface ImageItem {
  id: string
  file: File
  previewUrl: string
  result?: Blob
  resultUrl?: string
  resultName?: string
  error?: string
}

const message = useMessage()
const items = ref<ImageItem[]>([])
const dragging = ref(false)
const busy = ref(false)
const format = usePersistedRef<OutputFormat>('tool.image.format', 'image/webp')
const quality = usePersistedRef('tool.image.quality', 0.8)

const formatOptions = [
  { label: 'WebP', value: 'image/webp' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: '保持原格式', value: 'keep' },
]

const qualityEnabled = computed(
  () => format.value === 'image/webp' || format.value === 'image/jpeg',
)

const doneCount = computed(() => items.value.filter((i) => i.result).length)

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function extForMime(mime: string, fallbackName: string) {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  const m = fallbackName.match(/\.([^.]+)$/)
  return m?.[1]?.toLowerCase() || 'img'
}

function outputName(file: File, mime: string) {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}.${extForMime(mime, file.name)}`
}

function revokeItem(item: ImageItem) {
  URL.revokeObjectURL(item.previewUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
}

function clearItems() {
  for (const item of items.value) revokeItem(item)
  items.value = []
}

function addFiles(fileList: FileList | File[]) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'))
  if (files.length === 0) {
    message.warning('请选择图片文件')
    return
  }
  for (const file of files) {
    items.value.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    })
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) addFiles(input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
}

function compressOne(file: File): Promise<Blob> {
  const mimeType = format.value === 'keep' ? undefined : format.value
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: quality.value,
      mimeType,
      convertTypes: ['image/png', 'image/webp', 'image/jpeg'],
      success: (result) => resolve(result),
      error: (err) => reject(err),
    })
  })
}

async function convertAll() {
  if (items.value.length === 0) {
    message.warning('请先添加图片')
    return
  }
  busy.value = true
  try {
    for (const item of items.value) {
      item.error = undefined
      if (item.resultUrl) {
        URL.revokeObjectURL(item.resultUrl)
        item.resultUrl = undefined
      }
      try {
        const blob = await compressOne(item.file)
        item.result = blob
        item.resultUrl = URL.createObjectURL(blob)
        item.resultName = outputName(item.file, blob.type || item.file.type)
      } catch (e) {
        item.error = e instanceof Error ? e.message : '处理失败'
        item.result = undefined
      }
    }
    message.success(`完成 ${doneCount.value}/${items.value.length}`)
  } finally {
    busy.value = false
  }
}

function downloadOne(item: ImageItem) {
  if (!item.result || !item.resultUrl || !item.resultName) return
  const a = document.createElement('a')
  a.href = item.resultUrl
  a.download = item.resultName
  a.click()
}

function downloadAll() {
  const ready = items.value.filter((i) => i.result && i.resultUrl && i.resultName)
  if (ready.length === 0) return
  for (const item of ready) downloadOne(item)
}

onBeforeUnmount(() => {
  clearItems()
})
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 12px" align="center" wrap>
      <NSelect v-model:value="format" :options="formatOptions" style="width: 140px" />
      <div v-if="qualityEnabled" class="quality">
        <NText depth="3" style="font-size: 13px; white-space: nowrap">
          质量 {{ Math.round(quality * 100) }}%
        </NText>
        <NSlider v-model:value="quality" :min="0.1" :max="1" :step="0.05" style="width: 140px" />
      </div>
      <NButton type="primary" :loading="busy" :disabled="items.length === 0" @click="convertAll">
        转换
      </NButton>
      <NButton secondary :disabled="doneCount === 0" @click="downloadAll">全部下载</NButton>
      <NButton quaternary :disabled="items.length === 0 || busy" @click="clearItems">清空</NButton>
    </NSpace>

    <div
      class="dropzone"
      :class="{ dragging, disabled: busy }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <input
        class="file-input"
        type="file"
        accept="image/*"
        multiple
        :disabled="busy"
        @change="onPick"
      />
      <NButton type="primary" secondary :disabled="busy">选择图片</NButton>
    </div>

    <NSpin :show="busy">
      <div v-if="items.length" class="list">
        <div v-for="item in items" :key="item.id" class="row">
          <img class="thumb" :src="item.previewUrl" :alt="item.file.name" />
          <div class="meta">
            <div class="name">{{ item.file.name }}</div>
            <NText depth="3" style="font-size: 12px">
              {{ formatSize(item.file.size) }}
              <template v-if="item.result">
                → {{ formatSize(item.result.size) }}
                <template v-if="item.result.size < item.file.size">
                  （-{{ Math.round((1 - item.result.size / item.file.size) * 100) }}%）
                </template>
              </template>
            </NText>
            <NText v-if="item.error" type="error" style="font-size: 12px">{{ item.error }}</NText>
          </div>
          <NButton
            size="small"
            secondary
            :disabled="!item.result"
            @click="downloadOne(item)"
          >
            下载
          </NButton>
        </div>
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 820px;
}

.quality {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
}

.dropzone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  margin-bottom: 16px;
  border: 1px dashed var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color-embedded, transparent);
  transition: border-color 0.15s, background 0.15s;
}

.dropzone.dragging {
  border-color: #2f6fed;
  background: rgba(47, 111, 237, 0.06);
}

.dropzone.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
}

.thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  background: rgba(127, 127, 127, 0.12);
}

.meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
