<script setup lang="ts">
import { computed, h, ref, watch, type Component } from 'vue'
import {
  NAutoComplete,
  NButton,
  NDropdown,
  NIcon,
  NInput,
  NInputNumber,
  NPopconfirm,
  NSpace,
  NText,
  useMessage,
  type DropdownOption,
} from 'naive-ui'
import {
  AddOutline,
  AppsOutline,
  BatteryChargingOutline,
  CopyOutline,
  CubeOutline,
  DesktopOutline,
  DiscOutline,
  FlashOutline,
  GridOutline,
  HardwareChipOutline,
  LayersOutline,
  SnowOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { usePersistedRef } from '../../utils/persist'
import {
  CATEGORY_LABELS,
  PART_CATEGORIES,
  canRemovePart,
  comparePlans,
  createPart,
  createDefaultPlans,
  createPlan,
  duplicatePlan,
  ensurePlansRequired,
  formatCny,
  formatDelta,
  formatPriceInput,
  lookupPartPrice,
  migratePlans,
  nextPlanName,
  normalizePartName,
  parsePriceInput,
  planCategoryTotals,
  planTotal,
  rememberPartPrice,
  sanitizePartName,
  seedCatalogFromPlans,
  suggestParts,
  type BuildPart,
  type BuildPlan,
  type PartCatalogEntry,
  type PartCategory,
} from '../../utils/pcBuild'

const message = useMessage()

const plans = usePersistedRef<BuildPlan[]>('tool.pc-build.plans', createDefaultPlans())
const activePlanId = usePersistedRef<string>(
  'tool.pc-build.activeId',
  plans.value[0]?.id ?? '',
)
const catalog = usePersistedRef<PartCatalogEntry[]>('tool.pc-build.catalog', [])

const renaming = ref(false)
const renameDraft = ref('')

const CATEGORY_ICONS: Record<PartCategory, Component> = {
  cpu: HardwareChipOutline,
  motherboard: GridOutline,
  memory: LayersOutline,
  gpu: FlashOutline,
  storage: DiscOutline,
  psu: BatteryChargingOutline,
  case: CubeOutline,
  cooler: SnowOutline,
  other: AppsOutline,
}

const addPartOptions = computed<DropdownOption[]>(() =>
  PART_CATEGORIES.map((c) => ({
    key: c.value,
    label: c.label,
    icon: () =>
      h(NIcon, {
        component: CATEGORY_ICONS[c.value],
        size: 16,
      }),
  })),
)

let didMigrate = false

watch(
  plans,
  (list) => {
    if (list.length === 0) {
      plans.value = createDefaultPlans()
      return
    }
    if (!didMigrate) {
      didMigrate = true
      const migrated = migratePlans(list)
      catalog.value = seedCatalogFromPlans(catalog.value, migrated)
      // 清掉方案里已被污染的型号
      let plansDirty = migrated !== list
      const cleanedPlans = migrated.map((plan) => {
        let dirty = false
        const parts = plan.parts.map((p) => {
          const name = sanitizePartName(p.name)
          if (name !== (p.name ?? '')) {
            dirty = true
            return { ...p, name }
          }
          return p.name == null ? { ...p, name: '' } : p
        })
        if (!dirty) return plan
        plansDirty = true
        return { ...plan, parts }
      })
      if (plansDirty) {
        plans.value = cleanedPlans
        return
      }
    } else {
      const fixed = ensurePlansRequired(list)
      if (fixed !== list) {
        plans.value = fixed
        return
      }
    }
    if (!list.some((p) => p.id === activePlanId.value)) {
      activePlanId.value = list[0].id
    }
  },
  { deep: true, immediate: true },
)

const activePlan = computed(() => {
  return plans.value.find((p) => p.id === activePlanId.value) ?? plans.value[0]
})

const activeTotal = computed(() =>
  activePlan.value ? planTotal(activePlan.value) : 0,
)

const compareRows = computed(() => comparePlans(plans.value))

const categoryMatrix = computed(() => {
  const cats = PART_CATEGORIES.map((c) => c.value)
  const used = new Set<PartCategory>()
  for (const plan of plans.value) {
    const totals = planCategoryTotals(plan)
    for (const cat of cats) {
      if ((totals[cat] ?? 0) > 0) used.add(cat)
    }
  }
  const ordered = cats.filter((c) => used.has(c))
  return ordered.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    cells: plans.value.map((plan) => ({
      planId: plan.id,
      amount: planCategoryTotals(plan)[category] ?? 0,
    })),
  }))
})

function selectPlan(id: string) {
  activePlanId.value = id
  renaming.value = false
}

function addPlan() {
  const plan = createPlan(nextPlanName(plans.value))
  plans.value = [...plans.value, plan]
  activePlanId.value = plan.id
}

function duplicateActive() {
  if (!activePlan.value) return
  const copy = duplicatePlan(activePlan.value, nextPlanName(plans.value))
  plans.value = [...plans.value, copy]
  activePlanId.value = copy.id
  message.success('已复制方案')
}

function removePlan(id: string) {
  if (plans.value.length <= 1) {
    message.warning('至少保留一个方案')
    return
  }
  plans.value = plans.value.filter((p) => p.id !== id)
}

function startRename() {
  if (!activePlan.value) return
  renameDraft.value = activePlan.value.name
  renaming.value = true
}

function commitRename() {
  if (!activePlan.value) return
  const name = renameDraft.value.trim()
  if (!name) {
    renaming.value = false
    return
  }
  activePlan.value.name = name
  renaming.value = false
}

function addPart(category: PartCategory) {
  if (!activePlan.value) return
  activePlan.value.parts.push(createPart(category))
}

function onAddPartSelect(key: string | number) {
  addPart(key as PartCategory)
}

function removePart(partId: string) {
  if (!activePlan.value) return
  const part = activePlan.value.parts.find((p) => p.id === partId)
  if (!part) return
  if (!canRemovePart(activePlan.value, part)) {
    message.warning(`${CATEGORY_LABELS[part.category]}为必选，至少保留一条`)
    return
  }
  activePlan.value.parts = activePlan.value.parts.filter((p) => p.id !== partId)
}

function partRemovable(part: BuildPart): boolean {
  return activePlan.value ? canRemovePart(activePlan.value, part) : true
}

function focusRowField(event: KeyboardEvent, field: 'name' | 'price') {
  const row = (event.target as HTMLElement | null)?.closest?.('.part-row')
  if (!row) return
  const selector = field === 'name' ? '.col-name input' : '.col-price input'
  const input = row.querySelector(selector) as HTMLInputElement | null
  input?.focus()
  input?.select()
}

function onNameKeydown(part: BuildPart, event: KeyboardEvent) {
  if (event.key !== 'ArrowRight') return
  const input = event.target as HTMLInputElement | null
  if (!input) return
  const atEnd =
    input.selectionStart === input.value.length &&
    input.selectionEnd === input.value.length
  if (!atEnd) return
  event.preventDefault()
  applyCatalogPrice(part, part.name)
  focusRowField(event, 'price')
}

function onPriceKeydown(part: BuildPart, event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    const input = event.target as HTMLInputElement | null
    if (!input) return
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0
    if (!atStart) return
    event.preventDefault()
    focusRowField(event, 'name')
    return
  }
  if (event.key === 'Enter') {
    onPriceUpdate(part, part.price)
    ;(event.target as HTMLInputElement | null)?.blur()
  }
}

function nameOptions(part: BuildPart) {
  return suggestParts(catalog.value, part.name ?? '', part.category).map((entry) => ({
    label: entry.name,
    value: entry.name,
    price: entry.price,
  }))
}

function renderNameLabel(option: {
  label?: string | number
  value?: string | number
  price?: number
}) {
  const name = String(option.value ?? option.label ?? '')
  if (option.price == null) return name
  return `${name}  ${formatCny(option.price)}`
}

function applyCatalogPrice(part: BuildPart, name: string | null | undefined) {
  const price = lookupPartPrice(catalog.value, name ?? '', part.category)
  if (price != null) part.price = price
}

function onNameUpdate(part: BuildPart, value: string) {
  const raw = value ?? ''
  // AutoComplete 可能把带价格的展示文案回填进来，需剥离
  part.name = /[￥¥]/.test(raw) ? sanitizePartName(raw) : raw
  applyCatalogPrice(part, part.name)
}

function onNameSelect(part: BuildPart, value: string | number) {
  part.name = sanitizePartName(String(value))
  applyCatalogPrice(part, part.name)
}

function nameShow(value: string) {
  return sanitizePartName(value).length > 0
}

function onPriceUpdate(part: BuildPart, value: number | null) {
  part.price = value
  const name = normalizePartName(part.name)
  if (name && value != null && value > 0) {
    catalog.value = rememberPartPrice(catalog.value, name, value, part.category)
  }
}
</script>

<template>
  <div class="tool-page">
    <div class="plans-bar">
      <div class="plan-tabs">
        <button
          v-for="plan in plans"
          :key="plan.id"
          type="button"
          class="plan-tab"
          :class="{ active: plan.id === activePlanId }"
          @click="selectPlan(plan.id)"
        >
          <NIcon :component="DesktopOutline" :size="18" class="plan-tab-icon" />
          <span class="plan-tab-body">
            <span class="plan-tab-name">{{ plan.name }}</span>
            <span class="plan-tab-total mono">{{ formatCny(planTotal(plan)) }}</span>
          </span>
        </button>
        <NButton size="small" quaternary @click="addPlan">
          <template #icon>
            <NIcon :component="AddOutline" />
          </template>
          方案
        </NButton>
      </div>
    </div>

    <div v-if="activePlan" class="editor">
      <div class="editor-head">
        <div class="title-row">
          <template v-if="renaming">
            <NInput
              v-model:value="renameDraft"
              size="small"
              style="width: 200px"
              @keydown.enter="commitRename"
              @blur="commitRename"
            />
          </template>
          <template v-else>
            <button type="button" class="plan-title" @click="startRename">
              {{ activePlan.name }}
            </button>
          </template>
          <NText depth="3" class="total-inline">
            合计 <span class="mono">{{ formatCny(activeTotal) }}</span>
          </NText>
        </div>
        <NSpace :size="8">
          <NButton size="small" quaternary @click="duplicateActive">
            <template #icon>
              <NIcon :component="CopyOutline" />
            </template>
            复制
          </NButton>
          <NPopconfirm @positive-click="removePlan(activePlan.id)">
            <template #trigger>
              <NButton
                size="small"
                quaternary
                :disabled="plans.length <= 1"
                title="删除方案"
              >
                <template #icon>
                  <NIcon :component="TrashOutline" />
                </template>
              </NButton>
            </template>
            删除「{{ activePlan.name }}」？
          </NPopconfirm>
          <NDropdown
            trigger="click"
            :options="addPartOptions"
            @select="onAddPartSelect"
          >
            <NButton size="small" type="primary" ghost>
              <template #icon>
                <NIcon :component="AddOutline" />
              </template>
              配件
            </NButton>
          </NDropdown>
        </NSpace>
      </div>

      <div class="parts-list">
        <div class="parts-head">
          <span class="col-cat">配件</span>
          <span class="col-name">型号</span>
          <span class="col-price">价格</span>
          <span class="col-action" />
        </div>
        <div
          v-for="part in activePlan.parts"
          :key="part.id"
          class="part-row"
        >
          <div class="col-cat cat-cell">
            <NIcon
              :component="CATEGORY_ICONS[part.category]"
              :size="16"
              class="cat-icon"
            />
            <span class="cat-label">{{ CATEGORY_LABELS[part.category] }}</span>
          </div>
          <div class="col-name">
            <NAutoComplete
              :value="part.name ?? ''"
              :options="nameOptions(part)"
              :render-label="renderNameLabel"
              size="small"
              placeholder="型号"
              :get-show="nameShow"
              @update:value="(v) => onNameUpdate(part, v)"
              @select="(v) => onNameSelect(part, v)"
              @keydown="(e) => onNameKeydown(part, e)"
            />
          </div>
          <div class="col-price">
            <NInputNumber
              :value="part.price"
              size="small"
              :min="0"
              :show-button="false"
              placeholder="0"
              :parse="parsePriceInput"
              :format="formatPriceInput"
              style="width: 100%"
              @update:value="(v) => onPriceUpdate(part, v)"
              @keydown="(e) => onPriceKeydown(part, e)"
            />
          </div>
          <div class="col-action">
            <NButton
              quaternary
              circle
              size="small"
              :title="partRemovable(part) ? '删除' : '必选配件'"
              :disabled="!partRemovable(part)"
              @click="removePart(part.id)"
            >
              <template #icon>
                <NIcon :component="TrashOutline" />
              </template>
            </NButton>
          </div>
        </div>
      </div>
    </div>

    <div v-if="plans.length >= 2" class="compare">
      <div class="compare-title">比价</div>
      <div class="compare-cards">
        <div
          v-for="row in compareRows"
          :key="row.plan.id"
          class="compare-card"
          :class="{
            cheapest: row.isCheapest,
            active: row.plan.id === activePlanId,
          }"
          role="button"
          tabindex="0"
          @click="selectPlan(row.plan.id)"
          @keydown.enter="selectPlan(row.plan.id)"
        >
          <div class="compare-name">{{ row.plan.name }}</div>
          <div class="compare-total mono">{{ formatCny(row.total) }}</div>
          <div class="compare-meta">
            <span v-if="row.isCheapest" class="badge">最低</span>
            <span v-else-if="row.total > 0" class="delta mono">
              {{ formatDelta(row.deltaFromCheapest) }}
            </span>
            <span v-else class="muted">未计价</span>
          </div>
        </div>
      </div>

      <div v-if="categoryMatrix.length" class="matrix">
        <div class="matrix-head">
          <span class="matrix-label">配件</span>
          <span
            v-for="plan in plans"
            :key="plan.id"
            class="matrix-plan"
            :class="{ active: plan.id === activePlanId }"
          >
            {{ plan.name }}
          </span>
        </div>
        <div v-for="row in categoryMatrix" :key="row.category" class="matrix-row">
          <span class="matrix-label">
            <NIcon
              :component="CATEGORY_ICONS[row.category]"
              :size="14"
              class="matrix-icon"
            />
            {{ row.label }}
          </span>
          <span
            v-for="cell in row.cells"
            :key="cell.planId"
            class="matrix-cell mono"
            :class="{ active: cell.planId === activePlanId }"
          >
            {{ cell.amount > 0 ? formatCny(cell.amount) : '—' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plans-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.plan-tab {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.plan-tab:hover {
  border-color: rgba(47, 111, 237, 0.35);
}

.plan-tab.active {
  border-color: rgba(47, 111, 237, 0.45);
  background: rgba(47, 111, 237, 0.06);
}

.plan-tab-icon {
  flex-shrink: 0;
  color: #2f6fed;
  opacity: 0.75;
}

.plan-tab.active .plan-tab-icon {
  opacity: 1;
}

.plan-tab-body {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.plan-tab-name {
  font-size: 13px;
  font-weight: 600;
}

.plan-tab-total {
  font-size: 12px;
  opacity: 0.55;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.plan-title {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: text;
  color: inherit;
}

.plan-title:hover {
  color: #2f6fed;
}

.total-inline {
  font-size: 13px;
}

.parts-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.parts-head,
.part-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 96px 36px;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
}

.parts-head {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.55;
  background: rgba(0, 0, 0, 0.03);
  padding-top: 8px;
  padding-bottom: 8px;
}

.part-row {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.col-price {
  text-align: left;
}

.col-action {
  display: flex;
  justify-content: center;
}

.cat-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  line-height: 1;
}

.cat-icon {
  flex-shrink: 0;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #2f6fed;
  opacity: 0.85;
  line-height: 0;
  font-size: 16px;
}

.cat-icon :deep(svg) {
  display: block;
  width: 16px;
  height: 16px;
}

.cat-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
}

.mono {
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

.compare {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.compare-title {
  font-size: 13px;
  opacity: 0.7;
}

.compare-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.compare-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.compare-card:hover,
.compare-card.active {
  border-color: rgba(47, 111, 237, 0.4);
}

.compare-card.cheapest {
  background: rgba(47, 111, 237, 0.06);
  border-color: rgba(47, 111, 237, 0.35);
}

.compare-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.compare-total {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.compare-meta {
  margin-top: 6px;
  font-size: 12px;
  min-height: 18px;
}

.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(47, 111, 237, 0.14);
  color: #2f6fed;
  font-weight: 600;
}

.delta {
  color: #c45c26;
}

.muted {
  opacity: 0.45;
}

.matrix {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-size: 13px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.matrix-head,
.matrix-row {
  display: grid;
  grid-template-columns: 88px repeat(auto-fit, minmax(0, 1fr));
  gap: 0;
}

.matrix-head {
  background: rgba(0, 0, 0, 0.03);
  font-weight: 600;
  opacity: 0.75;
}

.matrix-label,
.matrix-plan,
.matrix-cell {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.matrix-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.matrix-icon {
  color: #2f6fed;
  opacity: 0.7;
  flex-shrink: 0;
}

.matrix-row:last-child .matrix-label,
.matrix-row:last-child .matrix-cell {
  border-bottom: none;
}

.matrix-plan.active,
.matrix-cell.active {
  background: rgba(47, 111, 237, 0.04);
}

.matrix-cell {
  text-align: right;
}

@media (max-width: 640px) {
  .matrix {
    overflow-x: auto;
  }

  .matrix-head,
  .matrix-row {
    min-width: 360px;
  }
}
</style>
