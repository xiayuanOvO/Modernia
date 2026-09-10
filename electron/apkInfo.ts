import { APK, signatureName, type CertificateInfo, type Signature } from 'apk-info-parser'

export interface ApkCertInfo {
  subject: string
  issuer: string
  serialNumber: string
  validFrom: string
  validUntil: string
  signatureType: string
  /** 连续小写十六进制 */
  md5: string
  /** 冒号分隔大写，如 AA:BB:CC */
  md5Colon: string
  sha1: string
  sha1Colon: string
  sha256: string
  sha256Colon: string
}

export interface ApkSignatureInfo {
  type: string
  typeLabel: string
  certificates: ApkCertInfo[]
}

export interface ApkParseResult {
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

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 归一化为连续小写 hex */
function toHex(value: string): string {
  return value.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
}

/** 转为 AA:BB:CC 大写冒号格式 */
function toColon(value: string): string {
  const hex = toHex(value)
  if (!hex) return value
  return (hex.match(/.{1,2}/g) ?? []).join(':').toUpperCase()
}

function mapCert(cert: CertificateInfo): ApkCertInfo {
  const md5 = toHex(cert.md5Fingerprint)
  const sha1 = toHex(cert.sha1Fingerprint)
  const sha256 = toHex(cert.sha256Fingerprint)
  return {
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    validFrom: formatDateTime(cert.validFrom),
    validUntil: formatDateTime(cert.validUntil),
    signatureType: cert.signatureType,
    md5,
    md5Colon: toColon(md5),
    sha1,
    sha1Colon: toColon(sha1),
    sha256,
    sha256Colon: toColon(sha256),
  }
}

function resolveAppName(apk: APK): string {
  const manifest = apk.getManifestInfo()
  const label = manifest.applicationLabel
  if (typeof label === 'string' && label.trim()) return label
  if (typeof label === 'number') {
    try {
      const resolved = apk.getResources().resolve(label)
      const preferred =
        resolved.find((r) => r.locale?.language === 'zh') ??
        resolved.find((r) => !r.locale?.language) ??
        resolved[0]
      if (preferred && typeof preferred.value === 'string') return preferred.value
    } catch {
      // resources.arsc may be missing or malformed
    }
  }
  return ''
}

function mapSignature(sig: Signature): ApkSignatureInfo | null {
  if (sig.type === 'unknown') return null
  return {
    type: sig.type,
    typeLabel: signatureName(sig),
    certificates: sig.certificates.map(mapCert),
  }
}

export function parseApkFile(filePath: string): ApkParseResult {
  const apk = new APK(filePath)
  const manifest = apk.getManifestInfo()
  const signatures = apk
    .getSignatures()
    .map(mapSignature)
    .filter((s): s is ApkSignatureInfo => s != null)

  return {
    fileName: filePath.split(/[/\\]/).pop() || filePath,
    filePath,
    packageName: manifest.package,
    appName: resolveAppName(apk),
    versionName: manifest.versionName,
    versionCode: manifest.versionCode,
    minSdkVersion: String(manifest.minSdkVersion ?? ''),
    targetSdkVersion: String(manifest.targetSdkVersion ?? ''),
    signatures,
  }
}
