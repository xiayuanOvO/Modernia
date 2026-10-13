function makePalette(): Uint8Array {
  const palette = new Uint8Array(768)
  for (let i = 0; i < 256; i += 1) {
    palette[i * 3] = Math.round(((i >> 5) & 7) * 255 / 7)
    palette[i * 3 + 1] = Math.round(((i >> 2) & 7) * 255 / 7)
    palette[i * 3 + 2] = Math.round((i & 3) * 255 / 3)
  }
  return palette
}

const PALETTE = makePalette()

function writeWord(out: number[], value: number) {
  out.push(value & 0xff, (value >> 8) & 0xff)
}

function encodeLzw(indices: Uint8Array): Uint8Array {
  const clearCode = 256
  const endCode = 257
  let codeSize = 9
  let nextCode = 258
  let dictionary = new Map<number, number>()
  const bytes: number[] = []
  let bitBuffer = 0
  let bitCount = 0

  const emit = (code: number) => {
    bitBuffer |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff)
      bitBuffer >>>= 8
      bitCount -= 8
    }
  }
  const reset = () => {
    dictionary = new Map<number, number>()
    codeSize = 9
    nextCode = 258
  }

  emit(clearCode)
  if (indices.length > 0) {
    let prefix = indices[0]
    for (let i = 1; i < indices.length; i += 1) {
      const value = indices[i]
      const key = prefix * 256 + value
      const known = dictionary.get(key)
      if (known !== undefined) {
        prefix = known
        continue
      }

      emit(prefix)
      if (nextCode < 4096) {
        dictionary.set(key, nextCode)
        nextCode += 1
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1
      } else {
        emit(clearCode)
        reset()
      }
      prefix = value
    }
    emit(prefix)
  }
  emit(endCode)
  if (bitCount > 0) bytes.push(bitBuffer & 0xff)
  return Uint8Array.from(bytes)
}

function appendSubBlocks(out: number[], bytes: Uint8Array) {
  for (let offset = 0; offset < bytes.length; offset += 255) {
    const length = Math.min(255, bytes.length - offset)
    out.push(length)
    for (let i = 0; i < length; i += 1) out.push(bytes[offset + i])
  }
  out.push(0)
}

export class GifEncoder {
  private readonly chunks: Uint8Array[] = []
  private finished = false
  private readonly width: number
  private readonly height: number

  constructor(width: number, height: number, loop = 0) {
    if (width < 1 || width > 65535 || height < 1 || height > 65535) {
      throw new Error('GIF 尺寸超出范围')
    }
    this.width = width
    this.height = height
    const out: number[] = []
    for (const char of 'GIF89a') out.push(char.charCodeAt(0))
    writeWord(out, width)
    writeWord(out, height)
    out.push(0xf7, 0, 0)
    for (const color of PALETTE) out.push(color)
    // Netscape extension: loop forever (0), or the requested loop count.
    out.push(0x21, 0xff, 0x0b)
    for (const char of 'NETSCAPE2.0') out.push(char.charCodeAt(0))
    out.push(3, 1)
    writeWord(out, loop)
    out.push(0)
    this.chunks.push(Uint8Array.from(out))
  }

  addFrame(rgba: Uint8ClampedArray, delayMs: number) {
    if (this.finished) throw new Error('GIF 已结束')
    if (rgba.length !== this.width * this.height * 4) throw new Error('帧尺寸与 GIF 不一致')
    if (rgba.length % 4 !== 0) throw new Error('帧数据无效')
    const count = rgba.length / 4
    const indices = new Uint8Array(count)
    for (let i = 0, p = 0; i < count; i += 1, p += 4) {
      const r = rgba[p] >> 5
      const g = rgba[p + 1] >> 5
      const b = rgba[p + 2] >> 6
      indices[i] = (r << 5) | (g << 2) | b
    }

    const out: number[] = []
    out.push(0x21, 0xf9, 4, 0)
    writeWord(out, Math.max(2, Math.round(delayMs / 10)))
    out.push(0, 0)
    out.push(0x2c)
    writeWord(out, 0)
    writeWord(out, 0)
    writeWord(out, this.width)
    writeWord(out, this.height)
    out.push(0)
    out.push(8)
    appendSubBlocks(out, encodeLzw(indices))
    this.chunks.push(Uint8Array.from(out))
  }

  finish(): Blob {
    if (this.finished) throw new Error('GIF 已结束')
    this.finished = true
    this.chunks.push(Uint8Array.of(0x3b))
    return new Blob(this.chunks, { type: 'image/gif' })
  }
}
