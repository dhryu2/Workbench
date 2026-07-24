import { FONT_A_ATLAS } from './font-a-atlas'

export const FONT_A_ADVANCE = 6
export const FONT_A_CELL_HEIGHT = 9

export type FontAAlign = 'L' | 'C' | 'R' | 'J'

export interface FontABlock {
  w: number
  align: FontAAlign
  maxLines: number
  // ^FB 3번째 파라미터(줄 추가 간격, dot) — 줄 피치 = 9×vMag + gap (Labelary 실측)
  gap?: number
}

export interface FontALayoutLine {
  xOffset: number
  chars: string[]
}

interface AlphaGlyph {
  x0: number
  y0: number
  w: number
  h: number
  alpha: Uint8Array
}

type AtlasMag = 1 | 2 | 3 | 4 | 5

const decoded = new Map<AtlasMag, Record<string, AlphaGlyph>>()
const approximated = new Map<string, Record<string, AlphaGlyph>>()

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function exactAtlas(mag: AtlasMag): Record<string, AlphaGlyph> {
  const cached = decoded.get(mag)
  if (cached) return cached
  const source = FONT_A_ATLAS[String(mag) as keyof typeof FONT_A_ATLAS]
  const atlas: Record<string, AlphaGlyph> = {}
  for (const [char, glyph] of Object.entries(source)) {
    atlas[char] = { x0: glyph.x0, y0: glyph.y0, w: glyph.w, h: glyph.h, alpha: decodeBase64(glyph.a) }
  }
  decoded.set(mag, atlas)
  return atlas
}

function sampleBilinear(glyph: AlphaGlyph, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(glyph.w - 1, Math.floor(x)))
  const y0 = Math.max(0, Math.min(glyph.h - 1, Math.floor(y)))
  const x1 = Math.min(glyph.w - 1, x0 + 1)
  const y1 = Math.min(glyph.h - 1, y0 + 1)
  const fx = Math.max(0, Math.min(1, x - x0))
  const fy = Math.max(0, Math.min(1, y - y0))
  const top = glyph.alpha[y0 * glyph.w + x0] * (1 - fx) + glyph.alpha[y0 * glyph.w + x1] * fx
  const bottom = glyph.alpha[y1 * glyph.w + x0] * (1 - fx) + glyph.alpha[y1 * glyph.w + x1] * fx
  return Math.round(top * (1 - fy) + bottom * fy)
}

function scaledGlyph(glyph: AlphaGlyph, sourceMag: number, vMag: number, hMag: number): AlphaGlyph {
  if (glyph.w === 0 || glyph.h === 0) return { x0: 0, y0: 0, w: 0, h: 0, alpha: new Uint8Array() }
  const sx = hMag / sourceMag
  const sy = vMag / sourceMag
  const w = Math.max(1, Math.round(glyph.w * sx))
  const h = Math.max(1, Math.round(glyph.h * sy))
  const alpha = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      alpha[y * w + x] = sampleBilinear(glyph, (x + 0.5) / sx - 0.5, (y + 0.5) / sy - 0.5)
    }
  }
  return { x0: Math.round(glyph.x0 * sx), y0: Math.round(glyph.y0 * sy), w, h, alpha }
}

function atlasFor(vMag: number, hMag: number): Record<string, AlphaGlyph> {
  if (vMag === hMag && vMag >= 1 && vMag <= 5) return exactAtlas(vMag as AtlasMag)
  const key = `${vMag}:${hMag}`
  const cached = approximated.get(key)
  if (cached) return cached
  const nearest = Math.max(1, Math.min(5, Math.round((vMag + hMag) / 2))) as AtlasMag
  const source = exactAtlas(nearest)
  const atlas: Record<string, AlphaGlyph> = {}
  // 비등방 배율과 5배 초과 배율은 가장 가까운 실측 아틀라스를 알파 보간해 근사한다.
  for (const [char, glyph] of Object.entries(source)) atlas[char] = scaledGlyph(glyph, nearest, vMag, hMag)
  approximated.set(key, atlas)
  return atlas
}

export function fontAMag(h: number, w: number): { v: number; hz: number } {
  return {
    v: Math.max(1, Math.round(h / FONT_A_CELL_HEIGHT)),
    hz: Math.max(1, Math.round(w / 5)),
  }
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length === 0) return ['']
  const chunks = line.match(/\S+\s*|\s+/g) ?? ['']
  const lines: string[] = []
  let current = ''
  for (const chunk of chunks) {
    if (current.length > 0 && current.length + chunk.length > maxChars) {
      lines.push(current)
      current = ''
    }
    let rest = chunk
    while (rest.length > maxChars) {
      const room = maxChars - current.length
      if (room > 0) {
        current += rest.slice(0, room)
        rest = rest.slice(room)
      }
      lines.push(current)
      current = ''
    }
    current += rest
  }
  if (current.length > 0 || lines.length === 0) lines.push(current)
  return lines
}

export function fontALayout(text: string, hMag = 1, block?: FontABlock): FontALayoutLine[] {
  const sourceLines = String(text).split('\n')
  const lines = block
    ? sourceLines.flatMap((line) => wrapLine(line, Math.max(1, Math.floor(block.w / (FONT_A_ADVANCE * hMag)))))
    : sourceLines
  const limited = block ? lines.slice(0, Math.max(1, block.maxLines)) : lines
  return limited.map((line) => {
    const chars = Array.from(line)
    // 정렬 폭에서는 줄 끝 공백을 제외하고, 가운데 정렬에만 유령 한 칸 전진폭을 더한다.
    const alignedChars = Array.from(line.replace(/ +$/g, '')).length
    const advance = FONT_A_ADVANCE * hMag
    const xOffset = block?.align === 'C'
      ? Math.max(0, Math.round((block.w - (alignedChars + 1) * advance) / 2))
      : block?.align === 'R'
        ? Math.max(0, block.w - alignedChars * advance)
        : 0
    return { xOffset, chars }
  })
}

export function fontAAlphaGrid(
  text: string,
  vMag = 1,
  hMag = 1,
  block?: FontABlock,
): { x0: number; y0: number; w: number; h: number; alpha: Uint8Array } {
  const v = Math.max(1, Math.round(vMag))
  const hz = Math.max(1, Math.round(hMag))
  const atlas = atlasFor(v, hz)
  const lines = fontALayout(text, hz, block)
  const stamps: Array<{ x: number; y: number; glyph: AlphaGlyph }> = []

  lines.forEach((line, lineIndex) => {
    line.chars.forEach((char, charIndex) => {
      const glyph = atlas[char]
      if (!glyph || glyph.w === 0 || glyph.h === 0) return
      stamps.push({
        x: line.xOffset + charIndex * FONT_A_ADVANCE * hz + glyph.x0,
        y: lineIndex * (FONT_A_CELL_HEIGHT * v + (block?.gap ?? 0)) + glyph.y0,
        glyph,
      })
    })
  })

  if (stamps.length === 0) return { x0: 0, y0: 0, w: 0, h: 0, alpha: new Uint8Array() }
  const x0 = Math.min(...stamps.map((stamp) => stamp.x))
  const y0 = Math.min(...stamps.map((stamp) => stamp.y))
  const x1 = Math.max(...stamps.map((stamp) => stamp.x + stamp.glyph.w))
  const y1 = Math.max(...stamps.map((stamp) => stamp.y + stamp.glyph.h))
  const w = x1 - x0
  const h = y1 - y0
  const alpha = new Uint8Array(w * h)

  for (const stamp of stamps) {
    for (let y = 0; y < stamp.glyph.h; y++) {
      for (let x = 0; x < stamp.glyph.w; x++) {
        const source = stamp.glyph.alpha[y * stamp.glyph.w + x]
        const target = (stamp.y - y0 + y) * w + stamp.x - x0 + x
        if (source > alpha[target]) alpha[target] = source
      }
    }
  }
  return { x0, y0, w, h, alpha }
}
