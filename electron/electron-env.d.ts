/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

interface ApkCertInfo {
  subject: string
  issuer: string
  serialNumber: string
  validFrom: string
  validUntil: string
  signatureType: string
  md5: string
  md5Colon: string
  sha1: string
  sha1Colon: string
  sha256: string
  sha256Colon: string
}

interface ApkSignatureInfo {
  type: string
  typeLabel: string
  certificates: ApkCertInfo[]
}

interface ApkParseResult {
  fileName: string
  filePath: string
  packageName: string
  appName: string
  versionName: string
  versionCode: number
  minSdkVersion: string
  targetSdkVersion: string
  signatures: ApkSignatureInfo[]
}

type ApkSelectResult =
  | { canceled: true }
  | { canceled: false; data: ApkParseResult }
  | { canceled: false; error: string }

type ApkParsePathResult =
  | { data: ApkParseResult }
  | { error: string }

interface UpdateInfoLite {
  version: string
  releaseDate?: string
  releaseName?: string | null
  releaseNotes?: string | Array<{ version: string; note: string | null }> | null
}

interface UpdateProgressLite {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

type UpdateEventPayload =
  | { type: 'checking' }
  | { type: 'available'; info: UpdateInfoLite }
  | { type: 'not-available'; info: UpdateInfoLite }
  | { type: 'progress'; progress: UpdateProgressLite }
  | { type: 'downloaded'; info: UpdateInfoLite }
  | { type: 'error'; message: string }

type UpdateCheckResult =
  | { ok: true; updateInfo: UpdateInfoLite | null }
  | { ok: false; error: string }

type UpdateDownloadResult =
  | { ok: true }
  | { ok: false; error: string }

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  apkApi: {
    selectAndParse: () => Promise<ApkSelectResult>
    parsePath: (filePath: string) => Promise<ApkParsePathResult>
  }
  updateApi: {
    getVersion: () => Promise<string>
    check: () => Promise<UpdateCheckResult>
    download: () => Promise<UpdateDownloadResult>
    install: () => Promise<void>
    onEvent: (listener: (event: UpdateEventPayload) => void) => () => void
  }
}
