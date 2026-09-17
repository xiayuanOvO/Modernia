import { randomFillSync } from 'node:crypto'
import { performance } from 'node:perf_hooks'

export type SpeedPhase = 'idle' | 'latency' | 'download' | 'upload' | 'done' | 'error'

export interface SpeedSourceInfo {
  id: string
  label: string
  region: string
  supportsUpload: boolean
}

export interface SpeedSample {
  sourceId: string
  sourceLabel: string
  latencyMs: number | null
  jitterMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  colo: string | null
  loc: string | null
  ip: string | null
  testedAt: number | null
}

export interface SpeedProgress {
  phase: SpeedPhase
  latencyMs: number | null
  jitterMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  progress: number
  message: string
}

interface SpeedSource {
  info: SpeedSourceInfo
  ping: (signal: AbortSignal) => Promise<number>
  download: (
    bytes: number,
    signal: AbortSignal,
    offset?: number,
  ) => Promise<{ bytes: number; elapsedMs: number }>
  upload?: (bytes: number, signal: AbortSignal) => Promise<{ bytes: number; elapsedMs: number }>
  /** 探测文件大小，用于限制 Range */
  probeSize?: (signal: AbortSignal) => Promise<number | null>
  meta?: (signal: AbortSignal) => Promise<{
    colo: string | null
    loc: string | null
    ip: string | null
  }>
}

const CF_DOWN = 'https://speed.cloudflare.com/__down'
const CF_UP = 'https://speed.cloudflare.com/__up'
const CF_TRACE = 'https://cloudflare.com/cdn-cgi/trace'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

function networkError(e: unknown, fallback: string): Error {
  if (e instanceof Error && e.name === 'AbortError') return e
  const msg = e instanceof Error ? e.message : String(e)
  if (/fetch|network|ENOTFOUND|ECONN|ETIMEDOUT|certificate/i.test(msg)) {
    return new Error('网络请求失败，请检查网络或代理')
  }
  return new Error(msg || fallback)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function meanAbsDiff(values: number[]): number {
  if (values.length < 2) return 0
  let sum = 0
  for (let i = 1; i < values.length; i++) {
    sum += Math.abs(values[i]! - values[i - 1]!)
  }
  return sum / (values.length - 1)
}

function mbps(bytes: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  return (bytes * 8) / (elapsedMs / 1000) / 1e6
}

async function readExact(
  res: Response,
  limit: number,
  t0: number,
): Promise<{ bytes: number; elapsedMs: number }> {
  if (!res.body) {
    const buf = await res.arrayBuffer()
    const n = Math.min(buf.byteLength, limit)
    return { bytes: n, elapsedMs: performance.now() - t0 }
  }
  const reader = res.body.getReader()
  let loaded = 0
  try {
    while (loaded < limit) {
      const { done, value } = await reader.read()
      if (done) break
      loaded += value.byteLength
      if (loaded >= limit) {
        await reader.cancel().catch(() => undefined)
        break
      }
    }
  } finally {
    reader.releaseLock()
  }
  return { bytes: Math.min(loaded, limit), elapsedMs: performance.now() - t0 }
}

async function rangedDownload(
  url: string,
  bytes: number,
  signal: AbortSignal,
  offset = 0,
): Promise<{ bytes: number; elapsedMs: number }> {
  const t0 = performance.now()
  const end = offset + bytes - 1
  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Range: `bytes=${offset}-${end}`,
      },
      cache: 'no-store',
      signal,
      redirect: 'follow',
    })
  } catch (e) {
    throw networkError(e, '下载失败')
  }
  if (!(res.ok || res.status === 206)) {
    throw new Error(`下载失败（${res.status}）`)
  }
  return readExact(res, bytes, t0)
}

async function rangedPing(url: string, signal: AbortSignal): Promise<number> {
  const t0 = performance.now()
  try {
    const res = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Range: 'bytes=0-0',
      },
      cache: 'no-store',
      signal,
      redirect: 'follow',
    })
    if (!(res.ok || res.status === 206)) {
      throw new Error(`延迟测试失败（${res.status}）`)
    }
    await res.arrayBuffer()
  } catch (e) {
    throw networkError(e, '延迟测试失败')
  }
  return performance.now() - t0
}

async function probeRemoteSize(url: string, signal: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Range: 'bytes=0-0',
      },
      cache: 'no-store',
      signal,
      redirect: 'follow',
    })
    const cr = res.headers.get('content-range')
    const m = cr?.match(/\/(\d+)\s*$/)
    if (m) return Number(m[1])
    const cl = res.headers.get('content-length')
    if (cl && Number(cl) > 1) return Number(cl)
  } catch {
    // ignore
  }
  return null
}

function makeUploadBody(bytes: number): Buffer {
  const chunk = Buffer.allocUnsafe(Math.min(bytes, 65536))
  randomFillSync(chunk)
  if (bytes <= chunk.length) return chunk.subarray(0, bytes)
  const body = Buffer.allocUnsafe(bytes)
  for (let offset = 0; offset < bytes; offset += chunk.length) {
    chunk.copy(body, offset, 0, Math.min(chunk.length, bytes - offset))
  }
  return body
}

function createFileSource(info: SpeedSourceInfo, fileUrl: string): SpeedSource {
  return {
    info,
    ping: (signal) => rangedPing(fileUrl, signal),
    download: (bytes, signal, offset = 0) => rangedDownload(fileUrl, bytes, signal, offset),
    probeSize: (signal) => probeRemoteSize(fileUrl, signal),
    meta: async () => ({
      colo: info.region,
      loc: null,
      ip: null,
    }),
  }
}

function buildDownloadPlan(fileSize: number | null): Array<{ bytes: number; streams: number }> {
  const hardMax = fileSize && fileSize > 0 ? Math.max(256 * 1024, fileSize) : 25_000_000
  const candidates = [1_000_000, 4_000_000, 8_000_000, 16_000_000]
    .map((n) => Math.min(n, hardMax))
    .filter((n, i, arr) => n >= 256 * 1024 && arr.indexOf(n) === i)

  if (!candidates.length) {
    candidates.push(Math.min(hardMax, 1_000_000))
  }

  return candidates.map((bytes) => {
    let streams = 1
    if (bytes >= 8_000_000 && (!fileSize || fileSize >= 40_000_000)) streams = 3
    else if (bytes >= 4_000_000) streams = 2
    return { bytes, streams }
  })
}

const cloudflareSource: SpeedSource = {
  info: {
    id: 'cloudflare',
    label: 'Cloudflare',
    region: '全球 Anycast',
    supportsUpload: true,
  },
  async ping(signal) {
    const t0 = performance.now()
    try {
      const res = await fetch(`${CF_DOWN}?bytes=0&r=${Math.random()}`, {
        cache: 'no-store',
        signal,
      })
      await res.arrayBuffer()
    } catch (e) {
      throw networkError(e, '延迟测试失败')
    }
    return performance.now() - t0
  },
  async download(bytes, signal) {
    const t0 = performance.now()
    let res: Response
    try {
      res = await fetch(`${CF_DOWN}?bytes=${bytes}&r=${Math.random()}`, {
        cache: 'no-store',
        signal,
      })
    } catch (e) {
      throw networkError(e, '下载失败')
    }
    if (!res.ok) throw new Error(`下载失败（${res.status}）`)
    return readExact(res, bytes, t0)
  },
  async upload(bytes, signal) {
    const body = makeUploadBody(bytes)
    const t0 = performance.now()
    let res: Response
    try {
      res = await fetch(`${CF_UP}?bytes=${bytes}`, {
        method: 'POST',
        body: new Uint8Array(body),
        cache: 'no-store',
        signal,
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    } catch (e) {
      throw networkError(e, '上传失败')
    }
    if (!res.ok) throw new Error(`上传失败（${res.status}）`)
    await res.arrayBuffer()
    return { bytes, elapsedMs: performance.now() - t0 }
  },
  async meta(signal) {
    try {
      const res = await fetch(CF_TRACE, { cache: 'no-store', signal })
      if (!res.ok) return { colo: null, loc: null, ip: null }
      const text = await res.text()
      const map: Record<string, string> = {}
      for (const line of text.split('\n')) {
        const i = line.indexOf('=')
        if (i > 0) map[line.slice(0, i)] = line.slice(i + 1).trim()
      }
      return {
        colo: map.colo ?? null,
        loc: map.loc ?? null,
        ip: map.ip ?? null,
      }
    } catch {
      return { colo: null, loc: null, ip: null }
    }
  },
}

const NODE_LINUX_XZ = 'node-v20.18.0-linux-x64.tar.xz'

const SOURCES: SpeedSource[] = [
  createFileSource(
    {
      id: 'aliyun',
      label: '阿里云',
      region: '中国',
      supportsUpload: false,
    },
    `https://mirrors.aliyun.com/nodejs-release/v20.18.0/${NODE_LINUX_XZ}`,
  ),
  createFileSource(
    {
      id: 'tencent',
      label: '腾讯云',
      region: '中国',
      supportsUpload: false,
    },
    `https://mirrors.cloud.tencent.com/nodejs-release/v20.18.0/${NODE_LINUX_XZ}`,
  ),
  createFileSource(
    {
      id: 'huawei',
      label: '华为云',
      region: '中国',
      supportsUpload: false,
    },
    `https://mirrors.huaweicloud.com/nodejs/v20.18.0/${NODE_LINUX_XZ}`,
  ),
  createFileSource(
    {
      id: 'npmmirror',
      label: 'npmmirror',
      region: '中国',
      supportsUpload: false,
    },
    'https://cdn.npmmirror.com/binaries/chrome-for-testing/131.0.6778.69/linux64/chrome-linux64.zip',
  ),
  createFileSource(
    {
      id: 'qq-cdn',
      label: '腾讯软件',
      region: '中国',
      supportsUpload: false,
    },
    'https://dldir1.qq.com/weixin/Windows/WeChatSetup.exe',
  ),
  cloudflareSource,
  createFileSource(
    {
      id: 'hetzner-fsn',
      label: 'Hetzner FSN',
      region: '德国 · 纽伦堡',
      supportsUpload: false,
    },
    'https://fsn1-speed.hetzner.com/100MB.bin',
  ),
  createFileSource(
    {
      id: 'hetzner-hel',
      label: 'Hetzner HEL',
      region: '芬兰 · 赫尔辛基',
      supportsUpload: false,
    },
    'https://hel1-speed.hetzner.com/100MB.bin',
  ),
  createFileSource(
    {
      id: 'hetzner-ash',
      label: 'Hetzner ASH',
      region: '美国 · 阿什本',
      supportsUpload: false,
    },
    'https://ash-speed.hetzner.com/100MB.bin',
  ),
  createFileSource(
    {
      id: 'ovh',
      label: 'OVH',
      region: '欧洲',
      supportsUpload: false,
    },
    'https://proof.ovh.net/files/100Mb.dat',
  ),
  createFileSource(
    {
      id: 'tele2',
      label: 'Tele2',
      region: '欧洲',
      supportsUpload: false,
    },
    'http://speedtest.tele2.net/100MB.zip',
  ),
]

export function listSpeedSources(): SpeedSourceInfo[] {
  return SOURCES.map((s) => s.info)
}

function getSource(id: string): SpeedSource {
  const found = SOURCES.find((s) => s.info.id === id)
  if (!found) throw new Error(`未知测速源：${id}`)
  return found
}

async function parallelTransfer(
  count: number,
  runOne: (streamIndex: number) => Promise<{ bytes: number; elapsedMs: number }>,
  onTick: (totalBytes: number, wallMs: number) => void,
): Promise<number> {
  const t0 = performance.now()
  let totalBytes = 0
  await Promise.all(
    Array.from({ length: count }, async (_, streamIndex) => {
      const result = await runOne(streamIndex)
      totalBytes += result.bytes
      onTick(totalBytes, performance.now() - t0)
      return result
    }),
  )
  return mbps(totalBytes, performance.now() - t0)
}

export async function runSpeedTest(
  sourceId: string,
  onProgress: (p: SpeedProgress) => void,
  signal: AbortSignal,
): Promise<SpeedSample> {
  const source = getSource(sourceId)
  const emit = (partial: Partial<SpeedProgress> & Pick<SpeedProgress, 'phase'>) => {
    onProgress({
      latencyMs: null,
      jitterMs: null,
      downloadMbps: null,
      uploadMbps: null,
      progress: 0,
      message: '',
      ...partial,
    })
  }

  emit({ phase: 'latency', progress: 0.02, message: '延迟' })
  const metaPromise = source.meta?.(signal) ?? Promise.resolve({
    colo: source.info.region,
    loc: null,
    ip: null,
  })
  const sizePromise = source.probeSize?.(signal) ?? Promise.resolve(null)

  const latencySamples: number[] = []
  const pingCount = 8
  for (let i = 0; i < pingCount; i++) {
    signal.throwIfAborted()
    latencySamples.push(await source.ping(signal))
    emit({
      phase: 'latency',
      latencyMs: median(latencySamples),
      jitterMs: meanAbsDiff(latencySamples),
      progress: 0.05 + ((i + 1) / pingCount) * 0.15,
      message: '延迟',
    })
  }

  const latencyMs = median(latencySamples)
  const jitterMs = meanAbsDiff(latencySamples)
  const [meta, fileSize] = await Promise.all([metaPromise, sizePromise])

  const hasUpload = Boolean(source.upload)
  const downloadProgressSpan = hasUpload ? 0.45 : 0.75

  emit({
    phase: 'download',
    latencyMs,
    jitterMs,
    progress: 0.22,
    message: '下载',
  })

  let downloadMbps = 0
  const downloadSizes = source.upload
    ? [
        { bytes: 1_000_000, streams: 1 },
        { bytes: 5_000_000, streams: 2 },
        { bytes: 12_000_000, streams: 3 },
        { bytes: 25_000_000, streams: 3 },
      ]
    : buildDownloadPlan(fileSize)

  for (let i = 0; i < downloadSizes.length; i++) {
    signal.throwIfAborted()
    const { bytes, streams } = downloadSizes[i]!
    try {
      const speed = await parallelTransfer(
        streams,
        (streamIndex) => {
          const span = fileSize && fileSize > bytes ? fileSize - bytes : bytes
          const offset =
            fileSize && fileSize > bytes
              ? Math.floor((streamIndex * 0.37 + Math.random() * 0.2) * span) % span
              : 0
          return source.download(bytes, signal, offset)
        },
        (totalBytes, wallMs) => {
          downloadMbps = Math.max(downloadMbps, mbps(totalBytes, wallMs))
          emit({
            phase: 'download',
            latencyMs,
            jitterMs,
            downloadMbps,
            progress:
              0.22 +
              ((i + totalBytes / (bytes * streams)) / downloadSizes.length) * downloadProgressSpan,
            message: '下载',
          })
        },
      )
      downloadMbps = Math.max(downloadMbps, speed)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e
      // 单档失败时跳过，尽量用已测峰值；全部失败再抛错
      if (i === downloadSizes.length - 1 && downloadMbps <= 0) throw e
    }
    emit({
      phase: 'download',
      latencyMs,
      jitterMs,
      downloadMbps,
      progress: 0.22 + ((i + 1) / downloadSizes.length) * downloadProgressSpan,
      message: '下载',
    })
  }

  if (downloadMbps <= 0) {
    throw new Error('下载测速失败，请更换测速源后重试')
  }

  let uploadMbps: number | null = null
  if (source.upload) {
    emit({
      phase: 'upload',
      latencyMs,
      jitterMs,
      downloadMbps,
      progress: 0.68,
      message: '上传',
    })

    uploadMbps = 0
    const uploadSizes = [
      { bytes: 500_000, streams: 1 },
      { bytes: 2_000_000, streams: 2 },
      { bytes: 8_000_000, streams: 2 },
      { bytes: 12_000_000, streams: 2 },
    ]

    for (let i = 0; i < uploadSizes.length; i++) {
      signal.throwIfAborted()
      const { bytes, streams } = uploadSizes[i]!
      const speed = await parallelTransfer(
        streams,
        () => source.upload!(bytes, signal),
        (totalBytes, wallMs) => {
          uploadMbps = Math.max(uploadMbps ?? 0, mbps(totalBytes, wallMs))
          emit({
            phase: 'upload',
            latencyMs,
            jitterMs,
            downloadMbps,
            uploadMbps,
            progress: 0.68 + ((i + totalBytes / (bytes * streams)) / uploadSizes.length) * 0.3,
            message: '上传',
          })
        },
      )
      uploadMbps = Math.max(uploadMbps, speed)
      emit({
        phase: 'upload',
        latencyMs,
        jitterMs,
        downloadMbps,
        uploadMbps,
        progress: 0.68 + ((i + 1) / uploadSizes.length) * 0.3,
        message: '上传',
      })
    }
  }

  const result: SpeedSample = {
    sourceId: source.info.id,
    sourceLabel: source.info.label,
    latencyMs,
    jitterMs,
    downloadMbps,
    uploadMbps,
    colo: meta.colo,
    loc: meta.loc,
    ip: meta.ip,
    testedAt: Date.now(),
  }

  emit({
    phase: 'done',
    latencyMs,
    jitterMs,
    downloadMbps,
    uploadMbps,
    progress: 1,
    message: '完成',
  })

  return result
}
