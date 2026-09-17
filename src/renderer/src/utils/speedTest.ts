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

export function formatMbps(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value >= 100) return value.toFixed(0)
  if (value >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

export function formatMs(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value < 10 ? value.toFixed(1) : value.toFixed(0)
}
