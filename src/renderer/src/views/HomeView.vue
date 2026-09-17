<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NGrid, NGi, NIcon } from 'naive-ui'
import {
  CodeSlashOutline,
  GitCompareOutline,
  KeyOutline,
  TimeOutline,
  FingerPrintOutline,
  PersonOutline,
  PhonePortraitOutline,
  CashOutline,
  ImageOutline,
  SpeedometerOutline,
  HardwareChipOutline,
  DesktopOutline,
} from '@vicons/ionicons5'
import { tools } from '../config/tools'
import type { Component } from 'vue'

const router = useRouter()

const iconMap: Record<string, Component> = {
  json: CodeSlashOutline,
  diff: GitCompareOutline,
  base64: KeyOutline,
  timestamp: TimeOutline,
  hash: FingerPrintOutline,
  'fake-person': PersonOutline,
  image: ImageOutline,
  apk: PhonePortraitOutline,
  currency: CashOutline,
  speedtest: SpeedometerOutline,
  'hardware-price': HardwareChipOutline,
  'pc-build': DesktopOutline,
}

function openTool(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="home">
    <div class="intro">
      <h1>选择一个工具开始</h1>
    </div>

    <NGrid cols="1 s:2 m:3" responsive="screen" :x-gap="16" :y-gap="16">
      <NGi v-for="tool in tools" :key="tool.key">
        <button class="tool-item" type="button" @click="openTool(tool.path)">
          <div class="tool-top">
            <div class="tool-icon">
              <NIcon :component="iconMap[tool.key]" :size="28" />
            </div>
            <div class="tool-meta">
              <div class="tool-title">{{ tool.label }}</div>
              <div class="tool-group">{{ tool.group }}</div>
            </div>
          </div>
          <div class="tool-desc">{{ tool.description }}</div>
        </button>
      </NGi>
    </NGrid>
  </div>
</template>

<style scoped>
.home {
  max-width: 960px;
}

.intro {
  margin-bottom: 24px;
}

.intro h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.tool-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: var(--n-color, #fff);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.tool-item:hover {
  border-color: rgba(47, 111, 237, 0.35);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.tool-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-icon {
  width: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #2f6fed;
}

.tool-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.tool-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.tool-group {
  font-size: 12px;
  opacity: 0.5;
  line-height: 1.3;
}

.tool-desc {
  font-size: 13px;
  opacity: 0.72;
  line-height: 1.45;
}
</style>
