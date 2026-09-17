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

const CATEGORY_URLS: Record<HardwareCategory, string> = {
  cpu: 'https://detail.zol.com.cn/cpu/',
  gpu: 'https://detail.zol.com.cn/vga/',
  motherboard: 'https://detail.zol.com.cn/motherboard/',
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

/** ZOL list card: product id + title + 参考价 + trailing markup (含商城价) */
const ITEM_RE =
  /<li[^>]*data-follow-id="p(\d+)"[\s\S]*?<h3><a href="([^"]+)" title="([^"]+)"[\s\S]*?<b class="price-type">(\d+)<\/b>([\s\S]*?)<\/li>/g

function absolutizeUrl(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `https://detail.zol.com.cn${href}`
  return `https://detail.zol.com.cn/${href}`
}

function cleanName(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse ￥3299 / &yen;2.12万 */
function parseYuanAmount(text: string): number | null {
  const wan = text.match(/(?:&yen;|￥|¥)\s*([0-9]+(?:\.[0-9]+)?)\s*万/i)
  if (wan) {
    const n = Number(wan[1]) * 10_000
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }
  const yuan = text.match(/(?:&yen;|￥|¥)\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (yuan) {
    const n = Number(yuan[1])
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }
  return null
}

function mallRank(url: string): number {
  if (/item\.jd\.com|union-click\.jd\.com|jd\.com/i.test(url)) return 0
  if (/tmall\.com|taobao\.com|s\.click\.taobao/i.test(url)) return 1
  return 2
}

function parseMallOffer(cardHtml: string): { price: number; url: string } | null {
  const blockMatch = cardHtml.match(/class="item-b2cprice">([\s\S]*?)<\/div>/i)
  if (!blockMatch) return null
  const block = blockMatch[1]

  const offers: { price: number; url: string; rank: number }[] = []
  const linkRe = /<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let link: RegExpExecArray | null
  while ((link = linkRe.exec(block)) != null) {
    const url = link[1]
    if (!/jd\.com|tmall\.com|taobao\.com|suning\.com|pinduoduo|yangkeduo/i.test(url)) {
      continue
    }
    const price = parseYuanAmount(link[2])
    if (price == null) continue
    offers.push({ price, url, rank: mallRank(url) })
  }

  if (offers.length === 0) {
    const price = parseYuanAmount(block)
    return price != null ? { price, url: '' } : null
  }

  offers.sort((a, b) => a.rank - b.rank || a.price - b.price)
  return { price: offers[0].price, url: offers[0].url }
}

function parseListHtml(html: string, category: HardwareCategory): HardwarePriceItem[] {
  const items: HardwarePriceItem[] = []
  const seen = new Set<string>()

  ITEM_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ITEM_RE.exec(html)) != null) {
    const proId = match[1]
    const detailUrl = absolutizeUrl(match[2])
    const name = cleanName(match[3])
    const refPrice = Number(match[4])
    const rest = match[5]

    if (!name || !Number.isFinite(refPrice) || refPrice <= 0) continue

    const id = `${category}-${proId}`
    if (seen.has(id)) continue
    seen.add(id)

    const mall = parseMallOffer(rest)
    const price = mall?.price ?? refPrice
    const url = mall?.url || detailUrl

    items.push({ id, name, price, url, category })
  }

  return items
}

async function fetchCategoryHtml(category: HardwareCategory): Promise<string> {
  const url = CATEGORY_URLS[category]
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: 'https://detail.zol.com.cn/',
    },
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    throw new Error(`获取 ${category} 报价失败（HTTP ${res.status}）`)
  }

  const buf = await res.arrayBuffer()
  return new TextDecoder('gbk').decode(buf)
}

export async function fetchHardwareCategory(
  category: HardwareCategory,
): Promise<HardwarePriceItem[]> {
  const html = await fetchCategoryHtml(category)
  const items = parseListHtml(html, category)
  if (items.length === 0) {
    throw new Error(`未解析到 ${category} 报价，页面结构可能已变更`)
  }
  return items
}

export async function fetchAllHardwarePrices(): Promise<HardwarePriceSnapshot> {
  const categories = Object.keys(CATEGORY_URLS) as HardwareCategory[]
  const results = await Promise.allSettled(categories.map((c) => fetchHardwareCategory(c)))

  const snapshot: HardwarePriceSnapshot = {
    cpu: [],
    gpu: [],
    motherboard: [],
    fetchedAt: Date.now(),
  }

  const errors: string[] = []
  categories.forEach((category, i) => {
    const result = results[i]
    if (result.status === 'fulfilled') {
      snapshot[category] = result.value
    } else {
      const msg =
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      errors.push(msg)
    }
  })

  if (snapshot.cpu.length + snapshot.gpu.length + snapshot.motherboard.length === 0) {
    throw new Error(errors[0] || '获取硬件报价失败')
  }

  return snapshot
}
