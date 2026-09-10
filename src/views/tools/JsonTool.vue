<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace, NButton, NInput, NAlert, NTabs, NTabPane, useMessage } from 'naive-ui'
import VueJsonPretty from 'vue-json-pretty'
import type { JSONDataType } from 'vue-json-pretty/types/utils'
import 'vue-json-pretty/lib/styles.css'

const message = useMessage()
const input = ref(`{
  "hello": "world",
  "list": [1, 2, 3],
  "nested": {
    "ok": true,
    "name": "tools"
  }
}`)
const activeTab = ref<'edit' | 'tree'>('edit')
const treeDeep = ref(3)

const parseState = computed(() => {
  try {
    return { ok: true as const, data: JSON.parse(input.value) as JSONDataType, error: '' }
  } catch (e) {
    return {
      ok: false as const,
      data: null as JSONDataType | null,
      error: e instanceof Error ? e.message : 'JSON 无效',
    }
  }
})

function formatJson() {
  try {
    input.value = JSON.stringify(JSON.parse(input.value), null, 2)
    message.success('已格式化')
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'JSON 无效')
  }
}

function minifyJson() {
  try {
    input.value = JSON.stringify(JSON.parse(input.value))
    message.success('已压缩')
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'JSON 无效')
  }
}

async function copyResult() {
  await navigator.clipboard.writeText(input.value)
  message.success('已复制')
}

function expandAll() {
  treeDeep.value = 99
}

function collapseAll() {
  treeDeep.value = 0
}

function openTree() {
  if (!parseState.value.ok) {
    message.warning('请先修正 JSON 再查看树形')
    return
  }
  activeTab.value = 'tree'
}
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 12px" wrap>
      <NButton type="primary" @click="formatJson">格式化</NButton>
      <NButton @click="minifyJson">压缩</NButton>
      <NButton secondary @click="copyResult">复制</NButton>
      <NButton secondary :disabled="!parseState.ok" @click="openTree">树形预览</NButton>
      <template v-if="activeTab === 'tree'">
        <NButton quaternary @click="expandAll">全部展开</NButton>
        <NButton quaternary @click="collapseAll">全部折叠</NButton>
      </template>
    </NSpace>

    <NAlert
      v-if="!parseState.ok"
      type="error"
      style="margin-bottom: 12px"
      :title="parseState.error"
    />

    <NTabs v-model:value="activeTab" type="line" animated>
      <NTabPane name="edit" tab="编辑">
        <NInput
          v-model:value="input"
          type="textarea"
          placeholder="粘贴 JSON…"
          :autosize="{ minRows: 16, maxRows: 28 }"
          class="mono"
        />
      </NTabPane>

      <NTabPane name="tree" tab="树形" :disabled="!parseState.ok">
        <div v-if="parseState.ok" class="tree-wrap">
          <VueJsonPretty
            :key="treeDeep"
            :data="parseState.data"
            :deep="treeDeep"
            show-icon
            show-length
            show-line
            collapsed-on-click-brackets
          />
        </div>
        <NAlert v-else type="warning" title="JSON 无效，无法展示树形结构" />
      </NTabPane>
    </NTabs>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 960px;
}

.mono :deep(textarea) {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
}

.tree-wrap {
  padding: 12px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.02);
  max-height: min(70vh, 640px);
  overflow: auto;
  font-size: 13px;
}

.tree-wrap :deep(.vjs-tree-node) {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
}
</style>
