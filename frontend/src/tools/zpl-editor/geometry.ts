// 순수 기하/파생 크기 헬퍼 — support.js `_norm`/`_QMOD`/`_bcW`/`_textH`/`_cellRect`/`_mergedRect` 와
// 수식·반올림까지 동일하게 재현한다. React/DOM 의존 없음.
import qrcode from 'qrcode-generator'
import { DPI_BY_DPMM } from './types'
import type {
  Element,
  BarcodeElement,
  QrElement,
  TextElement,
  TableElement,
  Merge,
  Dpmm,
  Ecc,
  Unit,
} from './types'

// 셀/병합 사각형(표 로컬 좌표: 표 원점 기준 상대 x,y)
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// dpmm → dpi. 미지정 밀도는 203(8dpmm)으로 폴백.
export function dpiFor(dpmm: Dpmm): number {
  return DPI_BY_DPMM[dpmm] || 203
}

// 물리 크기 → dot 정수. mm 는 인치 환산 후 dpi 곱. 최소 1.
export function toDots(v: number, unit: Unit, dpi: number): number {
  return Math.max(1, Math.round(unit === 'mm' ? (v / 25.4) * dpi : v * dpi))
}

// QR 모듈 수(추정 테이블): 데이터 길이 구간별 고정값 — 인코딩 실패 시 폴백 전용.
export function qmod(data: string): number {
  const n = String(data || '').length
  return n > 60 ? 33 : n > 25 ? 29 : n > 12 ? 25 : 21
}

// 실제 QR 모듈 수 — qrcode-generator 로 (data, ecc) 를 실제 인코딩해 버전을 결정한다.
// norm() 이 렌더마다 호출하므로 (data, ecc) 키로 캐시하고, 인코딩 실패 시 qmod 로 폴백.
const qrModCache = new Map<string, number>()
export function qrModules(data: string, ecc: Ecc): number {
  const key = ecc + '|' + (data || '')
  const hit = qrModCache.get(key)
  if (hit != null) return hit
  let n: number
  try {
    // ESM 빌드 기본 stringToBytes 는 Latin1 절단 — 한글 안전하게 UTF-8 로 교체(qr-encode.ts 와 동일 처리)
    qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s))
    const qr = qrcode(0, ecc)
    qr.addData(data || '', 'Byte')
    qr.make()
    n = qr.getModuleCount()
  } catch {
    n = qmod(data)
  }
  if (qrModCache.size > 256) qrModCache.clear()
  qrModCache.set(key, n)
  return n
}

// 1D 바코드 파생 폭(dot). m=module. 심볼로지별 규격 폭 근사(README 수식).
export function bcWidth(el: BarcodeElement): number {
  const m = el.module || 3
  const len = String(el.data || '').length
  if (el.bcType === 'ean13' || el.bcType === 'upca') return (95 + 20) * m
  if (el.bcType === 'code39') return (16 * len + 25) * m
  return (11 * (len + 3) + 13) * m
}

// 텍스트 파생 높이: 폰트 × 1.18 × min(maxLines, 실제줄수), 최소 1줄.
export function textH(el: TextElement): number {
  const lines = Math.min(el.maxLines || 8, String(el.text || '').split('\n').length)
  return Math.round((el.font || 30) * 1.18 * Math.max(1, lines))
}

// QR 파생 변 길이(정사각): 실제 모듈수 × 배율(기본 5).
export function qrSize(el: QrElement): number {
  return qrModules(el.data, el.ecc || 'M') * (el.mag || 5)
}

// 표 전체 폭/높이 = 열폭 합 / 행높이 합.
export function tableW(t: TableElement): number {
  return (t.cols || []).reduce((a, b) => a + b, 0)
}
export function tableH(t: TableElement): number {
  return (t.rows || []).reduce((a, b) => a + b, 0)
}

// 요소별 파생 크기. 고정크기 타입은 저장된 w/h 를 그대로 반환.
export function norm(el: Element): { w: number; h: number } {
  switch (el.type) {
    case 'barcode':
      return { w: bcWidth(el), h: el.h }
    case 'qr': {
      const s = qrSize(el)
      return { w: s, h: s }
    }
    case 'circle':
      return { w: el.d, h: el.d }
    case 'line':
      return el.dir === 'v' ? { w: el.t, h: el.len } : { w: el.len, h: el.t }
    case 'text':
      return { w: el.w, h: textH(el) }
    case 'table':
      return { w: tableW(el), h: tableH(el) }
    case 'image':
    case 'box':
    case 'ellipse':
    case 'diagonal':
      return { w: el.w, h: el.h }
    default: {
      // 유니온 완전성 보장
      const _never: never = el
      return _never
    }
  }
}

// ── 표 셀 지오메트리(표 로컬 좌표) ──
// 셀 (r,c) 의 앞 열/행 누적 좌표 + 자기 폭/높이.
export function cellRect(t: TableElement, r: number, c: number): Rect {
  let x = 0
  for (let i = 0; i < c; i++) x += t.cols[i]
  let y = 0
  for (let i = 0; i < r; i++) y += t.rows[i]
  return { x, y, w: t.cols[c], h: t.rows[r] }
}

// (r,c) 를 포함하는 병합 사각형(없으면 undefined).
export function mergeAt(t: TableElement, r: number, c: number): Merge | undefined {
  return (t.merges || []).find((m) => r >= m.r && r < m.r + m.rs && c >= m.c && c < m.c + m.cs)
}

// 병합 영역 안이지만 시작 셀이 아닌 칸(렌더/편집 제외).
export function isHidden(t: TableElement, r: number, c: number): boolean {
  const m = mergeAt(t, r, c)
  return !!(m && !(m.r === r && m.c === c))
}

// (r,c) 의 실효 사각형: 병합 시작 셀이면 병합 전체, 아니면 단일 셀.
export function mergedRect(t: TableElement, r: number, c: number): Rect {
  const m = mergeAt(t, r, c)
  if (!m) return cellRect(t, r, c)
  const base = cellRect(t, m.r, m.c)
  let w = 0
  let h = 0
  for (let i = 0; i < m.cs; i++) w += t.cols[m.c + i]
  for (let i = 0; i < m.rs; i++) h += t.rows[m.r + i]
  return { x: base.x, y: base.y, w, h }
}
