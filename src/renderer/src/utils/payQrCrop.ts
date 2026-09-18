export type PayPlatform = 'wechat' | 'alipay' | 'unknown'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface PayCropOptions {
  /** 是否保留二维码下方的收款人名字，默认 true */
  keepName?: boolean
}

export interface PayCropResult {
  platform: PayPlatform
  keepName: boolean
  rect: Rect
  blob: Blob
  dataUrl: string
}

function isWhite(r: number, g: number, b: number): boolean {
  return r >= 220 && g >= 220 && b >= 220 && Math.max(r, g, b) - Math.min(r, g, b) <= 36
}

function isWechatGreen(r: number, g: number, b: number): boolean {
  return g > 100 && g >= r + 40 && g >= b + 30 && r < 140 && b < 140
}

function isAlipayBlue(r: number, g: number, b: number): boolean {
  return b > 100 && b >= r + 30 && b >= g + 15 && r < 120
}

function isBrandColor(r: number, g: number, b: number, platform: PayPlatform): boolean {
  if (platform === 'wechat') return isWechatGreen(r, g, b)
  if (platform === 'alipay') return isAlipayBlue(r, g, b)
  return isWechatGreen(r, g, b) || isAlipayBlue(r, g, b)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let objectUrl: string | null = null
    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      reject(new Error('图片加载失败'))
    }
    if (typeof source === 'string') {
      img.src = source
    } else {
      objectUrl = URL.createObjectURL(source)
      img.src = objectUrl
    }
  })
}

function detectPlatform(data: ImageData): PayPlatform {
  const { width, height, data: px } = data
  let green = 0
  let blue = 0
  const step = Math.max(4, Math.floor(Math.min(width, height) / 80))
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      if (isWechatGreen(r, g, b)) green += 1
      if (isAlipayBlue(r, g, b)) blue += 1
    }
  }
  if (green > blue * 1.2 && green > 30) return 'wechat'
  if (blue > green * 1.2 && blue > 30) return 'alipay'
  return 'unknown'
}

/**
 * 在品牌色（微信绿 / 支付宝蓝）包围区域内找白色收款卡片。
 * 旧算法按「连续高白占比行」切块，二维码黑块会把白行打断，导致识别失败。
 */
function findWhiteCardRect(data: ImageData, platform: PayPlatform): Rect | null {
  const { width, height, data: px } = data
  const minCardW = width * 0.3
  const brandMin = width * 0.08
  const gapTol = 3

  type RowHit = { y: number; x0: number; x1: number }
  const hits: RowHit[] = []

  for (let y = 0; y < height; y++) {
    let brandCount = 0
    let bx0 = width
    let bx1 = -1
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (!isBrandColor(px[i], px[i + 1], px[i + 2], platform)) continue
      brandCount += 1
      if (x < bx0) bx0 = x
      if (x > bx1) bx1 = x
    }
    if (brandCount < brandMin || bx1 < bx0) continue

    let leftBrand = false
    let rightBrand = false
    let cx0 = width
    let cx1 = -1
    for (let x = bx0; x <= bx1; x++) {
      const i = (y * width + x) * 4
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      if (isBrandColor(r, g, b, platform)) {
        if (cx1 < 0) leftBrand = true
        else rightBrand = true
        continue
      }
      // 卡片内容：白底 + 二维码/文字（非品牌色）
      if (x < cx0) cx0 = x
      if (x > cx1) cx1 = x
    }
    if (!leftBrand || !rightBrand || cx1 < cx0) continue
    if (cx1 - cx0 + 1 < minCardW) continue

    // 行内需有足够白像素，避免把纯绿/蓝装饰条当成卡片
    let white = 0
    for (let x = cx0; x <= cx1; x++) {
      const i = (y * width + x) * 4
      if (isWhite(px[i], px[i + 1], px[i + 2])) white += 1
    }
    if (white / (cx1 - cx0 + 1) < 0.12) continue

    hits.push({ y, x0: cx0, x1: cx1 })
  }

  if (hits.length === 0) return null

  // 合并近邻行，取最长一段
  type Run = { i0: number; i1: number; y0: number; y1: number }
  const runs: Run[] = []
  let i0 = 0
  for (let i = 1; i <= hits.length; i++) {
    const broken =
      i === hits.length || hits[i].y > hits[i - 1].y + gapTol
    if (!broken) continue
    runs.push({
      i0,
      i1: i - 1,
      y0: hits[i0].y,
      y1: hits[i - 1].y,
    })
    i0 = i
  }

  let best: Run | null = null
  for (const run of runs) {
    const h = run.y1 - run.y0 + 1
    if (h < height * 0.18) continue
    if (!best || h > best.y1 - best.y0 + 1) best = run
  }
  if (!best) return null

  let left = width
  let right = 0
  for (let i = best.i0; i <= best.i1; i++) {
    left = Math.min(left, hits[i].x0)
    right = Math.max(right, hits[i].x1)
  }
  if (right <= left) return null

  return {
    x: left,
    y: best.y0,
    w: right - left + 1,
    h: best.y1 - best.y0 + 1,
  }
}

function edgeBrandRatio(
  data: ImageData,
  rect: Rect,
  side: 'left' | 'right' | 'top' | 'bottom',
  platform: PayPlatform,
): number {
  const { width, data: px } = data
  const x1 = rect.x + rect.w - 1
  const y1 = rect.y + rect.h - 1
  let brand = 0
  let total = 0
  if (side === 'left' || side === 'right') {
    const x = side === 'left' ? rect.x : x1
    for (let y = rect.y; y <= y1; y++) {
      const i = (y * width + x) * 4
      if (isBrandColor(px[i], px[i + 1], px[i + 2], platform)) brand += 1
      total += 1
    }
  } else {
    const y = side === 'top' ? rect.y : y1
    for (let x = rect.x; x <= x1; x++) {
      const i = (y * width + x) * 4
      if (isBrandColor(px[i], px[i + 1], px[i + 2], platform)) brand += 1
      total += 1
    }
  }
  return total ? brand / total : 0
}

/** 去掉圆角白卡片轴对齐裁切后四角露出的品牌色 */
function trimBrandMargins(
  data: ImageData,
  rect: Rect,
  platform: PayPlatform,
): Rect {
  let { x, y, w, h } = rect
  const thresh = 0.01
  let guard = Math.max(w, h)
  while (guard-- > 0 && w > 8 && h > 8) {
    const cur = { x, y, w, h }
    let moved = false
    if (edgeBrandRatio(data, cur, 'left', platform) > thresh) {
      x += 1
      w -= 1
      moved = true
    } else if (edgeBrandRatio(data, cur, 'right', platform) > thresh) {
      w -= 1
      moved = true
    } else if (edgeBrandRatio(data, cur, 'top', platform) > thresh) {
      y += 1
      h -= 1
      moved = true
    } else if (edgeBrandRatio(data, cur, 'bottom', platform) > thresh) {
      h -= 1
      moved = true
    }
    if (!moved) break
  }
  return { x, y, w, h }
}

function makeSquareRect(rect: Rect, bounds: Rect): Rect {
  const side = Math.max(rect.w, rect.h)
  let x = Math.round(rect.x + rect.w / 2 - side / 2)
  let y = Math.round(rect.y + rect.h / 2 - side / 2)
  x = clamp(x, bounds.x, bounds.x + bounds.w - 1)
  y = clamp(y, bounds.y, bounds.y + bounds.h - 1)
  const w = clamp(side, 1, bounds.x + bounds.w - x)
  const h = clamp(side, 1, bounds.y + bounds.h - y)
  const sq = Math.min(w, h)
  return { x, y, w: sq, h: sq }
}

/** 在卡片内再找二维码，输出紧贴静区的 1:1 方框（不含品牌色） */
function findQrInsideCard(
  data: ImageData,
  card: Rect,
  platform: PayPlatform,
): Rect | null {
  const { width, data: px } = data
  const dark: boolean[] = []
  const cw = card.w
  const ch = card.h

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = ((card.y + y) * width + (card.x + x)) * 4
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      dark.push(lum < 90)
    }
  }

  const rowMix = new Float32Array(ch)
  for (let y = 0; y < ch; y++) {
    let d = 0
    for (let x = 0; x < cw; x++) if (dark[y * cw + x]) d += 1
    const ratio = d / cw
    rowMix[y] = ratio >= 0.12 && ratio <= 0.72 ? 1 : 0
  }

  let best: { y0: number; y1: number; len: number } | null = null
  let run = -1
  for (let y = 0; y <= ch; y++) {
    const ok = y < ch && rowMix[y] === 1
    if (ok && run < 0) run = y
    if ((!ok || y === ch) && run >= 0) {
      const y0 = run
      const y1 = y - 1
      const len = y1 - y0 + 1
      if (len > card.w * 0.45 && (!best || len > best.len)) {
        best = { y0, y1, len }
      }
      run = -1
    }
  }
  if (!best) return null

  let left = cw
  let right = 0
  for (let y = best.y0; y <= best.y1; y++) {
    for (let x = 0; x < cw; x++) {
      if (!dark[y * cw + x]) continue
      if (x < left) left = x
      if (x > right) right = x
    }
  }
  if (right <= left) return null

  const moduleW = right - left + 1
  const moduleH = best.y1 - best.y0 + 1
  const side = Math.max(moduleW, moduleH)
  // 静区：向外扩一圈白边，但不碰到品牌色
  const quiet = Math.max(4, Math.round(side * 0.08))
  const cx = card.x + (left + right) / 2
  const cy = card.y + (best.y0 + best.y1) / 2
  let half = side / 2 + quiet
  let qx = Math.round(cx - half)
  let qy = Math.round(cy - half)
  let qs = Math.round(side + quiet * 2)

  qx = clamp(qx, card.x, card.x + card.w - 1)
  qy = clamp(qy, card.y, card.y + card.h - 1)
  qs = Math.min(qs, card.x + card.w - qx, card.y + card.h - qy)

  let sq = makeSquareRect({ x: qx, y: qy, w: qs, h: qs }, card)
  sq = trimBrandMargins(data, sq, platform)
  sq = makeSquareRect(sq, card)
  // 再收一次，避免 square 后又蹭到绿边
  sq = trimBrandMargins(data, sq, platform)
  const finalSide = Math.min(sq.w, sq.h)
  return { x: sq.x, y: sq.y, w: finalSide, h: finalSide }
}

function resolveCropRect(
  card: Rect,
  qr: Rect | null,
  keepName: boolean,
): Rect {
  if (keepName || !qr) return card
  // 不保留名字时裁成 1:1 二维码
  return qr
}

async function cropToBlob(
  img: HTMLImageElement,
  rect: Rect,
  mime = 'image/png',
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(rect.w))
  canvas.height = Math.max(1, Math.round(rect.h))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  ctx.drawImage(
    img,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  const dataUrl = canvas.toDataURL(mime)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), mime)
  })
  return { blob, dataUrl }
}

export async function cropPayQrFromFile(
  file: File,
  options: PayCropOptions = {},
): Promise<PayCropResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  const keepName = options.keepName !== false
  const img = await loadImage(file)
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height

  // 缩小检测
  const maxSide = 720
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  const dw = Math.max(1, Math.round(srcW * scale))
  const dh = Math.max(1, Math.round(srcH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法创建画布')
  ctx.drawImage(img, 0, 0, dw, dh)
  const data = ctx.getImageData(0, 0, dw, dh)

  const platform = detectPlatform(data)
  const cardRaw = findWhiteCardRect(data, platform)
  if (!cardRaw) {
    throw new Error('未识别到收款卡片，请使用微信/支付宝收款码截图')
  }
  const cardSmall = trimBrandMargins(data, cardRaw, platform)

  const qrSmall = findQrInsideCard(data, cardSmall, platform)
  const rectSmall = resolveCropRect(cardSmall, qrSmall, keepName)

  const inv = 1 / scale
  const rect: Rect = {
    x: Math.round(rectSmall.x * inv),
    y: Math.round(rectSmall.y * inv),
    w: Math.round(rectSmall.w * inv),
    h: Math.round(rectSmall.h * inv),
  }
  rect.x = clamp(rect.x, 0, srcW - 1)
  rect.y = clamp(rect.y, 0, srcH - 1)
  rect.w = clamp(rect.w, 1, srcW - rect.x)
  rect.h = clamp(rect.h, 1, srcH - rect.y)

  const { blob, dataUrl } = await cropToBlob(img, rect)
  return { platform, keepName, rect, blob, dataUrl }
}

export function platformLabel(platform: PayPlatform): string {
  if (platform === 'wechat') return '微信'
  if (platform === 'alipay') return '支付宝'
  return '未知'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
