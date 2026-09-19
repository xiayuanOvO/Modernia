import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
import { stat } from 'node:fs/promises'

export interface FileHashResult {
  fileName: string
  filePath: string
  size: number
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

export async function hashFilePath(
  filePath: string,
  onProgress?: (progress: number) => void,
): Promise<FileHashResult> {
  const info = await stat(filePath)
  if (!info.isFile()) {
    throw new Error('请选择普通文件')
  }

  const size = info.size
  const md5 = createHash('md5')
  const sha1 = createHash('sha1')
  const sha256 = createHash('sha256')
  const sha512 = createHash('sha512')

  return new Promise((resolve, reject) => {
    let read = 0
    let lastPct = -1
    const stream = createReadStream(filePath)

    stream.on('data', (chunk: string | Buffer) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      md5.update(buf)
      sha1.update(buf)
      sha256.update(buf)
      sha512.update(buf)
      read += buf.length
      if (onProgress && size > 0) {
        const pct = Math.min(100, Math.floor((read / size) * 100))
        if (pct !== lastPct) {
          lastPct = pct
          onProgress(pct)
        }
      }
    })

    stream.on('error', (err) => {
      reject(err)
    })

    stream.on('end', () => {
      onProgress?.(100)
      resolve({
        fileName: basename(filePath),
        filePath,
        size,
        md5: md5.digest('hex'),
        sha1: sha1.digest('hex'),
        sha256: sha256.digest('hex'),
        sha512: sha512.digest('hex'),
      })
    })
  })
}
