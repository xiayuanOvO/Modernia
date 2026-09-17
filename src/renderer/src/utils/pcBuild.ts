export type PartCategory =
  | 'cpu'
  | 'motherboard'
  | 'memory'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooler'
  | 'other'

export interface BuildPart {
  id: string
  category: PartCategory
  name: string
  price: number | null
}

export interface BuildPlan {
  id: string
  name: string
  parts: BuildPart[]
}

export const PART_CATEGORIES: { value: PartCategory; label: string }[] = [
  { value: 'cpu', label: 'CPU' },
  { value: 'motherboard', label: '主板' },
  { value: 'memory', label: '内存' },
  { value: 'gpu', label: '显卡' },
  { value: 'storage', label: '硬盘' },
  { value: 'psu', label: '电源' },
  { value: 'case', label: '机箱' },
  { value: 'cooler', label: '散热' },
  { value: 'other', label: '其他' },
]

export const CATEGORY_LABELS: Record<PartCategory, string> = Object.fromEntries(
  PART_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<PartCategory, string>

/** CPU / 主板 / 内存：方案中至少各保留一条，不可删尽。 */
export const REQUIRED_CATEGORIES: readonly PartCategory[] = [
  'cpu',
  'motherboard',
  'memory',
]

export function isRequiredCategory(category: PartCategory): boolean {
  return (REQUIRED_CATEGORIES as readonly PartCategory[]).includes(category)
}

export function countCategory(plan: BuildPlan, category: PartCategory): number {
  return plan.parts.filter((p) => p.category === category).length
}

/** 该行是否为某必选类别的最后一条（不可删、不可改类）。 */
export function isRequiredSlotLocked(plan: BuildPlan, part: BuildPart): boolean {
  return isRequiredCategory(part.category) && countCategory(plan, part.category) <= 1
}

export function canRemovePart(plan: BuildPlan, part: BuildPart): boolean {
  return !isRequiredSlotLocked(plan, part)
}

function isBlankPart(part: BuildPart): boolean {
  const hasName = normalizePartName(part.name).length > 0
  const hasPrice = part.price != null && Number.isFinite(part.price) && part.price > 0
  return !hasName && !hasPrice
}

/** 去掉未填写的非必选空行（清理旧版默认占位）。 */
export function pruneBlankOptionalParts(plan: BuildPlan): BuildPlan {
  const next = plan.parts.filter((p) => isRequiredCategory(p.category) || !isBlankPart(p))
  if (next.length === plan.parts.length) return plan
  return { ...plan, parts: next }
}

/** 补齐缺失的必选配件行（兼容旧本地数据）。 */
export function ensureRequiredParts(plan: BuildPlan): BuildPlan {
  const missing = REQUIRED_CATEGORIES.filter(
    (category) => !plan.parts.some((p) => p.category === category),
  )
  if (missing.length === 0) return plan
  const inserts = missing.map((category) => createPart(category))
  // 必选排在前面，保持 CPU → 主板 → 内存 顺序
  const requiredOrder = new Map(
    REQUIRED_CATEGORIES.map((c, i) => [c, i] as const),
  )
  const nextParts = [...inserts, ...plan.parts].sort((a, b) => {
    const ai = requiredOrder.get(a.category)
    const bi = requiredOrder.get(b.category)
    if (ai != null && bi != null) return ai - bi
    if (ai != null) return -1
    if (bi != null) return 1
    return 0
  })
  return { ...plan, parts: nextParts }
}

export function ensurePlansRequired(plans: BuildPlan[]): BuildPlan[] {
  let changed = false
  const next = plans.map((plan) => {
    const fixed = ensureRequiredParts(plan)
    if (fixed !== plan) changed = true
    return fixed
  })
  return changed ? next : plans
}

/** One-shot cleanup for legacy empty optional slots + expand qty + ensure required. */
export function migratePlans(plans: BuildPlan[]): BuildPlan[] {
  let changed = false
  const next = plans.map((plan) => {
    const expanded = expandLegacyQty(plan)
    const pruned = pruneBlankOptionalParts(expanded)
    const fixed = ensureRequiredParts(pruned)
    if (fixed !== plan) changed = true
    return fixed
  })
  return changed ? next : plans
}

/** 旧数据 qty>1 拆成多行；去掉 qty；修好 null 型号。 */
function expandLegacyQty(plan: BuildPlan): BuildPlan {
  type LegacyPart = BuildPart & { qty?: number; name?: string | null }
  let changed = false
  const parts: BuildPart[] = []
  for (const raw of plan.parts as LegacyPart[]) {
    const qty =
      typeof raw.qty === 'number' && Number.isFinite(raw.qty) && raw.qty > 1
        ? Math.min(99, Math.floor(raw.qty))
        : 1
    const name = normalizePartName(raw.name)
    if (qty > 1 || 'qty' in raw || raw.name !== name) changed = true
    for (let i = 0; i < qty; i++) {
      parts.push({
        id: i === 0 ? raw.id : newId('part'),
        category: raw.category,
        name,
        price: raw.price,
      })
    }
  }
  return changed ? { ...plan, parts } : plan
}

/** Default slots：CPU×1、主板×1、内存×2；其余添加时选择。 */
export const DEFAULT_SLOTS: PartCategory[] = [
  'cpu',
  'motherboard',
  'memory',
  'memory',
]

let idSeq = 0

export function newId(prefix: string): string {
  idSeq += 1
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`
}

export function createPart(
  category: PartCategory = 'other',
  overrides: Partial<Omit<BuildPart, 'id'>> = {},
): BuildPart {
  return {
    id: newId('part'),
    category,
    name: '',
    price: null,
    ...overrides,
  }
}

export function createPlan(name: string, withSlots = true): BuildPlan {
  return {
    id: newId('plan'),
    name,
    parts: withSlots ? DEFAULT_SLOTS.map((category) => createPart(category)) : [],
  }
}

export function createDefaultPlans(): BuildPlan[] {
  return [createPlan('方案 A'), createPlan('方案 B')]
}

export function partLineTotal(part: BuildPart): number {
  const price = part.price
  if (price == null || !Number.isFinite(price) || price < 0) return 0
  return Math.round(price * 100) / 100
}

export function planTotal(plan: BuildPlan): number {
  return plan.parts.reduce((sum, part) => sum + partLineTotal(part), 0)
}

export function planFilledCount(plan: BuildPlan): number {
  return plan.parts.filter((p) => {
    const hasName = normalizePartName(p.name).length > 0
    const hasPrice = p.price != null && Number.isFinite(p.price) && p.price > 0
    return hasName || hasPrice
  }).length
}

/** Sum of line totals per category (only categories with spend). */
export function planCategoryTotals(plan: BuildPlan): Partial<Record<PartCategory, number>> {
  const map: Partial<Record<PartCategory, number>> = {}
  for (const part of plan.parts) {
    const line = partLineTotal(part)
    if (line <= 0) continue
    map[part.category] = (map[part.category] ?? 0) + line
  }
  return map
}

export interface PlanCompareRow {
  plan: BuildPlan
  total: number
  filled: number
  deltaFromCheapest: number
  isCheapest: boolean
}

export function comparePlans(plans: BuildPlan[]): PlanCompareRow[] {
  const rows = plans.map((plan) => ({
    plan,
    total: planTotal(plan),
    filled: planFilledCount(plan),
  }))

  const priced = rows.filter((r) => r.total > 0)
  const cheapest = priced.length
    ? Math.min(...priced.map((r) => r.total))
    : null

  return rows
    .map((r) => ({
      ...r,
      deltaFromCheapest:
        cheapest != null && r.total > 0 ? r.total - cheapest : 0,
      isCheapest: cheapest != null && r.total > 0 && r.total === cheapest,
    }))
    .sort((a, b) => {
      if (a.total === 0 && b.total === 0) return 0
      if (a.total === 0) return 1
      if (b.total === 0) return -1
      return a.total - b.total
    })
}

export function nextPlanName(existing: BuildPlan[]): string {
  const used = new Set(existing.map((p) => p.name))
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const ch of letters) {
    const name = `方案 ${ch}`
    if (!used.has(name)) return name
  }
  let i = existing.length + 1
  while (used.has(`方案 ${i}`)) i += 1
  return `方案 ${i}`
}

export function formatCny(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(price)) return '—'
  // 全角 ￥：半角 ¥ 在 IBM Plex Mono 等字体里基线偏下
  return `￥${price.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatDelta(delta: number): string {
  if (delta === 0) return '持平'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

/** Parse 3,040 / 3040.5 style inputs for NInputNumber. */
export function parsePriceInput(input: string): number | null {
  const cleaned = input.replace(/[,\s_￥¥]/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function formatPriceInput(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return ''
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    useGrouping: true,
  })
}

export function duplicatePlan(plan: BuildPlan, name: string): BuildPlan {
  return {
    id: newId('plan'),
    name,
    parts: plan.parts.map((p) =>
      createPart(p.category, {
        name: p.name,
        price: p.price,
      }),
    ),
  }
}

/** 型号 → 价格历史，用于自动完成与回填。 */
export interface PartCatalogEntry {
  name: string
  price: number
  category?: PartCategory
  updatedAt: number
}

const CATALOG_MAX = 200

export function normalizePartName(name: string | null | undefined): string {
  if (name == null) return ''
  return String(name).trim().replace(/\s+/g, ' ')
}

/** 去掉误写入的「￥869」后缀（AutoComplete 曾把带价格的 label 回填进型号）。 */
export function sanitizePartName(name: string | null | undefined): string {
  let s = normalizePartName(name)
  s = s.replace(/(?:\s*[￥¥]\s*[\d,]+(?:\.\d+)?)+$/g, '')
  return normalizePartName(s)
}

export function rememberPartPrice(
  catalog: PartCatalogEntry[],
  name: string,
  price: number,
  category?: PartCategory,
): PartCatalogEntry[] {
  const key = sanitizePartName(name)
  if (!key || !Number.isFinite(price) || price <= 0) return catalog

  const lower = key.toLowerCase()
  const next = catalog.filter((e) => {
    const sameName = sanitizePartName(e.name).toLowerCase() === lower
    const sameCat = (e.category ?? null) === (category ?? null)
    return !(sameName && sameCat)
  })
  next.unshift({
    name: key,
    price,
    category,
    updatedAt: Date.now(),
  })
  return next.length > CATALOG_MAX ? next.slice(0, CATALOG_MAX) : next
}

export function lookupPartPrice(
  catalog: PartCatalogEntry[],
  name: string,
  category?: PartCategory,
): number | null {
  const key = sanitizePartName(name).toLowerCase()
  if (!key) return null
  const hit = catalog.find((e) => {
    if (sanitizePartName(e.name).toLowerCase() !== key) return false
    if (category) return e.category === category
    return true
  })
  return hit ? hit.price : null
}

export function suggestParts(
  catalog: PartCatalogEntry[],
  query: string,
  category?: PartCategory,
  limit = 8,
): PartCatalogEntry[] {
  const q = sanitizePartName(query).toLowerCase()
  if (!q) return []

  const matched = catalog.filter((e) => {
    if (category && e.category !== category) return false
    return sanitizePartName(e.name).toLowerCase().includes(q)
  })

  matched.sort((a, b) => b.updatedAt - a.updatedAt)
  return matched.slice(0, limit)
}

/** 清理历史里被污染的型号名并去重。 */
export function scrubCatalog(catalog: PartCatalogEntry[]): PartCatalogEntry[] {
  let next: PartCatalogEntry[] = []
  for (const entry of catalog) {
    next = rememberPartPrice(next, entry.name, entry.price, entry.category)
  }
  return next
}

export function seedCatalogFromPlans(
  catalog: PartCatalogEntry[],
  plans: BuildPlan[],
): PartCatalogEntry[] {
  let next = scrubCatalog(catalog)
  for (const plan of plans) {
    for (const part of plan.parts) {
      const name = sanitizePartName(part.name)
      if (!name || part.price == null || part.price <= 0) continue
      next = rememberPartPrice(next, name, part.price, part.category)
    }
  }
  return next
}
