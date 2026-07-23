// ZPL 역파서(순수 모듈) — 이 도구(zpl-generate)가 내보내는 명령 집합을 요소로 복원한다.
// 지원: ^XA ^XZ ^PW ^LL ^CI ^CF ^FX ^FO ^A<글꼴> ^FB ^FD ^FR ^FS ^BY ^BC ^B3 ^BE ^BU ^BQ ^GB ^GE ^GC ^GD ^GFA
// 미지원 명령은 라인 번호와 함께 오류로 보고한다(조용한 무시 금지 — WYSIWYG 보장 원칙).
//
// 알려진 손실 변환(생성 형식의 구조상 불가피):
// - 비트맵 글꼴은 대체 웹 글꼴과 셀 비율로 근사된다.
// - 표는 ^GB 조각+텍스트로 평탄화되어 나가므로 개별 박스/선/텍스트로 복원된다.
// - 합성 테두리(^GB)는 별도 박스 요소로 복원된다.
import { sanitizeBarcodeData, sanitizeFieldData, sanitizeZplText } from './sanitize'
import type { Align, BarcodeType, Ecc, Element, FontFace, Rotation } from './types'

// id 없는 파싱 요소 — id 는 훅이 시퀀스로 부여한다. (유니온에 분배 적용되는 Omit)
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type ParsedElement = DistributiveOmit<Element, 'id'>

export interface ParseOk {
  ok: true
  els: ParsedElement[]
  pw: number | null
  ll: number | null
}
export interface ParseErr {
  ok: false
  code: 'no_xa' | 'no_xz' | 'xq' | 'unsupported' | 'bad'
  line: number
  cmd?: string
}
export type ParseResult = ParseOk | ParseErr

interface Cmd {
  code: string
  params: string
  line: number
}

// 캐럿 명령 스트림으로 분해. `~` 제어 명령은 미지원으로 처리하기 위해 코드 앞에 '~' 를 남긴다.
function tokenize(txt: string): Cmd[] {
  const cmds: Cmd[] = []
  let line = 1
  let i = 0
  while (i < txt.length) {
    const ch = txt[i]
    if (ch === '\n') {
      line++
      i++
      continue
    }
    if (ch !== '^' && ch !== '~') {
      i++
      continue
    }
    const startLine = line
    const code = (ch === '~' ? '~' : '') + txt.slice(i + 1, i + 3).toUpperCase()
    i += 3
    let params = ''
    while (i < txt.length && txt[i] !== '^' && txt[i] !== '~') {
      if (txt[i] === '\n') line++
      params += txt[i]
      i++
    }
    cmds.push({ code, params, line: startLine })
  }
  return cmds
}

const rotOf = (c: string): Rotation => (c === 'R' ? 90 : c === 'I' ? 180 : c === 'B' ? 270 : 0)
const intAt = (parts: string[], i: number, dflt: number): number => {
  const v = parseInt(parts[i], 10)
  return Number.isFinite(v) ? v : dflt
}

// 기본 합성 테두리(요소 스키마 필수 필드).
const noBorder = () => ({ on: false, t: 2, pad: 6 })
const fontFace = (value: string): FontFace => {
  const face = value.toUpperCase()
  return /^[0A-Z]$/.test(face) ? face as FontFace : '0'
}
const defaultFontWidth = (face: FontFace, height: number): number => (face === 'A' ? Math.max(1, Math.round(height * 5 / 9)) : height)

export function parseZpl(txt: string): ParseResult {
  if (!/\^XA/.test(txt)) return { ok: false, code: 'no_xa', line: 1 }
  if (!/\^XZ/.test(txt)) return { ok: false, code: 'no_xz', line: 1 }

  const cmds = tokenize(txt)
  const els: ParsedElement[] = []
  let pw: number | null = null
  let ll: number | null = null
  let module = 3 // ^BY 지속 상태
  let byHeight = 100 // ^BY 기본 바 높이 지속 상태
  let cf: { face: FontFace; h: number; w: number } | null = null

  // 열린 필드(^FO … ^FS) 상태
  interface Field {
    x: number
    y: number
    line: number
    font?: { face: FontFace; rot: Rotation; h: number; w: number }
    fb?: { w: number; lines: number; align: Align }
    fd?: string
    bc?: { kind: BarcodeType; rot: Rotation; h: number; hri: boolean }
    qr?: { rot: Rotation; mag: number; ecc: Ecc }
    shape?: { kind: 'GB' | 'GE' | 'GC' | 'GD'; p: string[] }
    gfa?: { bytes: number; rowBytes: number; hex: string }
    fx?: boolean
    reverse?: boolean
    module: number
    byHeight: number
  }
  let f: Field | null = null
  let started = false
  let ended = false

  const finalize = (fld: Field): ParseErr | null => {
    const { x, y, line } = fld
    if (fld.fx) return null // 주석 필드 — 무시
    if (fld.gfa) {
      const rowBytes = Math.max(1, fld.gfa.rowBytes)
      const rows = Math.max(1, Math.round(fld.gfa.bytes / rowBytes))
      els.push({
        type: 'image',
        x,
        y,
        w: rowBytes * 8,
        h: rows,
        gfaHex: fld.gfa.hex,
        gfaRowBytes: rowBytes,
        gfaRows: rows,
        threshold: 128,
        dither: false,
        free: true,
        rot: 0,
        border: noBorder(),
        reverse: fld.reverse,
      })
      return null
    }
    if (fld.qr) {
      // FD 접두 <ecc>A, 가 실효 ECC — 있으면 ^BQ 파라미터보다 우선한다.
      let data = fld.fd ?? ''
      let ecc = fld.qr.ecc
      const m = /^([HQML])([AM]),/.exec(data)
      if (m) {
        ecc = m[1] as Ecc
        data = data.slice(m[0].length)
      }
      els.push({ type: 'qr', x, y, data: sanitizeFieldData(data), mag: fld.qr.mag, ecc, rot: fld.qr.rot, border: noBorder(), reverse: fld.reverse })
      return null
    }
    if (fld.bc) {
      const data = sanitizeBarcodeData(fld.bc.kind, fld.fd ?? '')
      els.push({
        type: 'barcode',
        x,
        y,
        bcType: fld.bc.kind,
        data,
        module: fld.module,
        h: fld.bc.h,
        hri: fld.bc.hri,
        rot: fld.bc.rot,
        border: noBorder(),
        reverse: fld.reverse,
      })
      return null
    }
    if (fld.shape) {
      const p = fld.shape.p
      if (fld.shape.kind === 'GB') {
        const w = intAt(p, 0, 1)
        const h = intAt(p, 1, 1)
        const t = intAt(p, 2, 1)
        // 생성 규칙 역추론: 두께와 같은 변은 선(line)으로 복원
        if (h <= t && w > t) els.push({ type: 'line', x, y, dir: 'h', len: w, t, reverse: fld.reverse })
        else if (w <= t && h > t) els.push({ type: 'line', x, y, dir: 'v', len: h, t, reverse: fld.reverse })
        else els.push({ type: 'box', x, y, w, h, t, reverse: fld.reverse })
      } else if (fld.shape.kind === 'GE') {
        els.push({ type: 'ellipse', x, y, w: intAt(p, 0, 1), h: intAt(p, 1, 1), t: intAt(p, 2, 1), reverse: fld.reverse })
      } else if (fld.shape.kind === 'GC') {
        els.push({ type: 'circle', x, y, d: intAt(p, 0, 30), t: intAt(p, 1, 1), reverse: fld.reverse })
      } else {
        const dir = (p[3] || 'L').trim() === 'R' ? 'R' : 'L'
        els.push({ type: 'diagonal', x, y, w: intAt(p, 0, 1), h: intAt(p, 1, 1), t: intAt(p, 2, 1), dir, reverse: fld.reverse })
      }
      return null
    }
    if (fld.font != null || fld.fd != null) {
      if (fld.fd == null) return { ok: false, code: 'bad', line }
      const font = fld.font ?? (cf ? { face: cf.face, rot: 0 as Rotation, h: cf.h, w: cf.w } : { face: '0' as FontFace, rot: 0 as Rotation, h: 30, w: 30 })
      const text = sanitizeZplText(fld.fd.split('\\&').join('\n'))
      els.push({
        type: 'text',
        x,
        y,
        w: fld.fb ? fld.fb.w : 0,
        font: font.h,
        fontW: font.w,
        text,
        align: fld.fb ? fld.fb.align : 'L',
        rot: font.rot,
        maxLines: fld.fb ? Math.max(1, fld.fb.lines) : 1,
        border: noBorder(),
        block: fld.fb != null,
        face: font.face,
        reverse: fld.reverse,
      })
      return null
    }
    // ^FO 만 있고 내용 없음 — 무시(빈 필드)
    return null
  }

  for (const c of cmds) {
    if (ended) break
    if (c.code === 'XA') {
      started = true
      continue
    }
    if (!started) return { ok: false, code: 'bad', line: c.line }
    if (c.code === 'XZ') {
      ended = true
      continue
    }
    if (c.code === 'XQ' || c.code === '~XQ') return { ok: false, code: 'xq', line: c.line }

    const p = c.params.split(',').map((s) => s.trim())
    if (f == null) {
      // 필드 밖 명령
      if (c.code === 'PW') pw = intAt(p, 0, 0) || pw
      else if (c.code === 'LL') ll = intAt(p, 0, 0) || ll
      else if (c.code === 'CI') continue
      else if (c.code === 'CF') {
        const face = fontFace(p[0] || cf?.face || '0')
        const h = intAt(p, 1, cf?.h ?? 30)
        cf = { face, h, w: intAt(p, 2, defaultFontWidth(face, h)) }
      }
      else if (c.code === 'BY') {
        module = Math.max(1, Math.min(10, intAt(p, 0, 3)))
        byHeight = Math.max(1, intAt(p, 2, byHeight))
      }
      else if (c.code === 'FX') continue
      else if (c.code === 'FO') f = { x: intAt(p, 0, 0), y: intAt(p, 1, 0), line: c.line, module, byHeight }
      else if (c.code === 'FS') continue
      else return { ok: false, code: 'unsupported', line: c.line, cmd: '^' + c.code }
      continue
    }

    // 필드 안 명령
    if (c.code === 'FS') {
      const err = finalize(f)
      if (err) return err
      f = null
    } else if (c.code === 'FO') {
      // 닫히지 않은 필드에서 새 ^FO — 형식 오류
      return { ok: false, code: 'bad', line: c.line }
    } else if (c.code[0] === 'A' && c.code.length === 2) {
      // params: "N,56,56" (회전문자, 높이, 폭)
      const face = fontFace(c.code[1])
      const rot = rotOf(p[0] || 'N')
      const h = intAt(p, 1, 30)
      f.font = { face, rot, h, w: intAt(p, 2, defaultFontWidth(face, h)) }
    } else if (c.code === 'FB') {
      const al = (p[3] || 'L').toUpperCase()
      f.fb = { w: intAt(p, 0, 360), lines: intAt(p, 1, 1), align: (['L', 'C', 'R', 'J'].includes(al) ? al : 'L') as Align }
    } else if (c.code === 'FD') {
      f.fd = c.params
    } else if (c.code === 'FX') {
      f.fx = true
    } else if (c.code === 'FR') {
      f.reverse = true
    } else if (c.code === 'BY') {
      f.module = Math.max(1, Math.min(10, intAt(p, 0, 3)))
      f.byHeight = Math.max(1, intAt(p, 2, f.byHeight))
      module = f.module
      byHeight = f.byHeight
    } else if (c.code === 'BC' || c.code === 'B3' || c.code === 'BE' || c.code === 'BU') {
      const rot = rotOf(p[0] || 'N')
      if (c.code === 'BC') f.bc = { kind: 'code128', rot, h: intAt(p, 1, f.byHeight), hri: (p[2] || 'Y').toUpperCase() === 'Y' }
      else if (c.code === 'B3') f.bc = { kind: 'code39', rot, h: intAt(p, 2, f.byHeight), hri: (p[3] || 'Y').toUpperCase() === 'Y' }
      else if (c.code === 'BE') f.bc = { kind: 'ean13', rot, h: intAt(p, 1, f.byHeight), hri: (p[2] || 'Y').toUpperCase() === 'Y' }
      else f.bc = { kind: 'upca', rot, h: intAt(p, 1, f.byHeight), hri: (p[2] || 'Y').toUpperCase() === 'Y' }
    } else if (c.code === 'BQ') {
      const rot = rotOf(p[0] || 'N')
      const eccP = (p[3] || 'M').toUpperCase()
      f.qr = { rot, mag: Math.max(1, Math.min(10, intAt(p, 2, 5))), ecc: (['L', 'M', 'Q', 'H'].includes(eccP) ? eccP : 'M') as Ecc }
    } else if (c.code === 'GB' || c.code === 'GE' || c.code === 'GC' || c.code === 'GD') {
      f.shape = { kind: c.code as 'GB' | 'GE' | 'GC' | 'GD', p }
    } else if (c.code === 'GF') {
      // ^GFA,b,b,rowBytes,hex — a=A(ASCII 헥스)만 지원
      if ((p[0] || '').toUpperCase() !== 'A') return { ok: false, code: 'unsupported', line: c.line, cmd: '^GF' + (p[0] || '') }
      const bytes = intAt(p, 2, 0) || intAt(p, 1, 0)
      const rowBytes = intAt(p, 3, 1)
      const hex = p.slice(4).join(',').replace(/\s+/g, '')
      if (!bytes || !rowBytes || !/^[0-9A-Fa-f]*$/.test(hex)) return { ok: false, code: 'bad', line: c.line }
      f.gfa = { bytes, rowBytes, hex: hex.toUpperCase() }
    } else {
      return { ok: false, code: 'unsupported', line: c.line, cmd: '^' + c.code }
    }
  }

  if (f != null) return { ok: false, code: 'bad', line: f.line }
  return { ok: true, els, pw, ll }
}
