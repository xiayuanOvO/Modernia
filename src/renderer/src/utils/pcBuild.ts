export type PartCategory =
  | 'cpu'
  | 'motherboard'
  | 'bundle'
  | 'memory'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooler'
  | 'other'

export interface PartBackup {
  id: string
  name: string
  price: number | null
}

export interface BuildPart {
  id: string
  category: PartCategory
  name: string
  price: number | null
  backups: PartBackup[]
}

export interface BuildPlan {
  id: string
  name: string
  parts: BuildPart[]
}

export const PART_CATEGORIES: { value: PartCategory; label: string }[] = [
  { value: 'cpu', label: 'CPU' },
  { value: 'motherboard', label: '主板' },
  { value: 'bundle', label: 'CPU+主板' },
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

const LEADING_ORDER: PartCategory[] = ['cpu', 'motherboard', 'bundle', 'memory']

const PLATFORM_CATEGORIES: readonly PartCategory[] = ['cpu', 'motherboard', 'bundle']

/** 没有必选配件，任意行都可删除。 */
export function isRequiredSlotLocked(_plan: BuildPlan, _part: BuildPart): boolean {
  return false
}

export function canRemovePart(plan: BuildPlan, part: BuildPart): boolean {
  return !isRequiredSlotLocked(plan, part)
}

export function isBlankPart(part: BuildPart): boolean {
  const hasName = normalizePartName(part.name).length > 0
  const hasPrice = part.price != null && Number.isFinite(part.price) && part.price > 0
  return !hasName && !hasPrice
}

/** 去掉未填写的空行（清理旧版默认占位）。套装行保留。 */
export function pruneBlankOptionalParts(plan: BuildPlan): BuildPlan {
  const next = plan.parts.filter((p) => p.category === 'bundle' || !isBlankPart(p))
  if (next.length === plan.parts.length) return plan
  return { ...plan, parts: next }
}

function leadingRank(category: PartCategory): number {
  return LEADING_ORDER.indexOf(category)
}

/** 插入配件：套装 / CPU / 主板 / 内存按固定顺序，其余追加。 */
export function insertPart(parts: BuildPart[], part: BuildPart): BuildPart[] {
  const rank = leadingRank(part.category)
  if (rank < 0) return [...parts, part]
  let at = parts.length
  for (let i = 0; i < parts.length; i++) {
    const other = leadingRank(parts[i].category)
    if (other < 0 || other > rank) {
      at = i
      break
    }
  }
  const next = parts.slice()
  next.splice(at, 0, part)
  return next
}

/** 加上套装时去掉空的 CPU / 主板行，避免占位。已填价格的行保留。 */
export function stripBlankPlatformParts(parts: BuildPart[]): {
  parts: BuildPart[]
  overlaps: boolean
} {
  let overlaps = false
  const next = parts.filter((part) => {
    if (part.category !== 'cpu' && part.category !== 'motherboard') return true
    if (isBlankPart(part)) return false
    overlaps = true
    return true
  })
  return { parts: next, overlaps }
}

/** CPU、主板、套装的价格合计，用来对比分开买和套装。 */
export function platformSpend(plan: BuildPlan): number {
  return plan.parts.reduce((sum, part) => {
    if (!(PLATFORM_CATEGORIES as readonly PartCategory[]).includes(part.category)) {
      return sum
    }
    return sum + partLineTotal(part)
  }, 0)
}

/** 不再自动补配件行。保留函数以兼容旧调用。 */
export function ensureRequiredParts(plan: BuildPlan): BuildPlan {
  return plan
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

/** 旧数据 qty>1 拆成多行；去掉 qty；修好 null 型号；补上 backups。 */
function expandLegacyQty(plan: BuildPlan): BuildPlan {
  type LegacyPart = {
    id: string
    category: PartCategory
    name?: string | null
    price: number | null
    qty?: number
    backups?: unknown
  }
  let changed = false
  const parts: BuildPart[] = []
  for (const raw of plan.parts as LegacyPart[]) {
    const qty =
      typeof raw.qty === 'number' && Number.isFinite(raw.qty) && raw.qty > 1
        ? Math.min(99, Math.floor(raw.qty))
        : 1
    const name = normalizePartName(raw.name)
    const normalized = normalizeBackups(raw.backups)
    if (
      qty > 1 ||
      'qty' in raw ||
      raw.name !== name ||
      normalized.changed ||
      !Array.isArray(raw.backups)
    ) {
      changed = true
    }
    for (let i = 0; i < qty; i++) {
      parts.push({
        id: i === 0 ? raw.id : newId('part'),
        category: raw.category,
        name,
        price: raw.price,
        backups: i === 0 ? normalized.list : [],
      })
    }
  }
  return changed ? { ...plan, parts } : plan
}

function normalizeBackups(raw: unknown): { list: PartBackup[]; changed: boolean } {
  if (!Array.isArray(raw)) return { list: [], changed: true }
  let changed = false
  const list = raw.map((item) => {
    const backup = item as { id?: string; name?: string | null; price?: number | null }
    const id = typeof backup?.id === 'string' && backup.id ? backup.id : newId('bak')
    const name = sanitizePartName(backup?.name)
    const price =
      typeof backup?.price === 'number' && Number.isFinite(backup.price) ? backup.price : null
    if (id !== backup?.id || name !== (backup?.name ?? '') || price !== backup?.price) {
      changed = true
    }
    return { id, name, price }
  })
  return { list, changed }
}

/** 新方案从空列表开始，配件按需添加。 */
export const DEFAULT_SLOTS: PartCategory[] = []

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
    backups: [],
    ...overrides,
  }
}

export function createBackup(
  overrides: Partial<Omit<PartBackup, 'id'>> = {},
): PartBackup {
  return {
    id: newId('bak'),
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
        backups: (p.backups ?? []).map((backup) =>
          createBackup({ name: backup.name, price: backup.price }),
        ),
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
      if (name && part.price != null && part.price > 0) {
        next = rememberPartPrice(next, name, part.price, part.category)
      }
      for (const backup of part.backups ?? []) {
        const backupName = sanitizePartName(backup.name)
        if (!backupName || backup.price == null || backup.price <= 0) continue
        next = rememberPartPrice(next, backupName, backup.price, part.category)
      }
    }
  }
  return next
}
