<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NSelect, NSpace, NInput, NText, NSwitch } from 'naive-ui'
import { diffLines, diffTrimmedLines, diffWords, diffChars, type Change } from 'diff'
import { usePersistedRef } from '../../utils/persist'

type DiffMode = 'lines' | 'words' | 'chars'

const left = usePersistedRef(
  'tool.diff.left',
  'Hello Modernia\n一行相同\n左边独有\n共同结尾',
)
const right = usePersistedRef(
  'tool.diff.right',
  'Hello Modernia\n一行相同\n右边独有\n共同结尾',
)
const mode = usePersistedRef<DiffMode>('tool.diff.mode', 'lines')
const ignoreWhitespace = usePersistedRef('tool.diff.ignoreWs', false)

const modeOptions = [
  { label: '按行', value: 'lines' },
  { label: '按词', value: 'words' },
  { label: '按字符', value: 'chars' },
]

const parts = computed<Change[]>(() => {
  const a = left.value
  const b = right.value
  if (mode.value === 'words') return diffWords(a, b)
  if (mode.value === 'chars') return diffChars(a, b)
  return ignoreWhitespace.value ? diffTrimmedLines(a, b) : diffLines(a, b)
})

const lineRows = computed(() => {
  if (mode.value !== 'lines') return []
  const rows: { type: 'same' | 'add' | 'del'; text: string }[] = []
  for (const part of parts.value) {
    const type = part.added ? 'add' : part.removed ? 'del' : 'same'
    const chunks = part.value.split('\n')
    if (chunks.length > 1 && chunks[chunks.length - 1] === '') chunks.pop()
    for (const text of chunks) {
      rows.push({ type, text })
    }
  }
  return rows
})

const stats = computed(() => {
  if (mode.value === 'lines') {
    return {
      added: lineRows.value.filter((r) => r.type === 'add').length,
      removed: lineRows.value.filter((r) => r.type === 'del').length,
    }
  }
  let added = 0
  let removed = 0
  for (const part of parts.value) {
    if (part.added) added += part.value.length
    else if (part.removed) removed += part.value.length
  }
  return { added, removed }
})

function swap() {
  const tmp = left.value
  left.value = right.value
  right.value = tmp
}

function clearAll() {
  left.value = ''
  right.value = ''
}
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 12px" align="center" wrap>
      <NSelect v-model:value="mode" :options="modeOptions" style="width: 120px" />
      <NSpace v-if="mode === 'lines'" align="center" :size="8">
        <NText depth="3" style="font-size: 13px">忽略行首尾空白</NText>
        <NSwitch v-model:value="ignoreWhitespace" size="small" />
      </NSpace>
      <NButton secondary @click="swap">交换</NButton>
      <NButton quaternary @click="clearAll">清空</NButton>
      <NText depth="3" style="font-size: 13px">
        +{{ stats.added }} / -{{ stats.removed }}
      </NText>
    </NSpace>

    <div class="split">
      <div>
        <div class="label">原文</div>
        <NInput
          v-model:value="left"
          type="textarea"
          class="mono"
          :autosize="{ minRows: 12, maxRows: 20 }"
        />
      </div>
      <div>
        <div class="label">对比</div>
        <NInput
          v-model:value="right"
          type="textarea"
          class="mono"
          :autosize="{ minRows: 12, maxRows: 20 }"
        />
      </div>
    </div>

    <div class="label" style="margin-top: 16px">结果</div>

    <div v-if="mode === 'lines'" class="diff-panel mono">
      <div
        v-for="(row, i) in lineRows"
        :key="i"
        class="line"
        :class="row.type"
      >
        <span class="gutter">{{ row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' ' }}</span>
        <span class="text">{{ row.text }}</span>
      </div>
      <div v-if="lineRows.length === 0" class="empty">
        <NText depth="3">无差异</NText>
      </div>
    </div>

    <div v-else class="diff-panel mono inline">
      <template v-for="(part, i) in parts" :key="i">
        <span
          :class="{
            add: part.added,
            del: part.removed,
          }"
        >{{ part.value }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 1100px;
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

.mono :deep(textarea),
.mono {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
}

.diff-panel {
  max-height: min(48vh, 480px);
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 8px 0;
  background: var(--n-color-embedded, transparent);
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-panel.inline {
  padding: 12px 14px;
  line-height: 1.6;
}

.line {
  display: grid;
  grid-template-columns: 28px 1fr;
  padding: 1px 0;
}

.gutter {
  text-align: center;
  opacity: 0.7;
  user-select: none;
}

.text {
  padding-right: 12px;
}

.line.add,
span.add {
  background: rgba(46, 160, 67, 0.18);
}

.line.del,
span.del {
  background: rgba(248, 81, 73, 0.18);
}

span.del {
  text-decoration: line-through;
  text-decoration-color: rgba(248, 81, 73, 0.55);
}

.empty {
  padding: 16px;
  text-align: center;
}

@media (max-width: 800px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
