export type ImageBase64Format = 'dataUrl' | 'raw'

/** 去掉空白，并剥离 data URL 前缀（若有） */
export function normalizeImageBase64(input: string): {
  mime: string
  base64: string
} {
  const trimmed = input.trim().replace(/\s+/g, '')
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(trimmed)
  if (match) {
    return { mime: match[1].toLowerCase(), base64: match[2] }
  }
  return { mime: sniffMime(trimmed) ?? 'image/png', base64: trimmed }
}

function sniffMime(base64: string): string | null {
  try {
    const head = atob(base64.slice(0, 24))
    const bytes = Array.from(head, (c) => c.charCodeAt(0))
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg'
    }
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return 'image/png'
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif'
    }
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp'
    }
  } catch {
    return null
  }
  return null
}

export function toImageDataUrl(input: string): string {
  const { mime, base64 } = normalizeImageBase64(input)
  if (!base64) throw new Error('Base64 内容为空')
  // 校验可解码
  atob(base64)
  return `data:${mime};base64,${base64}`
}

export function fileToBase64(
  file: File,
  format: ImageBase64Format,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      if (!dataUrl.startsWith('data:')) {
        reject(new Error('读取图片失败'))
        return
      }
      if (format === 'dataUrl') {
        resolve(dataUrl)
        return
      }
      const comma = dataUrl.indexOf(',')
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)
    }
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export function mimeToExt(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('svg')) return 'svg'
  return 'png'
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
