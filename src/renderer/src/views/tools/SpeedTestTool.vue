<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { NButton, NProgress, NSelect, NText, useMessage } from 'naive-ui'
import { usePersistedRef } from '../../utils/persist'
import SpeedGauge from '../../components/SpeedGauge.vue'
import {
  formatMs,
  type SpeedPhase,
  type SpeedProgress,
  type SpeedSample,
  type SpeedSourceInfo,
} from '../../utils/speedTest'

const message = useMessage()

const sourceId = usePersistedRef('tool.speedtest.sourceId', 'aliyun')
const sources = ref<SpeedSourceInfo[]>([])

const lastResult = usePersistedRef<SpeedSample>('tool.speedtest.last', {
  sourceId: 'aliyun',
  sourceLabel: '阿里云',
  latencyMs: null,
  jitterMs: null,
  downloadMbps: null,
  uploadMbps: null,
  colo: null,
  loc: null,
  ip: null,
  testedAt: null,
})

const running = ref(false)
const phase = ref<SpeedPhase>('idle')
const progress = ref(0)
const live = ref<SpeedProgress>({
  phase: 'idle',
  latencyMs: null,
  jitterMs: null,
  downloadMbps: null,
  uploadMbps: null,
  progress: 0,
  message: '',
})

let stopProgress: (() => void) | null = null
let userAborted = false

const sourceOptions = computed(() =>
  sources.value.map((s) => ({
    label: `${s.label} · ${s.region}${s.supportsUpload ? '' : ' · 仅下载'}`,
    value: s.id,
  })),
)

const currentSource = computed(
  () => sources.value.find((s) => s.id === sourceId.value) ?? null,
)

const supportsUpload = computed(() => currentSource.value?.supportsUpload ?? true)

const display = computed(() => {
  const sameSource = lastResult.value.sourceId === sourceId.value
  return {
    latencyMs: live.value.latencyMs ?? (sameSource ? lastResult.value.latencyMs : null),
    jitterMs: live.value.jitterMs ?? (sameSource ? lastResult.value.jitterMs : null),
    downloadMbps:
      live.value.downloadMbps ?? (sameSource ? lastResult.value.downloadMbps : null),
    uploadMbps: supportsUpload.value
      ? (live.value.uploadMbps ?? (sameSource ? lastResult.value.uploadMbps : null))
      : null,
  }
})

const metaLine = computed(() => {
  const r = lastResult.value
  const sameSource = r.sourceId === sourceId.value
  const parts: string[] = [
    sameSource ? r.sourceLabel || currentSource.value?.label || '测速' : currentSource.value?.label || '测速',
  ]
  if (sameSource) {
    if (r.colo) {
      parts.push(/^[A-Z0-9]{2,6}$/.test(r.colo) ? `节点 ${r.colo}` : r.colo)
    }
    if (r.loc) parts.push(r.loc)
    if (r.testedAt) {
      const d = new Date(r.testedAt)
      const pad = (n: number) => String(n).padStart(2, '0')
      parts.push(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      )
    }
  } else if (currentSource.value) {
    parts.push(currentSource.value.region)
  }
  return parts.join(' · ')
})

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'latency':
      return '正在测延迟…'
    case 'download':
      return '正在测下载…'
    case 'upload':
      return '正在测上传…'
    case 'done':
      return '完成'
    case 'error':
      return '失败'
    default:
      return ''
  }
})

async function loadSources() {
  if (!window.speedTestApi) return
  sources.value = await window.speedTestApi.listSources()
  if (!sources.value.some((s) => s.id === sourceId.value)) {
    sourceId.value = sources.value[0]?.id ?? 'aliyun'
  }
}

async function start() {
  if (running.value || !window.speedTestApi) return
  userAborted = false
  stopProgress?.()
  stopProgress = window.speedTestApi.onProgress((p) => {
    live.value = p
    phase.value = p.phase
    progress.value = p.progress
  })

  running.value = true
  phase.value = 'latency'
  progress.value = 0
  live.value = {
    phase: 'latency',
    latencyMs: null,
    jitterMs: null,
    downloadMbps: null,
    uploadMbps: null,
    progress: 0,
    message: '',
  }

  try {
    const result = await window.speedTestApi.run(sourceId.value)
    if ('aborted' in result) {
      phase.value = 'idle'
      if (userAborted) message.info('已停止')
      return
    }
    if ('error' in result) {
      phase.value = 'error'
      message.error(result.error)
      return
    }
    lastResult.value = result
    phase.value = 'done'
    progress.value = 1
    message.success('测速完成')
  } catch (e) {
    if (userAborted) {
      phase.value = 'idle'
      message.info('已停止')
    } else {
      phase.value = 'error'
      message.error(e instanceof Error ? e.message : '测速失败')
    }
  } finally {
    running.value = false
    stopProgress?.()
    stopProgress = null
  }
}

function stop() {
  userAborted = true
  window.speedTestApi?.abort()
}

onMounted(() => {
  void loadSources()
})

onBeforeUnmount(() => {
  userAborted = true
  window.speedTestApi?.abort()
  stopProgress?.()
})
</script>

<template>
  <div class="tool-page">
    <div class="toolbar">
      <NSelect
        v-model:value="sourceId"
        :options="sourceOptions"
        :disabled="running"
        style="width: 280px"
      />
      <NButton v-if="!running" type="primary" @click="start">开始测速</NButton>
      <NButton v-else type="error" secondary @click="stop">停止</NButton>
      <NText depth="3" style="font-size: 13px">{{ metaLine }}</NText>
    </div>

    <div v-if="running || phase === 'done' || phase === 'error'" class="progress-block">
      <div class="progress-label">
        <span>{{ phaseLabel }}</span>
        <span>{{ Math.round(progress * 100) }}%</span>
      </div>
      <NProgress
        type="line"
        :percentage="Math.round(progress * 100)"
        :show-indicator="false"
        :processing="running"
        :height="8"
        border-radius="4"
        color="#2f6fed"
        rail-color="rgba(47, 111, 237, 0.12)"
      />
    </div>

    <div class="metrics">
      <div class="metric latency" :class="{ active: phase === 'latency' }">
        <div class="metric-label">延迟</div>
        <div class="metric-value">
          {{ formatMs(display.latencyMs) }}
          <span class="unit">ms</span>
        </div>
        <div class="metric-sub">抖动 {{ formatMs(display.jitterMs) }} ms</div>
      </div>

      <SpeedGauge
        label="下载"
        :value="display.downloadMbps"
        :active="phase === 'download'"
      />

      <SpeedGauge
        label="上传"
        :value="display.uploadMbps"
        :active="phase === 'upload'"
        :disabled="!supportsUpload"
        disabled-text="不支持"
      />
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 960px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.progress-block {
  margin-bottom: 20px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.7;
}

.metrics {
  display: grid;
  grid-template-columns: minmax(140px, 0.7fr) 1fr 1fr;
  gap: 16px;
  align-items: stretch;
}

.metric.latency {
  padding: 20px 18px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--n-color, #fff);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.metric.latency.active {
  border-color: rgba(47, 111, 237, 0.4);
  box-shadow: 0 0 0 3px rgba(47, 111, 237, 0.1);
}

.metric-label {
  font-size: 13px;
  opacity: 0.65;
  margin-bottom: 10px;
}

.metric-value {
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #2f6fed;
}

.metric-value .unit {
  margin-left: 6px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.5;
  letter-spacing: 0;
}

.metric-sub {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.5;
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
}

@media (max-width: 720px) {
  .metrics {
    grid-template-columns: 1fr;
  }
}
</style>
