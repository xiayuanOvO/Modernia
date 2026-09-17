<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NIcon,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSpace,
  NSpin,
  NText,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { RefreshOutline, OpenOutline } from '@vicons/ionicons5'
import { usePersistedRef } from '../../utils/persist'
import {
  CATEGORY_LABELS,
  deltaTone,
  formatCny,
  formatDelta,
  localDateKey,
  lookupHistoryPrice,
  mergeSnapshotIntoHistory,
  shiftDateKey,
  type HardwareCategory,
  type HardwarePriceItem,
  type HardwarePriceSnapshot,
  type PriceHistoryByDate,
} from '../../utils/hardwarePrice'

interface Row extends HardwarePriceItem {
  yesterday: number | null
  weekAgo: number | null
}

const message = useMessage()

const category = usePersistedRef<HardwareCategory>('tool.hardware.category', 'cpu')
const keyword = usePersistedRef('tool.hardware.keyword', '')
const snapshot = usePersistedRef<HardwarePriceSnapshot | null>('tool.hardware.snapshot', null)
const history = usePersistedRef<PriceHistoryByDate>('tool.hardware.history', {})

const loading = ref(false)
const error = ref('')

const todayKey = computed(() =>
  snapshot.value ? localDateKey(snapshot.value.fetchedAt) : localDateKey(),
)
const yesterdayKey = computed(() => shiftDateKey(todayKey.value, -1))
const weekAgoKey = computed(() => shiftDateKey(todayKey.value, -7))

const rows = computed<Row[]>(() => {
  const list = snapshot.value?.[category.value] ?? []
  const q = keyword.value.trim().toLowerCase()
  const hist = history.value
  return list
    .filter((item) => !q || item.name.toLowerCase().includes(q))
    .map((item) => ({
      ...item,
      yesterday: lookupHistoryPrice(hist, item.id, yesterdayKey.value),
      weekAgo: lookupHistoryPrice(hist, item.id, weekAgoKey.value),
    }))
})

const updatedLabel = computed(() => {
  if (!snapshot.value) return ''
  const d = new Date(snapshot.value.fetchedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `本地 ${local} · 京东等商城价（中关村在线）`
})

function renderPrice(value: number | null) {
  return h('span', { class: 'price-cell' }, formatCny(value))
}

function renderDelta(today: number, past: number | null) {
  const tone = deltaTone(today, past)
  return h('span', { class: ['delta-cell', `delta-${tone}`] }, formatDelta(today, past))
}

const columns = computed<DataTableColumns<Row>>(() => [
  {
    title: '名称',
    key: 'name',
    ellipsis: { tooltip: true },
    minWidth: 220,
    render(row) {
      return h(
        'a',
        {
          class: 'name-link',
          href: row.url,
          target: '_blank',
          rel: 'noreferrer noopener',
        },
        [
          h('span', { class: 'name-text' }, row.name),
          h(NIcon, { component: OpenOutline, size: 14, class: 'name-icon' }),
        ],
      )
    },
  },
  {
    title: '今日',
    key: 'price',
    width: 110,
    align: 'right',
    render(row) {
      return renderPrice(row.price)
    },
  },
  {
    title: '昨日',
    key: 'yesterday',
    width: 110,
    align: 'right',
    render(row) {
      return renderPrice(row.yesterday)
    },
  },
  {
    title: '七天前',
    key: 'weekAgo',
    width: 110,
    align: 'right',
    render(row) {
      return renderPrice(row.weekAgo)
    },
  },
  {
    title: '较昨日',
    key: 'deltaY',
    width: 100,
    align: 'right',
    render(row) {
      return renderDelta(row.price, row.yesterday)
    },
  },
  {
    title: '较七天',
    key: 'deltaW',
    width: 100,
    align: 'right',
    render(row) {
      return renderDelta(row.price, row.weekAgo)
    },
  },
])

async function refresh(forceMessage = true) {
  if (!window.hardwarePriceApi) {
    error.value = '硬件报价接口不可用'
    message.error(error.value)
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await window.hardwarePriceApi.fetch()
    if ('error' in result) {
      error.value = result.error
      if (!snapshot.value) message.error(result.error)
      else message.warning(result.error)
      return
    }
    snapshot.value = result
    history.value = mergeSnapshotIntoHistory(history.value, result)
    const missing = (['cpu', 'gpu', 'motherboard'] as const).filter(
      (key) => result[key].length === 0,
    )
    if (missing.length && forceMessage) {
      message.warning(`${missing.map((k) => CATEGORY_LABELS[k]).join(' / ')} 暂无数据`)
    } else if (forceMessage) {
      message.success('报价已更新')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取报价失败'
    if (!snapshot.value) message.error(error.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!snapshot.value) void refresh(false)
})
</script>

<template>
  <div class="hw-page">
    <div class="toolbar">
      <NRadioGroup v-model:value="category" size="small" name="hardware-category">
        <NRadioButton
          v-for="(label, key) in CATEGORY_LABELS"
          :key="key"
          :value="key"
        >
          {{ label }}
        </NRadioButton>
      </NRadioGroup>

      <NSpace :size="10" align="center" class="actions">
        <NInput
          v-model:value="keyword"
          clearable
          size="small"
          placeholder="搜索型号"
          style="width: 180px"
        />
        <NButton size="small" :loading="loading" :disabled="loading" @click="refresh()">
          <template #icon>
            <NIcon :component="RefreshOutline" />
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <div v-if="updatedLabel" class="meta">
      <NText depth="3">{{ updatedLabel }}</NText>
    </div>

    <NSpin :show="loading && !snapshot">
      <NDataTable
        :columns="columns"
        :data="rows"
        :bordered="false"
        :single-line="false"
        size="small"
        :row-key="(row: Row) => row.id"
        :max-height="'calc(100vh - 220px)'"
        class="table"
      />
    </NSpin>

    <div v-if="error && snapshot" class="error-line">
      <NText type="warning">{{ error }}</NText>
    </div>
  </div>
</template>

<style scoped>
.hw-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.meta {
  font-size: 12px;
}

.table {
  flex: 1;
  min-height: 320px;
}

.table :deep(.name-link) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  color: inherit;
  text-decoration: none;
}

.table :deep(.name-link:hover) {
  color: #2f6fed;
}

.table :deep(.name-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table :deep(.name-icon) {
  flex-shrink: 0;
  opacity: 0.35;
}

.table :deep(.name-link:hover .name-icon) {
  opacity: 0.7;
}

.table :deep(.price-cell) {
  font-variant-numeric: tabular-nums;
}

.table :deep(.delta-cell) {
  font-variant-numeric: tabular-nums;
}

.table :deep(.delta-up) {
  color: #d03050;
}

.table :deep(.delta-down) {
  color: #18a058;
}

.table :deep(.delta-flat),
.table :deep(.delta-none) {
  opacity: 0.55;
}

.error-line {
  font-size: 12px;
}
</style>
