<script setup lang="ts">
import { computed, ref } from 'vue'
import { NDatePicker, NInputNumber, NSelect, NSpace, NText } from 'naive-ui'

type Unit = 'calendar' | 'workday'

const startDate = ref(Date.now())
const amount = ref<number | null>(1)
const unit = ref<Unit>('calendar')
const unitOptions = [
  { label: '自然日', value: 'calendar' },
  { label: '工作日', value: 'workday' },
]

function dateAtOffset(date: Date, offset: number) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + offset))
}

function isWorkday(date: Date) {
  return date.getUTCDay() % 6 !== 0
}

const result = computed(() => {
  if (startDate.value == null || amount.value == null || !Number.isInteger(amount.value)) return null

  const start = new Date(startDate.value)
  const direction = Math.sign(amount.value)
  let remaining = Math.abs(amount.value)
  let offset = 0

  while (remaining > 0) {
    offset += direction
    if (unit.value === 'calendar' || isWorkday(dateAtOffset(start, offset))) remaining--
  }

  const date = dateAtOffset(start, offset)
  const pad = (value: number) => String(value).padStart(2, '0')
  let workdays = 0
  for (let day = direction; direction !== 0 && day !== offset + direction; day += direction) {
    if (isWorkday(dateAtOffset(start, day))) workdays += direction
  }

  return {
    date: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    calendarDays: offset,
    workdays,
  }
})
</script>

<template>
  <div class="tool-page">
    <NSpace vertical :size="18" style="max-width: 440px">
      <div class="field">
        <div class="label">开始日期</div>
        <NDatePicker v-model:value="startDate" type="date" style="width: 100%" />
      </div>
      <div class="field">
        <div class="label">推算天数</div>
        <NSpace :size="8" :wrap="false">
          <NInputNumber
            v-model:value="amount"
            :show-button="false"
            :precision="0"
            placeholder="输入天数"
            style="flex: 1"
          />
          <NSelect v-model:value="unit" :options="unitOptions" style="width: 120px" />
        </NSpace>
      </div>

      <div class="result-box">
        <div class="label">目标日期</div>
        <div class="result-date">{{ result?.date ?? '—' }}</div>
        <NText v-if="result" depth="3">
          相差 {{ result.calendarDays }} 个自然日，{{ result.workdays }} 个工作日
        </NText>
      </div>
      <NText depth="3" class="hint">工作日按周一至周五计算，不包含法定节假日。负数可向前推算。</NText>
    </NSpace>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 720px;
}

.field {
  min-width: 0;
}

.label {
  margin-bottom: 8px;
  font-size: 13px;
  opacity: 0.7;
}

.result-box {
  padding: 16px;
  border: 1px solid rgba(47, 111, 237, 0.14);
  border-radius: 10px;
  background: rgba(47, 111, 237, 0.06);
}

.result-date {
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
}

.hint {
  font-size: 12px;
}
</style>
