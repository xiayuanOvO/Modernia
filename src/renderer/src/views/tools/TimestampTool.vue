<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { NSpace, NButton, NInput, NInputNumber, NText, useMessage } from 'naive-ui'

const message = useMessage()
const now = ref(Date.now())
const timestamp = ref<number | null>(Math.floor(Date.now() / 1000))
const dateStr = ref('')
let timer = 0

const liveSeconds = computed(() => Math.floor(now.value / 1000))
const liveMillis = computed(() => now.value)

function syncFromTimestamp() {
  if (timestamp.value == null) return
  const ms = timestamp.value > 1e12 ? timestamp.value : timestamp.value * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) {
    message.error('无效时间戳')
    return
  }
  dateStr.value = formatLocal(d)
}

function syncFromDate() {
  const d = new Date(dateStr.value)
  if (Number.isNaN(d.getTime())) {
    message.error('无效日期，请使用如 2026-09-08 17:30:00')
    return
  }
  timestamp.value = Math.floor(d.getTime() / 1000)
}

function useNow() {
  timestamp.value = Math.floor(Date.now() / 1000)
  syncFromTimestamp()
}

function formatLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => {
  syncFromTimestamp()
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  window.clearInterval(timer)
})
</script>

<template>
  <div class="tool-page">
    <div class="live">
      <NText depth="3">当前时间</NText>
      <div class="live-row">
        <span>秒：{{ liveSeconds }}</span>
        <span>毫秒：{{ liveMillis }}</span>
      </div>
    </div>

    <NSpace vertical :size="16" style="max-width: 420px">
      <div>
        <div class="label">Unix 时间戳（秒 / 毫秒）</div>
        <NInputNumber v-model:value="timestamp" style="width: 100%" :show-button="false" />
      </div>
      <div>
        <div class="label">本地日期时间</div>
        <NInput v-model:value="dateStr" placeholder="2026-09-08 17:30:00" />
      </div>
      <NSpace>
        <NButton type="primary" @click="syncFromTimestamp">时间戳 → 日期</NButton>
        <NButton @click="syncFromDate">日期 → 时间戳</NButton>
        <NButton secondary @click="useNow">填入现在</NButton>
      </NSpace>
    </NSpace>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 720px;
}

.live {
  margin-bottom: 24px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(47, 111, 237, 0.06);
  border: 1px solid rgba(47, 111, 237, 0.12);
}

.live-row {
  margin-top: 8px;
  display: flex;
  gap: 24px;
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-size: 14px;
}

.label {
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.7;
}
</style>
