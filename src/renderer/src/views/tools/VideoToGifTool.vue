<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { NAlert, NButton, NSelect, NSpace, NText, useMessage } from 'naive-ui'
import { GifEncoder } from '../../utils/gifEncoder'

const message = useMessage()
const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const videoUrl = ref('')
const resultUrl = ref('')
const resultSize = ref(0)
const duration = ref(0)
const busy = ref(false)
const dragging = ref(false)
const progress = ref(0)
const error = ref('')
const fps = ref(10)
const outputWidth = ref(320)

const fpsOptions = [5, 8, 10, 12, 15, 20].map((value) => ({ label: `${value} FPS`, value }))
const widthOptions = [160, 240, 320, 480, 640].map((value) => ({ label: `${value}px`, value }))
const fileInfo = computed(() => {
  if (!file.value) return ''
  const size = file.value.size < 1024 * 1024
    ? `${(file.value.size / 1024).toFixed(1)} KB`
    : `${(file.value.size / 1024 / 1024).toFixed(2)} MB`
  return `${size}${duration.value ? ` · ${duration.value.toFixed(1)} 秒` : ''}`
})

function revokeResults() {
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  videoUrl.value = ''
  resultUrl.value = ''
  resultSize.value = 0
}

function setFile(nextFile?: File) {
  if (!nextFile) return
  if (!nextFile.name.toLowerCase().endsWith('.mp4') && nextFile.type !== 'video/mp4') {
    message.warning('请选择 MP4 视频文件')
    return
  }
  revokeResults()
  file.value = nextFile
  videoUrl.value = URL.createObjectURL(nextFile)
  duration.value = 0
  error.value = ''
}

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  setFile(input.files?.[0])
  input.value = ''
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragging.value = false
  setFile(event.dataTransfer?.files?.[0])
}

function waitFor(target: HTMLMediaElement, eventName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(eventName, onDone)
      target.removeEventListener('error', onError)
    }
    const onDone = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error('视频解码失败，请确认文件可以正常播放')) }
    target.addEventListener(eventName, onDone, { once: true })
    target.addEventListener('error', onError, { once: true })
  })
}

async function seekTo(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.001) return
  const seeked = waitFor(video, 'seeked')
  video.currentTime = time
  await seeked
}

async function convert() {
  if (!file.value || !videoUrl.value) {
    message.warning('请先选择 MP4 视频')
    return
  }
  busy.value = true
  progress.value = 0
  error.value = ''
  let video: HTMLVideoElement | null = null
  try {
    video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    const metadataLoaded = waitFor(video, 'loadedmetadata')
    video.src = videoUrl.value
    await metadataLoaded
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('无法读取视频时长')
    }
    duration.value = video.duration
    if (video.duration > 30) {
      throw new Error('当前最多转换 30 秒视频，请先裁剪片段后重试')
    }
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitFor(video, 'loadeddata')
    }

    const width = Math.min(outputWidth.value, video.videoWidth)
    const height = Math.max(1, Math.round(video.videoHeight * width / video.videoWidth))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('无法创建视频帧画布')

    const totalFrames = Math.max(1, Math.ceil(video.duration * fps.value))
    const delay = 1000 / fps.value
    const encoder = new GifEncoder(width, height)
    for (let frame = 0; frame < totalFrames; frame += 1) {
      await seekTo(video, Math.min(frame / fps.value, Math.max(0, video.duration - 0.01)))
      context.drawImage(video, 0, 0, width, height)
      encoder.addFrame(context.getImageData(0, 0, width, height).data, delay)
      progress.value = Math.round(((frame + 1) / totalFrames) * 100)
      // Yield so the progress text can repaint during longer conversions.
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
    const blob = encoder.finish()
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = URL.createObjectURL(blob)
    resultSize.value = blob.size
    message.success('GIF 生成完成')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '转换失败'
  } finally {
    video?.pause()
    if (video) video.removeAttribute('src')
    busy.value = false
  }
}

function download() {
  if (!resultUrl.value || !file.value) return
  const anchor = document.createElement('a')
  anchor.href = resultUrl.value
  anchor.download = `${file.value.name.replace(/\.mp4$/i, '') || 'video'}.gif`
  anchor.click()
}

function clear() {
  if (busy.value) return
  revokeResults()
  file.value = null
  duration.value = 0
  error.value = ''
  progress.value = 0
}

onBeforeUnmount(revokeResults)
</script>

<template>
  <div class="tool-page">
    <NSpace align="center" wrap style="margin-bottom: 12px">
      <NSelect v-model:value="fps" :options="fpsOptions" style="width: 120px" :disabled="busy" />
      <NSelect v-model:value="outputWidth" :options="widthOptions" style="width: 120px" :disabled="busy" />
      <NButton type="primary" :loading="busy" :disabled="!file" @click="convert">
        {{ busy ? `转换中 ${progress}%` : '转换为 GIF' }}
      </NButton>
      <NButton secondary :disabled="!resultUrl" @click="download">下载 GIF</NButton>
      <NButton quaternary :disabled="!file || busy" @click="clear">清空</NButton>
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
        ref="fileInput"
        class="file-input"
        type="file"
        accept="video/mp4,.mp4"
        :disabled="busy"
        @change="onPick"
      />
      <div class="drop-copy">
        <NButton type="primary" secondary :disabled="busy" @click="fileInput?.click()">
          选择 MP4
        </NButton>
        <NText v-if="file" depth="3">{{ file.name }} · {{ fileInfo }}</NText>
        <NText v-else depth="3">拖入 MP4 视频，或点击选择。单次最多转换 30 秒。</NText>
      </div>
    </div>

    <NAlert v-if="error" type="error" :title="error" style="margin-top: 12px" />
    <div v-if="resultUrl" class="result">
      <img :src="resultUrl" alt="GIF 转换结果" />
      <NText depth="3">GIF · {{ (resultSize / 1024 / 1024).toFixed(2) }} MB</NText>
    </div>
    <NText v-else-if="busy" depth="3">正在读取视频帧并编码 GIF，请稍候…</NText>
  </div>
</template>

<style scoped>
.tool-page { max-width: 820px; }
.dropzone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  margin-bottom: 16px;
  border: 1px dashed var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color-embedded, transparent);
  transition: border-color 0.15s, background 0.15s;
}
.dropzone.dragging { border-color: #2f6fed; background: rgba(47, 111, 237, 0.06); }
.dropzone.disabled { opacity: 0.6; pointer-events: none; }
.file-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.drop-copy { pointer-events: none; display: flex; align-items: center; gap: 14px; padding: 16px; }
.drop-copy :deep(.n-button) { pointer-events: auto; }
.result { display: flex; align-items: flex-start; flex-direction: column; gap: 8px; margin-top: 16px; }
.result img { max-width: 100%; max-height: 420px; border: 1px solid var(--n-border-color); border-radius: 8px; }
</style>
