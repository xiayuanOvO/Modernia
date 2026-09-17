export type HardwareCategory = 'cpu' | 'gpu' | 'motherboard'

export interface HardwarePriceItem {
  id: string
  name: string
  price: number
  url: string
  category: HardwareCategory
}

export interface HardwarePriceSnapshot {
  cpu: HardwarePriceItem[]
  gpu: HardwarePriceItem[]
  motherboard: HardwarePriceItem[]
  fetchedAt: number
}

/** date (YYYY-MM-DD) → productId → price */
export type PriceHistoryByDate = Record<string, Record<string, number>>

export const CATEGORY_LABELS: Record<HardwareCategory, string> = {
  cpu: 'CPU',
  gpu: '显卡',
  motherboard: '主板',
}

const HISTORY_MAX_DAYS = 40

export function localDateKey(ms: number = Date.now()): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, day] = dateKey.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  d.setDate(d.getDate() + deltaDays)
  return localDateKey(d.getTime())
}

export function mergeSnapshotIntoHistory(
  history: PriceHistoryByDate,
  snapshot: HardwarePriceSnapshot,
): PriceHistoryByDate {
  const dateKey = localDateKey(snapshot.fetchedAt)
  const dayPrices: Record<string, number> = { ...(history[dateKey] ?? {}) }

  for (const list of [snapshot.cpu, snapshot.gpu, snapshot.motherboard]) {
    for (const item of list) {
      dayPrices[item.id] = item.price
    }
  }

  const next: PriceHistoryByDate = { ...history, [dateKey]: dayPrices }
  const keys = Object.keys(next).sort()
  if (keys.length > HISTORY_MAX_DAYS) {
    for (const key of keys.slice(0, keys.length - HISTORY_MAX_DAYS)) {
      delete next[key]
    }
  }
  return next
}

export function lookupHistoryPrice(
  history: PriceHistoryByDate,
  productId: string,
  dateKey: string,
): number | null {
  const price = history[dateKey]?.[productId]
  return typeof price === 'number' && Number.isFinite(price) ? price : null
}

export function formatCny(price: number | null): string {
  if (price == null) return '—'
  return `¥${price.toLocaleString('zh-CN')}`
}

export function formatDelta(today: number, past: number | null): string {
  if (past == null) return '—'
  const delta = today - past
  if (delta === 0) return '0'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString('zh-CN')}`
}

export function deltaTone(today: number, past: number | null): 'up' | 'down' | 'flat' | 'none' {
  if (past == null) return 'none'
  const delta = today - past
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}
