import { loadPersisted, savePersisted } from './persist'

export interface CurrencyMeta {
  code: string
  label: string
  symbol: string
}

/** Frankfurter v1 覆盖的常用币种 */
export const CURRENCIES: CurrencyMeta[] = [
  { code: 'CNY', label: '人民币', symbol: '¥' },
  { code: 'USD', label: '美元', symbol: '$' },
  { code: 'EUR', label: '欧元', symbol: '€' },
  { code: 'JPY', label: '日元', symbol: '¥' },
  { code: 'HKD', label: '港币', symbol: 'HK$' },
  { code: 'GBP', label: '英镑', symbol: '£' },
  { code: 'KRW', label: '韩元', symbol: '₩' },
  { code: 'AUD', label: '澳元', symbol: 'A$' },
  { code: 'CAD', label: '加元', symbol: 'C$' },
  { code: 'SGD', label: '新加坡元', symbol: 'S$' },
  { code: 'CHF', label: '瑞士法郎', symbol: 'Fr' },
  { code: 'THB', label: '泰铢', symbol: '฿' },
  { code: 'MYR', label: '马来西亚林吉特', symbol: 'RM' },
  { code: 'NZD', label: '新西兰元', symbol: 'NZ$' },
  { code: 'INR', label: '印度卢比', symbol: '₹' },
  { code: 'SEK', label: '瑞典克朗', symbol: 'kr' },
  { code: 'NOK', label: '挪威克朗', symbol: 'kr' },
  { code: 'DKK', label: '丹麦克朗', symbol: 'kr' },
  { code: 'PHP', label: '菲律宾比索', symbol: '₱' },
  { code: 'IDR', label: '印尼盾', symbol: 'Rp' },
  { code: 'TRY', label: '土耳其里拉', symbol: '₺' },
  { code: 'BRL', label: '巴西雷亚尔', symbol: 'R$' },
  { code: 'MXN', label: '墨西哥比索', symbol: 'Mex$' },
  { code: 'ZAR', label: '南非兰特', symbol: 'R' },
  { code: 'PLN', label: '波兰兹罗提', symbol: 'zł' },
  { code: 'ILS', label: '以色列新谢克尔', symbol: '₪' },
  { code: 'CZK', label: '捷克克朗', symbol: 'Kč' },
  { code: 'RON', label: '罗马尼亚列伊', symbol: 'lei' },
]

export interface RateCache {
  base: string
  date: string
  rates: Record<string, number>
  fetchedAt: number
}

const CACHE_KEY = 'tool.currency.rates'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const API_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR'

interface FrankfurterLatest {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

export function getCachedRates(): RateCache | null {
  return loadPersisted<RateCache | null>(CACHE_KEY, null)
}

export function isCacheFresh(cache: RateCache | null, now = Date.now()): boolean {
  if (!cache) return false
  return now - cache.fetchedAt < CACHE_TTL_MS
}

export async function fetchLatestRates(): Promise<RateCache> {
  const res = await fetch(API_URL)
  if (!res.ok) {
    throw new Error(`汇率请求失败（${res.status}）`)
  }
  const data = (await res.json()) as FrankfurterLatest
  if (!data?.base || !data?.rates) {
    throw new Error('汇率数据无效')
  }
  const cache: RateCache = {
    base: data.base,
    date: data.date,
    rates: data.rates,
    fetchedAt: Date.now(),
  }
  savePersisted(CACHE_KEY, cache)
  return cache
}

/** 优先用缓存；过期或 force 时拉取 */
export async function ensureRates(force = false): Promise<RateCache> {
  const cached = getCachedRates()
  if (!force && isCacheFresh(cached)) {
    return cached as RateCache
  }
  try {
    return await fetchLatestRates()
  } catch (e) {
    if (cached) return cached
    throw e
  }
}

function unitInBase(code: string, cache: RateCache): number {
  if (code === cache.base) return 1
  const rate = cache.rates[code]
  if (rate == null || rate <= 0) {
    throw new Error(`暂不支持币种 ${code}`)
  }
  return rate
}

/** 1 from = ? to */
export function getRate(from: string, to: string, cache: RateCache): number {
  if (from === to) return 1
  return unitInBase(to, cache) / unitInBase(from, cache)
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  cache: RateCache,
): number {
  return amount * getRate(from, to, cache)
}

export function formatAmount(value: number, code: string): string {
  const zeroDecimal = new Set(['JPY', 'KRW', 'IDR', 'ISK', 'HUF'])
  const max = zeroDecimal.has(code) ? 0 : 4
  const min = zeroDecimal.has(code) ? 0 : 2
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value)
}

export function formatRate(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

export function currencyLabel(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.label ?? code
}

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code
}
