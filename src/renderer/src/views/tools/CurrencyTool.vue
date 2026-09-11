<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NButton,
  NIcon,
  NInputNumber,
  NSelect,
  NSpace,
  NSpin,
  NText,
  useMessage,
} from 'naive-ui'
import { SwapHorizontalOutline, RefreshOutline } from '@vicons/ionicons5'
import { usePersistedRef } from '../../utils/persist'
import {
  CURRENCIES,
  convertAmount,
  currencySymbol,
  ensureRates,
  formatAmount,
  formatRate,
  getRate,
  type RateCache,
} from '../../utils/exchangeRates'

const message = useMessage()
const amount = usePersistedRef<number | null>('tool.currency.amount', 100)
const from = usePersistedRef('tool.currency.from', 'CNY')
const to = usePersistedRef('tool.currency.to', 'USD')

const rates = ref<RateCache | null>(null)
const loading = ref(false)
const error = ref('')

const currencyOptions = CURRENCIES.map((c) => ({
  label: `${c.code} · ${c.label}`,
  value: c.code,
}))

const result = computed(() => {
  if (amount.value == null || !rates.value) return null
  if (!Number.isFinite(amount.value)) return null
  try {
    return convertAmount(amount.value, from.value, to.value, rates.value)
  } catch {
    return null
  }
})

const unitRate = computed(() => {
  if (!rates.value) return null
  try {
    return getRate(from.value, to.value, rates.value)
  } catch {
    return null
  }
})

const updatedLabel = computed(() => {
  if (!rates.value) return ''
  const d = new Date(rates.value.fetchedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `汇率日期 ${rates.value.date} · 本地 ${local} · 数据来源 Frankfurter（ECB）`
})

const previewRows = computed(() => {
  if (amount.value == null || !rates.value) return []
  const targets = ['CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP'].filter(
    (code) => code !== from.value,
  )
  return targets
    .map((code) => {
      try {
        const value = convertAmount(amount.value!, from.value, code, rates.value!)
        return { code, value }
      } catch {
        return null
      }
    })
    .filter((row): row is { code: string; value: number } => row != null)
})

async function loadRates(force = false) {
  loading.value = true
  error.value = ''
  try {
    rates.value = await ensureRates(force)
    if (force) message.success('汇率已更新')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '无法获取汇率'
    if (!rates.value) message.error(error.value)
  } finally {
    loading.value = false
  }
}

function swapCurrencies() {
  const a = from.value
  from.value = to.value
  to.value = a
}

watch([from, to], () => {
  if (from.value === to.value) {
    const fallback = CURRENCIES.find((c) => c.code !== from.value)
    if (fallback) to.value = fallback.code
  }
})

onMounted(() => {
  void loadRates(false)
})
</script>

<template>
  <div class="tool-page">
    <NSpace align="center" justify="space-between" style="margin-bottom: 16px">
      <NText depth="3" style="font-size: 13px">
        <template v-if="rates">{{ updatedLabel }}</template>
        <template v-else-if="error">{{ error }}</template>
        <template v-else>加载汇率…</template>
      </NText>
      <NButton quaternary circle :loading="loading" title="刷新汇率" @click="loadRates(true)">
        <template #icon>
          <NIcon :component="RefreshOutline" />
        </template>
      </NButton>
    </NSpace>

    <NSpin :show="loading && !rates">
      <div class="layout">
        <div class="converter">
          <div class="field">
            <div class="label">金额</div>
            <NInputNumber
              v-model:value="amount"
              :min="0"
              :show-button="false"
              :precision="4"
              placeholder="0"
              style="width: 100%"
            />
          </div>

          <div class="pair">
            <div class="field grow">
              <div class="label">从</div>
              <NSelect v-model:value="from" :options="currencyOptions" filterable />
            </div>
            <NButton class="swap" quaternary circle title="互换" @click="swapCurrencies">
              <template #icon>
                <NIcon :component="SwapHorizontalOutline" :size="20" />
              </template>
            </NButton>
            <div class="field grow">
              <div class="label">到</div>
              <NSelect v-model:value="to" :options="currencyOptions" filterable />
            </div>
          </div>

          <div class="result-box">
            <div class="result-label">结果</div>
            <div class="result-value">
              <template v-if="result != null">
                {{ formatAmount(result, to) }}
                <span class="code">{{ currencySymbol(to) }} {{ to }}</span>
              </template>
              <template v-else>—</template>
            </div>
            <div v-if="unitRate != null" class="result-rate">
              1 {{ from }} = {{ formatRate(unitRate) }} {{ to }}
            </div>
          </div>
        </div>

        <div v-if="previewRows.length" class="preview">
          <div class="label">常用对照</div>
          <div class="preview-list">
            <div v-for="row in previewRows" :key="row.code" class="preview-row">
              <span class="preview-code">{{ row.code }}</span>
              <span class="preview-value">
                {{ formatAmount(row.value, row.code) }}
                <span class="preview-symbol">{{ currencySymbol(row.code) }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 880px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  gap: 28px;
  align-items: start;
}

.converter {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field .label,
.preview > .label {
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.7;
}

.pair {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.swap {
  margin-bottom: 2px;
  color: #2f6fed;
}

.result-box {
  padding: 16px;
  border-radius: 10px;
  background: rgba(47, 111, 237, 0.06);
  border: 1px solid rgba(47, 111, 237, 0.12);
}

.result-label {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 8px;
}

.result-value {
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.result-value .code {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.55;
}

.result-rate {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.65;
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 13px;
}

.preview-code {
  opacity: 0.55;
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
}

.preview-value {
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.preview-symbol {
  margin-left: 4px;
  opacity: 0.55;
}

@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
