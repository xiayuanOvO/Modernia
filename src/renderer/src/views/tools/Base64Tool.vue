<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import {
  NAlert,
  NButton,
  NIcon,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSpace,
  NTabPane,
  NTabs,
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
  downloadDataUrl,
  fileToBase64,
  mimeToExt,
  normalizeImageBase64,
  toImageDataUrl,
  type ImageBase64Format,
} from '../../utils/base64Image'

const message = useMessage()
const tab = usePersistedRef<'text' | 'image'>('tool.base64.tab', 'text')

const plain = usePersistedRef('tool.base64.plain', 'Hello Modernia')
const encoded = usePersistedRef('tool.base64.encoded', '')
const textError = ref('')

const imageFormat = usePersistedRef<ImageBase64Format>(
  'tool.base64.image.format',
  'dataUrl',
)
const imageBase64 = ref('')
const imagePreview = ref('')
const imageName = ref('')
const imageError = ref('')
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function encodeText() {
  try {
    encoded.value = btoa(unescape(encodeURIComponent(plain.value)))
    textError.value = ''
    message.success('已编码')
  } catch (e) {
    textError.value = e instanceof Error ? e.message : '编码失败'
  }
}

function decodeText() {
  try {
    plain.value = decodeURIComponent(escape(atob(encoded.value)))
    textError.value = ''
    message.success('已解码')
  } catch (e) {
    textError.value =
      e instanceof Error ? e.message : '解码失败，请检查 Base64 内容'
  }
}

function revokePreview() {
  if (imagePreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imagePreview.value = ''
}

function clearImage() {
  revokePreview()
  imageBase64.value = ''
  imageName.value = ''
  imageError.value = ''
}

async function processImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    message.warning('请选择图片文件')
    return
  }
  try {
    imageError.value = ''
    imageName.value = file.name
    imageBase64.value = await fileToBase64(file, imageFormat.value)
    revokePreview()
    imagePreview.value = URL.createObjectURL(file)
  } catch (e) {
    imageError.value = e instanceof Error ? e.message : '转换失败'
  }
}

async function onFormatChange(value: string) {
  imageFormat.value = value as ImageBase64Format
  if (!imageBase64.value) return
  try {
    const { mime, base64 } = normalizeImageBase64(imageBase64.value)
    imageBase64.value =
      imageFormat.value === 'dataUrl'
        ? `data:${mime};base64,${base64}`
        : base64
  } catch {
    /* 保持原值 */
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void processImageFile(file)
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void processImageFile(file)
}

function decodeImageBase64() {
  try {
    const dataUrl = toImageDataUrl(imageBase64.value)
    imageError.value = ''
    revokePreview()
    imagePreview.value = dataUrl
    const { mime } = normalizeImageBase64(imageBase64.value)
    if (!imageName.value) {
      imageName.value = `image.${mimeToExt(mime)}`
    }
  } catch (e) {
    imageError.value =
      e instanceof Error ? e.message : '解码失败，请检查 Base64 内容'
  }
}

async function copyImageBase64() {
  if (!imageBase64.value) return
  try {
    await navigator.clipboard.writeText(imageBase64.value)
    message.success('已复制')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '复制失败')
  }
}

function downloadImage() {
  try {
    const dataUrl = imagePreview.value.startsWith('data:')
      ? imagePreview.value
      : toImageDataUrl(imageBase64.value)
    const { mime } = normalizeImageBase64(imageBase64.value || dataUrl)
    const base = imageName.value.replace(/\.[^.]+$/, '') || 'image'
    downloadDataUrl(dataUrl, `${base}.${mimeToExt(mime)}`)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '下载失败')
  }
}

onBeforeUnmount(() => {
  revokePreview()
})
</script>

<template>
  <div class="tool-page">
    <NTabs v-model:value="tab" type="segment" size="small" animated>
      <NTabPane name="text" tab="文本">
        <NAlert
          v-if="textError"
          type="error"
          style="margin-bottom: 12px"
          :title="textError"
        />

        <div class="text-stack">
          <div class="text-field">
            <div class="label">原文</div>
            <NInput
              v-model:value="plain"
              type="textarea"
              :rows="10"
              class="fixed-area"
            />
          </div>

          <div class="text-actions">
            <NButton @click="decodeText">↑ 转文本</NButton>
            <NButton type="primary" @click="encodeText">↓ 转 Base64</NButton>
          </div>

          <div class="text-field">
            <div class="label">Base64</div>
            <NInput
              v-model:value="encoded"
              type="textarea"
              :rows="10"
              class="mono fixed-area"
            />
          </div>
        </div>
      </NTabPane>

      <NTabPane name="image" tab="图片">
        <NSpace
          align="center"
          justify="space-between"
          style="margin-bottom: 12px"
        >
          <NSpace align="center" :size="12">
            <NRadioGroup
              :value="imageFormat"
              size="small"
              @update:value="onFormatChange"
            >
              <NRadioButton value="dataUrl">Data URL</NRadioButton>
              <NRadioButton value="raw">纯 Base64</NRadioButton>
            </NRadioGroup>
            <NButton size="small" @click="fileInput?.click()">
              <template #icon>
                <NIcon :component="ImageOutline" />
              </template>
              选择图片
            </NButton>
            <NButton
              v-if="imagePreview || imageBase64"
              size="small"
              quaternary
              @click="clearImage"
            >
              清空
            </NButton>
          </NSpace>
          <NButton type="primary" size="small" @click="decodeImageBase64">
            Base64 → 图片
          </NButton>
        </NSpace>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          hidden
          @change="onPick"
        >

        <NAlert
          v-if="imageError"
          type="error"
          style="margin-bottom: 12px"
          :title="imageError"
        />

        <div class="split">
          <div>
            <div class="label">图片</div>
            <div
              class="dropzone"
              :class="{ dragging, 'has-file': Boolean(imagePreview) }"
              @dragover.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @drop="onDrop"
              @click="!imagePreview && fileInput?.click()"
            >
              <img
                v-if="imagePreview"
                :src="imagePreview"
                alt="preview"
                class="preview"
              >
              <NText v-else depth="3" style="font-size: 13px">拖入或选择图片</NText>
            </div>
            <NSpace v-if="imagePreview" style="margin-top: 10px">
              <NButton size="small" @click="downloadImage">
                <template #icon>
                  <NIcon :component="CloudDownloadOutline" />
                </template>
                下载图片
              </NButton>
            </NSpace>
          </div>
          <div>
            <div class="label">Base64</div>
            <NInput
              v-model:value="imageBase64"
              type="textarea"
              placeholder="粘贴 Data URL 或纯 Base64"
              :autosize="{ minRows: 12, maxRows: 20 }"
              class="mono"
            />
            <NSpace style="margin-top: 10px">
              <NButton
                size="small"
                :disabled="!imageBase64"
                @click="copyImageBase64"
              >
                <template #icon>
                  <NIcon :component="CopyOutline" />
                </template>
                复制
              </NButton>
            </NSpace>
          </div>
        </div>
      </NTabPane>
    </NTabs>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 1000px;
}

.text-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.text-field {
  width: 100%;
  min-width: 0;
}

.text-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.fixed-area {
  width: 100%;
}

.fixed-area :deep(.n-input) {
  width: 100%;
}

.fixed-area :deep(textarea) {
  height: 220px !important;
  max-height: 220px !important;
  min-height: 220px !important;
  resize: none !important;
  overflow-y: auto !important;
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

.dropzone {
  min-height: 280px;
  display: grid;
  place-items: center;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.dropzone.has-file {
  cursor: default;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.08);
  place-items: center;
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

.preview {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 6px;
}

@media (max-width: 800px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
