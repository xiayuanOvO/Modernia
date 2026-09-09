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
  sha1: string
  sha256: string
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

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  apkApi: {
    selectAndParse: () => Promise<ApkSelectResult>
    parsePath: (filePath: string) => Promise<ApkParsePathResult>
  }
}
