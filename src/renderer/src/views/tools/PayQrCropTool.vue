<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import {
  NButton,
  NCheckbox,
  NIcon,
  NSpace,
  NSpin,
  NText,
  useMessage,
} from 'naive-ui'
import {
  CloudDownloadOutline,
  CopyOutline,
  ImageOutline,
} from '@vicons/ionicons5'
import { usePersistedRef } from '../../utils/persist'
import {
  cropPayQrFromFile,
  downloadBlob,
  platformLabel,
  type PayCropResult,
} from '../../utils/payQrCrop'

const message = useMessage()
const keepName = usePersistedRef('tool.pay-qr.keepName', true)
const busy = ref(false)
const dragging = ref(false)
const sourceUrl = ref('')
const sourceName = ref('')
const result = ref<PayCropResult | null>(null)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
let sourceFile: File | null = null

function revokeSource() {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = ''
}

function clearAll() {
  revokeSource()
  sourceFile = null
  sourceName.value = ''
  result.value = null
  error.value = ''
}

async function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    message.warning('请选择图片文件')
    return
  }
  clearAll()
  sourceFile = file
  sourceName.value = file.name
  sourceUrl.value = URL.createObjectURL(file)
  busy.value = true
  error.value = ''
  try {
    result.value = await cropPayQrFromFile(file, {
      keepName: keepName.value,
    })
  } catch (e) {
    result.value = null
    error.value = e instanceof Error ? e.message : '裁剪失败'
  } finally {
    busy.value = false
  }
}

async function reprocess() {
  if (!sourceFile) return
  busy.value = true
  error.value = ''
  try {
    result.value = await cropPayQrFromFile(sourceFile, {
      keepName: keepName.value,
    })
  } catch (e) {
    result.value = null
    error.value = e instanceof Error ? e.message : '裁剪失败'
  } finally {
    busy.value = false
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void processFile(file)
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void processFile(file)
}

function onDropzoneClick() {
  if (!sourceUrl.value) fileInput.value?.click()
}

function onKeepNameChange(value: boolean) {
  keepName.value = value
  if (sourceFile) void reprocess()
}

function downloadResult() {
  if (!result.value) return
  const base = sourceName.value.replace(/\.[^.]+$/, '') || 'pay-qr'
  downloadBlob(result.value.blob, `${base}-card.png`)
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': result.value.blob }),
    ])
    message.success('已复制图片')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '复制失败')
  }
}

onBeforeUnmount(() => {
  revokeSource()
})
</script>

<template>
  <div class="tool-page">
    <NSpace align="center" justify="space-between" style="margin-bottom: 14px">
      <NCheckbox :checked="keepName" @update:checked="onKeepNameChange">
        保留名字
      </NCheckbox>
      <NSpace>
        <NButton size="small" @click="fileInput?.click()">
          <template #icon>
            <NIcon :component="ImageOutline" />
          </template>
          选择图片
        </NButton>
        <NButton v-if="sourceUrl" size="small" quaternary @click="clearAll">
          清空
        </NButton>
      </NSpace>
    </NSpace>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      hidden
      @change="onPick"
    >

    <div
      class="dropzone"
      :class="{ dragging, 'has-file': Boolean(sourceUrl) }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
      @click="onDropzoneClick"
    >
      <NSpin :show="busy">
        <div v-if="sourceUrl" class="compare">
          <div class="pane">
            <div class="pane-label">原图</div>
            <img :src="sourceUrl" alt="source" class="pane-img" />
          </div>
          <div class="pane">
            <div class="pane-label">
              结果
              <span v-if="result" class="meta">{{ platformLabel(result.platform) }}</span>
            </div>
            <img
              v-if="result"
              :src="result.dataUrl"
              alt="result"
              class="pane-img result"
            />
            <NText v-else-if="error" type="error" style="font-size: 13px">{{ error }}</NText>
            <NText v-else depth="3" style="font-size: 13px">—</NText>
          </div>
        </div>
        <NText v-else depth="3" style="font-size: 13px">微信 / 支付宝收款码截图</NText>
      </NSpin>
    </div>

    <NSpace v-if="result" style="margin-top: 14px">
      <NButton type="primary" @click="downloadResult">
        <template #icon>
          <NIcon :component="CloudDownloadOutline" />
        </template>
        下载
      </NButton>
      <NButton @click="copyResult">
        <template #icon>
          <NIcon :component="CopyOutline" />
        </template>
        复制图片
      </NButton>
    </NSpace>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 880px;
}

.dropzone {
  min-height: 220px;
  display: grid;
  place-items: center;
  padding: 16px;
  border-radius: 10px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dropzone.has-file {
  cursor: default;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.08);
  place-items: start stretch;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: rgba(47, 111, 237, 0.5);
  background: rgba(47, 111, 237, 0.04);
}

.dropzone.has-file:hover {
  background: transparent;
  border-color: rgba(0, 0, 0, 0.08);
}

.compare {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.pane {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pane-label {
  font-size: 13px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta {
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(47, 111, 237, 0.1);
  color: #2f6fed;
}

.pane-img {
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
}

.pane-img.result {
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

@media (max-width: 640px) {
  .compare {
    grid-template-columns: 1fr;
  }
}
</style>
