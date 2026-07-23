// ZPL Editor 순수 도메인 타입 — React/DOM 의존 없음.
// 요소(element)는 type 필드를 판별자로 하는 판별 유니온이다(README "요소 스키마").
// 저장 필드만 정의하고, 파생 크기(barcode.w, qr.w/h, circle.w/h, line.w/h, text.h, table.w/h)는
// geometry.ts의 norm()이 계산한다(상태에 저장하지 않음).

// ── 공통 값 유니온 ──
export type Unit = 'in' | 'mm'
export type Dpmm = 6 | 8 | 12 | 24
export type Rotation = 0 | 90 | 180 | 270
export type Align = 'L' | 'C' | 'R' | 'J'
export type BarcodeType = 'code128' | 'code39' | 'ean13' | 'upca'
export type Ecc = 'L' | 'M' | 'Q' | 'H'
export type LineDir = 'h' | 'v'
export type DiagonalDir = 'L' | 'R'

// text/barcode/qr/image 에만 존재하는 합성 테두리 스펙
export interface Border {
  on: boolean
  t: number
  pad: number
}

// 병합 사각형: 시작 (r,c) + rowspan rs, colspan cs
export interface Merge {
  r: number
  c: number
  rs: number
  cs: number
}

// ── 표 셀 ──
// (v2: 'image' 셀 타입 제거 — 업로드 UI 가 없고 실제 ^GFA 를 만들 수 없어 WYSIWYG 보장 불가)
export type CellType = 'text' | 'qr' | 'barcode' | 'empty'
export type CellHAlign = 'L' | 'C' | 'R'
export type CellVAlign = 'top' | 'mid' | 'bot'

export interface TableCell {
  type: CellType
  halign: CellHAlign
  valign: CellVAlign
  pad?: number
  text?: string
  font?: number
  data?: string
  mag?: number
}

// ── 요소 판별 유니온 ──
interface BaseElement {
  id: string
  x: number
  y: number
}

export interface TextElement extends BaseElement {
  type: 'text'
  w: number
  font: number
  fontW: number
  text: string
  align: Align
  rot: Rotation
  maxLines: number
  border: Border
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode'
  bcType: BarcodeType
  data: string
  module: number
  h: number
  hri: boolean
  rot: Rotation
  border: Border
  // w 는 파생(norm) — bcWidth() 로 데이터+모듈폭에서 계산
}

export interface QrElement extends BaseElement {
  type: 'qr'
  data: string
  mag: number
  ecc: Ecc
  rot: Rotation
  border: Border
  // w=h=모듈수*mag (파생)
}

export interface ImageElement extends BaseElement {
  type: 'image'
  w: number
  h: number
  orig?: string
  src?: string
  // 정확히 w×h dot 로 래스터한 1비트 비트맵의 ^GFA 헥스 데이터(래스터 완료 전엔 undefined).
  // gfaRowBytes/gfaRows 는 래스터 시점의 치수 — 리사이즈 직후 비동기 재래스터가 끝나기 전에도
  // ^GFA 헤더(바이트 수)와 데이터 길이가 항상 일치하도록 hex 와 한 세트로 저장한다.
  gfaHex?: string
  gfaRowBytes?: number
  gfaRows?: number
  threshold: number
  dither: boolean
  free: boolean
  rot: Rotation
  border: Border
}

export interface BoxElement extends BaseElement {
  type: 'box'
  w: number
  h: number
  t: number
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse'
  w: number
  h: number
  t: number
}

export interface CircleElement extends BaseElement {
  type: 'circle'
  d: number
  t: number
  // w=h=d (파생)
}

export interface LineElement extends BaseElement {
  type: 'line'
  dir: LineDir
  len: number
  t: number
  // w/h 는 dir+len+t 에서 파생
}

export interface DiagonalElement extends BaseElement {
  type: 'diagonal'
  w: number
  h: number
  t: number
  dir: DiagonalDir
}

export interface TableElement extends BaseElement {
  type: 'table'
  cols: number[]
  rows: number[]
  t: number
  pad: number
  merges: Merge[]
  cells: Record<string, TableCell>
  // w=Σcols, h=Σrows (파생)
}

export type Element =
  | TextElement
  | BarcodeElement
  | QrElement
  | ImageElement
  | BoxElement
  | EllipseElement
  | CircleElement
  | LineElement
  | DiagonalElement
  | TableElement

// 합성 테두리를 가질 수 있는 요소 (text/barcode/qr/image)
export type BorderableElement = TextElement | BarcodeElement | QrElement | ImageElement

// ── 에디터 상태 ──
export interface CellRef {
  r: number
  c: number
}

// 드래그 중 고스트 좌표
export interface DragGhost {
  x: number
  y: number
}

// undo/redo 스냅샷(요소 깊은복사 + id 시퀀스)
export interface HistorySnapshot {
  els: Element[]
  next: number
}

// state.zpl 슬라이스 형태(README "State Management")
export interface ZplState {
  els: Element[]
  sel: string | null
  hover: string | null
  selCell: CellRef | null
  selCells: CellRef[]
  codeOpen: boolean
  importOpen: boolean
  importText: string
  importError: string | null
  setupOpen: boolean
  tableDialog: boolean
  tableRows: string
  tableCols: string
  dragId: string | null
  drag: DragGhost | null
  zoom: number
  next: number
  copied: boolean
  unit: Unit
  w: string
  h: string
  dpmm: Dpmm
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  clip: Element | null
}

// ZPL 출력 한 줄. 헤더/푸터(^XA/^PW/^LL/^CI28/^XZ)는 isHeader=true, elId=null.
// 요소에서 나온 줄은 elId 로 캔버스 요소와 양방향 연동한다.
export type ZplLine = {
  text: string
  elId: string | null
  isHeader: boolean
}

// ── 상수(README 좌표계·단위) ──
export const DPI_BY_DPMM: Record<Dpmm, number> = { 6: 152, 8: 203, 12: 300, 24: 600 }

export const ZOOM_MIN = 0.26
export const ZOOM_MAX = 0.72
export const ZOOM_STEP = 0.06
export const ZOOM_DEFAULT = 0.42

export const HISTORY_MAX = 60
