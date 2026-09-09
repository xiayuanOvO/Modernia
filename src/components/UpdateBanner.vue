<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { NButton, NProgress, NText } from 'naive-ui'

type BannerState =
  | { kind: 'hidden' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; version: string; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

const state = ref<BannerState>({ kind: 'hidden' })
const busy = ref(false)

const visible = computed(() => state.value.kind !== 'hidden')

let unsubscribe: (() => void) | undefined

onMounted(() => {
  if (!window.updateApi) return

  unsubscribe = window.updateApi.onEvent((event) => {
    if (event.type === 'available') {
      state.value = { kind: 'available', version: event.info.version }
      return
    }
    if (event.type === 'progress') {
      const version =
        state.value.kind === 'downloading' ||
        state.value.kind === 'available' ||
        state.value.kind === 'ready'
          ? state.value.version
          : ''
      state.value = {
        kind: 'downloading',
        version,
        percent: Math.min(100, Math.round(event.progress.percent)),
      }
      return
    }
    if (event.type === 'downloaded') {
      state.value = { kind: 'ready', version: event.info.version }
      busy.value = false
      return
    }
    if (event.type === 'error') {
      state.value = { kind: 'error', message: event.message }
      busy.value = false
    }
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

async function download() {
  if (!window.updateApi || busy.value) return
  busy.value = true
  if (state.value.kind === 'available') {
    state.value = {
      kind: 'downloading',
      version: state.value.version,
      percent: 0,
    }
  }
  const result = await window.updateApi.download()
  if (!result.ok) {
    state.value = { kind: 'error', message: result.error }
    busy.value = false
  }
}

function install() {
  window.updateApi?.install()
}

function dismiss() {
  state.value = { kind: 'hidden' }
}
</script>

<template>
  <div v-if="visible" class="update-banner" role="status">
    <div class="update-copy">
      <template v-if="state.kind === 'available'">
        <NText strong>发现新版本 {{ state.version }}</NText>
        <NText depth="3">可下载更新，安装后重启生效</NText>
      </template>
      <template v-else-if="state.kind === 'downloading'">
        <NText strong>正在下载 {{ state.version || '更新' }}</NText>
        <NProgress
          type="line"
          :percentage="state.percent"
          :show-indicator="true"
          :height="8"
          style="max-width: 220px"
        />
      </template>
      <template v-else-if="state.kind === 'ready'">
        <NText strong>更新已就绪（{{ state.version }}）</NText>
        <NText depth="3">重启后完成安装</NText>
      </template>
      <template v-else-if="state.kind === 'error'">
        <NText strong>更新失败</NText>
        <NText depth="3">{{ state.message }}</NText>
      </template>
    </div>

    <div class="update-actions">
      <NButton
        v-if="state.kind === 'available'"
        size="small"
        type="primary"
        :loading="busy"
        @click="download"
      >
        下载更新
      </NButton>
      <NButton
        v-else-if="state.kind === 'ready'"
        size="small"
        type="primary"
        @click="install"
      >
        重启安装
      </NButton>
      <NButton
        v-if="state.kind !== 'downloading'"
        size="small"
        quaternary
        @click="dismiss"
      >
        关闭
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.update-banner {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: min(560px, calc(100vw - 32px));
  padding: 12px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
}

.update-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>
