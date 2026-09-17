import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { BrowserMultiFormatReader } from '@zxing/browser'

export type CodeKind = 'qr' | 'barcode'

export type QrEcc = 'L' | 'M' | 'Q' | 'H'

export type BarcodeFormat =
  | 'CODE128'
  | 'CODE39'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'ITF14'
  | 'codabar'
  | 'pharmacode'

export const QR_ECC_OPTIONS: { label: string; value: QrEcc }[] = [
  { label: 'L · 7%', value: 'L' },
  { label: 'M · 15%', value: 'M' },
  { label: 'Q · 25%', value: 'Q' },
  { label: 'H · 30%', value: 'H' },
]

export const BARCODE_FORMAT_OPTIONS: { label: string; value: BarcodeFormat }[] = [
  { label: 'CODE128', value: 'CODE128' },
  { label: 'CODE39', value: 'CODE39' },
  { label: 'EAN-13', value: 'EAN13' },
  { label: 'EAN-8', value: 'EAN8' },
  { label: 'UPC-A', value: 'UPC' },
  { label: 'ITF-14', value: 'ITF14' },
  { label: 'Codabar', value: 'codabar' },
  { label: 'Pharmacode', value: 'pharmacode' },
]

export interface QrGenerateOptions {
  size: number
  margin: number
  ecc: QrEcc
  dark: string
  light: string
}

export interface BarcodeGenerateOptions {
  format: BarcodeFormat
  displayValue: boolean
  width: number
  height: number
  margin: number
  lineColor: string
  background: string
}

export interface DecodeResult {
  text: string
  format: string
}

const reader = new BrowserMultiFormatReader()

export async function generateQrDataUrl(
  text: string,
  options: QrGenerateOptions,
): Promise<string> {
  const content = text.trim()
  if (!content) throw new Error('请输入内容')
  return QRCode.toDataURL(content, {
    width: options.size,
    margin: options.margin,
    errorCorrectionLevel: options.ecc,
    color: {
      dark: options.dark,
      light: options.light,
    },
  })
}

export function generateBarcodeDataUrl(
  text: string,
  options: BarcodeGenerateOptions,
): string {
  const content = text.trim()
  if (!content) throw new Error('请输入内容')

  const canvas = document.createElement('canvas')
  try {
    JsBarcode(canvas, content, {
      format: options.format,
      displayValue: options.displayValue,
      width: options.width,
      height: options.height,
      margin: options.margin,
      lineColor: options.lineColor,
      background: options.background,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(msg || '条形码生成失败，请检查内容与格式')
  }
  return canvas.toDataURL('image/png')
}

export async function decodeFromImageUrl(url: string): Promise<DecodeResult> {
  try {
    const result = await reader.decodeFromImageUrl(url)
    return {
      text: result.getText(),
      format: String(result.getBarcodeFormat()),
    }
  } catch {
    throw new Error('未能识别二维码或条形码')
  }
}

export async function decodeFromFile(file: File): Promise<DecodeResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  const url = URL.createObjectURL(file)
  try {
    return await decodeFromImageUrl(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function decodeFromClipboardImage(): Promise<DecodeResult | null> {
  if (!navigator.clipboard?.read) {
    throw new Error('当前环境不支持读取剪贴板图片')
  }
  const items = await navigator.clipboard.read()
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'))
    if (!type) continue
    const blob = await item.getType(type)
    const file = new File([blob], 'clipboard.png', { type: blob.type || 'image/png' })
    return decodeFromFile(file)
  }
  return null
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export async function copyDataUrlImage(dataUrl: string): Promise<void> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  if (!navigator.clipboard?.write) {
    throw new Error('当前环境不支持复制图片')
  }
  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type || 'image/png']: blob }),
  ])
}
