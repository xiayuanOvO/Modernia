<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NButton,
  NIcon,
  NInput,
  NInputNumber,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NText,
  useMessage,
} from 'naive-ui'
import {
  ClipboardOutline,
  CloudDownloadOutline,
  CopyOutline,
  ImageOutline,
} from '@vicons/ionicons5'
import { usePersistedRef } from '../../utils/persist'
import {
  BARCODE_FORMAT_OPTIONS,
  QR_ECC_OPTIONS,
  copyDataUrlImage,
  decodeFromClipboardImage,
  decodeFromFile,
  downloadDataUrl,
  generateBarcodeDataUrl,
  generateQrDataUrl,
  type BarcodeFormat,
  type CodeKind,
  type DecodeResult,
  type QrEcc,
} from '../../utils/barcode'

const message = useMessage()

const tab = usePersistedRef<'generate' | 'decode'>('tool.barcode.tab', 'generate')
const kind = usePersistedRef<CodeKind>('tool.barcode.kind', 'qr')
const content = usePersistedRef('tool.barcode.content', '')

const qrSize = usePersistedRef('tool.barcode.qr.size', 256)
const qrMargin = usePersistedRef('tool.barcode.qr.margin', 2)
const qrEcc = usePersistedRef<QrEcc>('tool.barcode.qr.ecc', 'M')

const barcodeFormat = usePersistedRef<BarcodeFormat>('tool.barcode.format', 'CODE128')
const barcodeDisplay = usePersistedRef('tool.barcode.displayValue', true)
const barcodeWidth = usePersistedRef('tool.barcode.barWidth', 2)
const barcodeHeight = usePersistedRef('tool.barcode.height', 80)

const previewUrl = ref('')
const genError = ref('')
const decoding = ref(false)
const decodePreview = ref('')
const decodeResult = ref<DecodeResult | null>(null)
const decodeError = ref('')
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const eccOptions = QR_ECC_OPTIONS
const formatOptions = BARCODE_FORMAT_OPTIONS

const canGenerate = computed(() => content.value.trim().length > 0)

async function refreshPreview() {
  genError.value = ''
  if (!canGenerate.value) {
    previewUrl.value = ''
    return
  }
  try {
    if (kind.value === 'qr') {
      previewUrl.value = await generateQrDataUrl(content.value, {
        size: qrSize.value,
        margin: qrMargin.value,
        ecc: qrEcc.value,
        dark: '#000000',
        light: '#ffffff',
      })
    } else {
      previewUrl.value = generateBarcodeDataUrl(content.value, {
        format: barcodeFormat.value,
        displayValue: barcodeDisplay.value,
        width: barcodeWidth.value,
        height: barcodeHeight.value,
        margin: 10,
        lineColor: '#000000',
        background: '#ffffff',
      })
    }
  } catch (e) {
    previewUrl.value = ''
    genError.value = e instanceof Error ? e.message : '生成失败'
  }
}

watch(
  [kind, content, qrSize, qrMargin, qrEcc, barcodeFormat, barcodeDisplay, barcodeWidth, barcodeHeight],
  () => {
    void refreshPreview()
  },
  { immediate: true },
)

function downloadPreview() {
  if (!previewUrl.value) return
  const name = kind.value === 'qr' ? 'qrcode.png' : `barcode-${barcodeFormat.value}.png`
  downloadDataUrl(previewUrl.value, name)
}

async function copyPreview() {
  if (!previewUrl.value) return
  try {
    await copyDataUrlImage(previewUrl.value)
    message.success('已复制图片')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '复制失败')
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  message.success('已复制')
}

function clearDecode() {
  if (decodePreview.value) URL.revokeObjectURL(decodePreview.value)
  decodePreview.value = ''
  decodeResult.value = null
  decodeError.value = ''
}

async function runDecode(file: File) {
  clearDecode()
  decoding.value = true
  decodePreview.value = URL.createObjectURL(file)
  try {
    decodeResult.value = await decodeFromFile(file)
    decodeError.value = ''
  } catch (e) {
    decodeResult.value = null
    decodeError.value = e instanceof Error ? e.message : '解码失败'
  } finally {
    decoding.value = false
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void runDecode(file)
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) void runDecode(file)
}

async function pasteDecode() {
  decoding.value = true
  decodeError.value = ''
  try {
    const result = await decodeFromClipboardImage()
    if (!result) {
      message.warning('剪贴板中没有图片')
      return
    }
    clearDecode()
    decodeResult.value = result
  } catch (e) {
    decodeError.value = e instanceof Error ? e.message : '读取剪贴板失败'
  } finally {
    decoding.value = false
  }
}
</script>

<template>
  <div class="tool-page">
    <NTabs v-model:value="tab" type="segment" size="small" animated>
      <NTabPane name="generate" tab="生成">
        <div class="panel">
          <div class="field">
            <div class="label">类型</div>
            <NRadioGroup v-model:value="kind" size="small">
              <NRadioButton value="qr">二维码</NRadioButton>
              <NRadioButton value="barcode">条形码</NRadioButton>
            </NRadioGroup>
          </div>

          <div class="field">
            <div class="label">内容</div>
            <NInput
              v-model:value="content"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 8 }"
              placeholder="文本 / URL / 数字"
            />
          </div>

          <div v-if="kind === 'qr'" class="opts">
            <div class="field grow">
              <div class="label">尺寸</div>
              <NInputNumber v-model:value="qrSize" :min="96" :max="1024" :step="16" style="width: 100%" />
            </div>
            <div class="field grow">
              <div class="label">边距</div>
              <NInputNumber v-model:value="qrMargin" :min="0" :max="8" style="width: 100%" />
            </div>
            <div class="field grow">
              <div class="label">容错</div>
              <NSelect v-model:value="qrEcc" :options="eccOptions" />
            </div>
          </div>

          <div v-else class="opts">
            <div class="field grow">
              <div class="label">格式</div>
              <NSelect v-model:value="barcodeFormat" :options="formatOptions" />
            </div>
            <div class="field grow">
              <div class="label">线宽</div>
              <NInputNumber v-model:value="barcodeWidth" :min="1" :max="6" style="width: 100%" />
            </div>
            <div class="field grow">
              <div class="label">高度</div>
              <NInputNumber v-model:value="barcodeHeight" :min="40" :max="240" :step="10" style="width: 100%" />
            </div>
            <div class="field switch">
              <div class="label">显示文字</div>
              <NSwitch v-model:value="barcodeDisplay" />
            </div>
          </div>

          <div class="preview-box">
            <img v-if="previewUrl" :src="previewUrl" alt="preview" class="preview-img" />
            <NText v-else-if="genError" type="error" style="font-size: 13px">{{ genError }}</NText>
            <NText v-else depth="3" style="font-size: 13px">—</NText>
          </div>

          <NSpace>
            <NButton type="primary" :disabled="!previewUrl" @click="downloadPreview">
              <template #icon>
                <NIcon :component="CloudDownloadOutline" />
              </template>
              下载
            </NButton>
            <NButton :disabled="!previewUrl" @click="copyPreview">
              <template #icon>
                <NIcon :component="CopyOutline" />
              </template>
              复制图片
            </NButton>
          </NSpace>
        </div>
      </NTabPane>

      <NTabPane name="decode" tab="解码">
        <div class="panel">
          <NSpace style="margin-bottom: 12px">
            <NButton @click="fileInput?.click()">
              <template #icon>
                <NIcon :component="ImageOutline" />
              </template>
              选择图片
            </NButton>
            <NButton :loading="decoding" @click="pasteDecode">
              <template #icon>
                <NIcon :component="ClipboardOutline" />
              </template>
              粘贴图片
            </NButton>
            <NButton v-if="decodePreview || decodeResult" quaternary @click="clearDecode">
              清空
            </NButton>
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
            :class="{ dragging }"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop="onDrop"
            @click="fileInput?.click()"
          >
            <img v-if="decodePreview" :src="decodePreview" alt="decode" class="decode-img" />
            <NText v-else depth="3" style="font-size: 13px">—</NText>
          </div>

          <div v-if="decodeError" class="result-box error">
            {{ decodeError }}
          </div>
          <div v-else-if="decodeResult" class="result-box">
            <div class="result-meta">
              <span>{{ decodeResult.format }}</span>
              <NButton size="tiny" quaternary @click="copyText(decodeResult.text)">
                <template #icon>
                  <NIcon :component="CopyOutline" />
                </template>
                复制
              </NButton>
            </div>
            <div class="result-text">{{ decodeResult.text }}</div>
          </div>
        </div>
      </NTabPane>
    </NTabs>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 640px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 12px;
}

.field .label {
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.7;
}

.opts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.opts .grow {
  min-width: 0;
}

.field.switch {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  padding-bottom: 4px;
}

.preview-box {
  min-height: 180px;
  display: grid;
  place-items: center;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
}

.preview-img {
  max-width: 100%;
  max-height: 320px;
  image-rendering: pixelated;
}

.dropzone {
  min-height: 180px;
  display: grid;
  place-items: center;
  padding: 16px;
  border-radius: 10px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: rgba(47, 111, 237, 0.5);
  background: rgba(47, 111, 237, 0.04);
}

.decode-img {
  max-width: 100%;
  max-height: 280px;
  border-radius: 6px;
}

.result-box {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(47, 111, 237, 0.06);
  border: 1px solid rgba(47, 111, 237, 0.12);
}

.result-box.error {
  background: rgba(208, 48, 80, 0.06);
  border-color: rgba(208, 48, 80, 0.18);
  color: #c0392b;
  font-size: 13px;
}

.result-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  opacity: 0.65;
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
}

.result-text {
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
}

@media (max-width: 560px) {
  .opts {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
