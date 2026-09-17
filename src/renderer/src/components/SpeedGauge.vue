<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import VueSpeedometer from 'vue-speedometer'

const props = withDefaults(
  defineProps<{
    label: string
    value: number | null
    unit?: string
    active?: boolean
    disabled?: boolean
    disabledText?: string
  }>(),
  {
    unit: 'Mbps',
    active: false,
    disabled: false,
    disabledText: '不支持',
  },
)

const isDark = inject<Ref<boolean>>('isDark', ref(false))

const MAX = 1000
const SEGMENT_STOPS = [0, 50, 100, 200, 400, 700, 1000]

const gaugeValue = computed(() => {
  if (props.disabled || props.value == null || !Number.isFinite(props.value)) return 0
  return Math.min(MAX, Math.max(0, props.value))
})

const valueFormat = computed(() => {
  if (props.disabled || props.value == null) return 'd'
  if (props.value >= 100) return 'd'
  if (props.value >= 10) return '.1f'
  return '.2f'
})

const currentValueText = computed(() => {
  if (props.disabled) return props.disabledText
  if (props.value == null || !Number.isFinite(props.value)) return `— ${props.unit}`
  return `\${value} ${props.unit}`
})

const textColor = computed(() => (isDark.value ? 'rgba(229,231,235,0.85)' : '#374151'))

const segmentColors = computed(() =>
  props.disabled
    ? ['#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db']
    : ['#c5d8fb', '#9abcf6', '#6e9ff1', '#4b82f0', '#2f6fed', '#1f54c7'],
)

const needleColor = computed(() => (props.disabled ? '#9ca3af' : '#1f54c7'))
</script>

<template>
  <div class="gauge" :class="{ active, disabled }">
    <div class="gauge-label">{{ label }}</div>
    <div class="gauge-body">
      <VueSpeedometer
        :value="gaugeValue"
        :min-value="0"
        :max-value="MAX"
        :custom-segment-stops="SEGMENT_STOPS"
        :segment-colors="segmentColors"
        :needle-color="needleColor"
        :text-color="textColor"
        :value-format="valueFormat"
        :current-value-text="currentValueText"
        :needle-transition-duration="600"
        needle-transition="easeElastic"
        :ring-width="28"
        :needle-height-ratio="0.72"
        :width="240"
        :height="160"
        :padding-horizontal="14"
        :padding-vertical="10"
        :label-font-size="'11px'"
        :value-text-font-size="'22px'"
        :value-text-font-weight="'600'"
        :force-render="disabled"
        :svg-aria-label="label"
      />
    </div>
  </div>
</template>

<style scoped>
.gauge {
  padding: 14px 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--n-color, #fff);
  text-align: center;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge.active {
  border-color: rgba(47, 111, 237, 0.4);
  box-shadow: 0 0 0 3px rgba(47, 111, 237, 0.1);
}

.gauge.disabled {
  opacity: 0.7;
}

.gauge-label {
  font-size: 13px;
  opacity: 0.65;
  margin-bottom: 2px;
}

.gauge-body {
  width: 100%;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.gauge-body :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
