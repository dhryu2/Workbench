// ZPL 에디터 상태 훅 — 프로토타입(support.js)의 ZPL 관련 메서드/상호작용 수식을 React 훅으로 재구현.
// 순수 도메인 로직(파생 크기·ZPL 생성)은 엔진 모듈(geometry/zpl-generate)을 그대로 import 한다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { TFunction } from 'i18next'
import { HISTORY_MAX, ZOOM_MAX, ZOOM_MIN } from './types'
import type { BarcodeType, Dpmm, Element, Merge, TableCell, TableElement, Unit, ZplState } from './types'
import { dpiFor, mergeAt, norm, toDots } from './geometry'
import { buildZpl } from './zpl-generate'
import { parseZpl } from './zpl-parse'
import { gfaHexToDataUrl, makeEmblem, rasterize1bit } from './image-util'
import { sanitizeBarcodeData, sanitizeFieldData, sanitizeZplText } from './sanitize'

// 포인터 다운 이벤트의 최소 형태 — React 합성 이벤트와 Konva 의 원시 PointerEvent(e.evt)를
// 모두 구조적으로 수용한다(§5.4: 수식/임계/히스토리 의미는 불변, 이벤트 타입만 중립화).
export interface PointerLike {
  clientX: number
  clientY: number
  ctrlKey: boolean
  metaKey: boolean
  stopPropagation: () => void
  preventDefault: () => void
}

// ── 요소 필드 패치(부분 갱신) 타입 ── 유니온 요소에 좁은 캐스트로 되돌린다.
type Patch = Record<string, unknown>
function patchEl(el: Element, patch: Patch): Element {
  // 모든 편집은 새 객체를 만들어 넣으므로(불변) 히스토리 스냅샷과 공유 참조가 오염되지 않는다.
  return { ...el, ...patch } as Element
}

async function writeClipboardText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 권한 거부·비보안 컨텍스트이면 동기 폴백을 시도한다.
  }

  const textarea = document.createElement('textarea')
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  textarea.value = text
  textarea.readOnly = true
  textarea.setAttribute('aria-hidden', 'true')
  Object.assign(textarea.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.appendChild(textarea)
  try {
    textarea.focus({ preventScroll: true })
  } catch {
    textarea.focus()
  }
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  } finally {
    textarea.remove()
    try {
      active?.focus({ preventScroll: true })
    } catch {
      // 기존 포커스 복원 실패는 복사 성공 여부에 영향을 주지 않는다.
    }
  }
  return copied
}

// 스냅샷용 얕은 요소 복사(중첩 구조는 편집 시 항상 새로 만들므로 공유 안전).
function cloneEls(els: Element[]): Element[] {
  return els.map((e) => ({ ...e }))
}

// ── 타입별 리사이즈 규칙(support.js `_applyResize`) ── role 별로 저장 필드 패치를 반환.
function applyResize(el: Element, role: string, dx: number, dy: number): Patch {
  const clampMin = (v: number, m: number) => Math.max(m, Math.round(v))
  const has = (ch: string) => role.indexOf(ch) >= 0
  if (el.type === 'text') {
    if (role === 'wL') {
      const w = clampMin(el.w - dx, 40)
      return { x: el.x + (el.w - w), w }
    }
    return { w: clampMin(el.w + dx, 40) }
  }
  if (el.type === 'barcode') {
    // 폭은 데이터+모듈로 자동 — 높이만 조절
    if (role === 'hT') {
      const h = clampMin(el.h - dy, 24)
      return { y: el.y + (el.h - h), h }
    }
    return { h: clampMin(el.h + dy, 24) }
  }
  if (el.type === 'qr') {
    const size0 = norm(el).w // 현재 정사각 변(모듈수*mag)
    const mods = size0 / (el.mag || 5)
    const ds = ((has('e') ? dx : -dx) + (has('s') ? dy : -dy)) / 2
    const mag = Math.max(1, Math.min(10, Math.round((size0 + ds) / mods)))
    const size = mods * mag
    const patch: Patch = { mag }
    if (has('w')) patch.x = el.x + (size0 - size)
    if (has('n')) patch.y = el.y + (size0 - size)
    return patch
  }
  if (el.type === 'circle') {
    const ds = ((has('e') ? dx : -dx) + (has('s') ? dy : -dy)) / 2
    const d = clampMin(el.d + ds, 30)
    const patch: Patch = { d }
    if (has('w')) patch.x = el.x + (el.d - d)
    if (has('n')) patch.y = el.y + (el.d - d)
    return patch
  }
  if (el.type === 'image' && !el.free) {
    const r = el.w / el.h
    const ds = ((has('e') ? dx : -dx) + (has('s') ? dy : -dy)) / 2
    const w = clampMin(el.w + ds, 24)
    const h = clampMin(w / r, 24)
    const patch: Patch = { w, h }
    if (has('w')) patch.x = el.x + (el.w - w)
    if (has('n')) patch.y = el.y + (el.h - h)
    return patch
  }
  if (el.type === 'line') {
    if (el.dir === 'v') {
      if (role === 'p1') {
        const len = clampMin(el.len - dy, 20)
        return { y: el.y + (el.len - len), len }
      }
      return { len: clampMin(el.len + dy, 20) }
    }
    if (role === 'p1') {
      const len = clampMin(el.len - dx, 20)
      return { x: el.x + (el.len - len), len }
    }
    return { len: clampMin(el.len + dx, 20) }
  }
  if (el.type === 'table') return {} // 표는 핸들 없음(도달하지 않음)
  // box / ellipse / diagonal / image(free): 8방향 또는 4모서리 자유 리사이즈
  let x = el.x
  let y = el.y
  let w = el.w
  let h = el.h
  if (has('e')) w = el.w + dx
  if (has('s')) h = el.h + dy
  if (has('w')) w = el.w - dx
  if (has('n')) h = el.h - dy
  w = clampMin(w, 24)
  h = clampMin(h, 24)
  if (has('w')) x = el.x + (el.w - w)
  if (has('n')) y = el.y + (el.h - h)
  return { x, y, w, h }
}

// ── 병합 후보 판정(support.js `_selFootprint`/`_mergeRect`) ──
function selFootprint(t: TableElement, cells: { r: number; c: number }[]): Set<string> {
  const set = new Set<string>()
  for (const p of cells) {
    const m = mergeAt(t, p.r, p.c)
    if (m) {
      for (let r = m.r; r < m.r + m.rs; r++) for (let c = m.c; c < m.c + m.cs; c++) set.add(r + '_' + c)
    } else set.add(p.r + '_' + p.c)
  }
  return set
}
function mergeRectOf(t: TableElement, cells: { r: number; c: number }[]): Merge | null {
  if (!cells || cells.length < 2) return null
  const set = selFootprint(t, cells)
  let minR = Infinity
  let minC = Infinity
  let maxR = -1
  let maxC = -1
  for (const k of set) {
    const [r, c] = k.split('_').map(Number)
    minR = Math.min(minR, r)
    maxR = Math.max(maxR, r)
    minC = Math.min(minC, c)
    maxC = Math.max(maxC, c)
  }
  const rs = maxR - minR + 1
  const cs = maxC - minC + 1
  // bounding box 면적 == 발자국 셀 수일 때만(=빈틈 없는 직사각형) 병합 허용
  if (rs * cs !== set.size) return null
  return { r: minR, c: minC, rs, cs }
}

// 기본 라벨 스펙: 4×6 in @ 8dpmm(203dpi).
const DEFAULT_SPEC = { unit: 'in' as Unit, w: '4', h: '6', dpmm: 8 as Dpmm }

// 초기 상태 — 빈 라벨에서 시작한다(v2: 데모 시드 제거).
function makeInitialState(): ZplState {
  return {
    els: [],
    sel: null,
    hover: null,
    selCell: null,
    selCells: [],
    codeOpen: false,
    importOpen: false,
    importText: '',
    importError: null,
    setupOpen: false,
    tableDialog: false,
    tableRows: '3',
    tableCols: '3',
    dragId: null,
    drag: null,
    zoom: 0.42,
    next: 100,
    copied: false,
    unit: DEFAULT_SPEC.unit,
    w: DEFAULT_SPEC.w,
    h: DEFAULT_SPEC.h,
    dpmm: DEFAULT_SPEC.dpmm,
    past: [],
    future: [],
    clip: null,
  }
}

const BORDERABLE = new Set(['text', 'barcode', 'qr', 'image'])

// 샘플 ZPL(가져오기 다이얼로그 초기값) — 파서가 지원하는 명령만 사용(영문/ASCII).
const SAMPLE_ZPL = [
  '^XA',
  '^PW812',
  '^LL1218',
  '^CI28',
  '^FO52,50^A0N,56,56^FB596,1,0,C^FDPART LABEL^FS',
  '^FO52,140^GB700,3,3^FS',
  '^FO600,180^BQN,2,5,M^FDMA,WB-4061-203^FS',
  '^FO52,220^BY3^BCN,170,Y,N,N^FD8829301047^FS',
  '^XZ',
].join('\n')

export function useZplEditor(t: TFunction) {
  const [z, setZ] = useState<ZplState>(makeInitialState)

  // 이벤트 핸들러가 최신 상태를 동기적으로 읽기 위한 미러 ref.
  const zRef = useRef(z)
  useEffect(() => {
    zRef.current = z
  })
  // 번역 함수 ref(핸들러가 최신 t 참조).
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  })

  const editSig = useRef<string | null>(null)
  const copyTimer = useRef<number | undefined>(undefined)

  const patchZ = useCallback((p: Partial<ZplState>) => {
    setZ((s) => ({ ...s, ...p }))
  }, [])

  // ── 히스토리 push(편집 전 스냅샷). sig 로 연속 편집을 1개 스냅샷으로 합침. ──
  const pushPast = useCallback((sig?: string) => {
    if (sig && editSig.current === sig) return
    editSig.current = sig ?? null
    setZ((s) => ({
      ...s,
      past: [...s.past, { els: cloneEls(s.els), next: s.next }].slice(-HISTORY_MAX),
      future: [],
    }))
  }, [])

  // 요소 배열 변형 헬퍼.
  const mapEls = useCallback((fn: (els: Element[]) => Element[]) => {
    setZ((s) => ({ ...s, els: fn(s.els) }))
  }, [])

  // ── 선택/hover ──
  const selectEl = useCallback((id: string) => {
    setZ((s) => ({ ...s, sel: id, selCell: null, selCells: [] }))
  }, [])
  const deselect = useCallback(() => {
    setZ((s) => ({ ...s, sel: null, selCell: null, selCells: [] }))
  }, [])
  const hoverEl = useCallback((id: string | null) => patchZ({ hover: id }), [patchZ])
  const clearHover = useCallback(() => patchZ({ hover: null }), [patchZ])

  const toggleCode = useCallback(() => setZ((s) => ({ ...s, codeOpen: !s.codeOpen })), [])
  const zoomBy = useCallback((d: number) => {
    setZ((s) => ({ ...s, zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(s.zoom + d).toFixed(2))) }))
  }, [])

  // ── undo / redo ──
  const undo = useCallback(() => {
    editSig.current = null
    setZ((s) => {
      if (!s.past.length) return s
      const snap = s.past[s.past.length - 1]
      const cur = { els: cloneEls(s.els), next: s.next }
      const sel = snap.els.some((e) => e.id === s.sel) ? s.sel : null
      return {
        ...s,
        els: cloneEls(snap.els),
        next: snap.next,
        sel,
        selCell: null,
        selCells: [],
        past: s.past.slice(0, -1),
        future: [...s.future, cur],
      }
    })
  }, [])
  const redo = useCallback(() => {
    editSig.current = null
    setZ((s) => {
      if (!s.future.length) return s
      const snap = s.future[s.future.length - 1]
      const cur = { els: cloneEls(s.els), next: s.next }
      const sel = snap.els.some((e) => e.id === s.sel) ? s.sel : null
      return {
        ...s,
        els: cloneEls(snap.els),
        next: snap.next,
        sel,
        selCell: null,
        selCells: [],
        future: s.future.slice(0, -1),
        past: [...s.past, cur],
      }
    })
  }, [])

  // ── copy / paste ──
  const copySel = useCallback(() => {
    const s = zRef.current
    if (!s.sel) return
    const el = s.els.find((e) => e.id === s.sel)
    if (!el) return
    patchZ({ clip: { ...el } })
  }, [patchZ])
  const pasteClip = useCallback(() => {
    const clip = zRef.current.clip
    if (!clip) return
    pushPast()
    setZ((s) => {
      const id = 'z' + s.next
      const el = patchEl(clip, { id, x: (clip.x || 0) + 24, y: (clip.y || 0) + 24 })
      return { ...s, els: [...s.els, el], sel: id, selCell: null, selCells: [], next: s.next + 1 }
    })
  }, [pushPast])

  // ── 이미지 재래스터(업로드/리사이즈/임계값·디더 변경 후) ──
  // setTimeout(0) 으로 커밋 이후(zRef 최신화 후) 최신 w/h/threshold 를 읽어 래스터화한다.
  // 결과의 src(캔버스 프리뷰)와 hex(^GFA 데이터)는 같은 1비트 픽셀에서 나온다 — WYSIWYG 보장.
  const reraster = useCallback((id: string) => {
    window.setTimeout(() => {
      const el = zRef.current.els.find((e) => e.id === id)
      if (!el || el.type !== 'image' || !el.orig) return
      void rasterize1bit(el.orig, el.w, el.h, el.threshold, el.dither).then((r) => {
        if (r)
          mapEls((els) =>
            els.map((x) =>
              x.id === id && x.type === 'image'
                ? { ...x, src: r.src, gfaHex: r.hex, gfaRowBytes: r.rowBytes, gfaRows: r.rows }
                : x,
            ),
          )
      })
    }, 0)
  }, [mapEls])

  // ── 삽입 ──
  const openTableDialog = useCallback(() => patchZ({ tableDialog: true, tableRows: '3', tableCols: '3' }), [patchZ])
  const closeTableDialog = useCallback(() => patchZ({ tableDialog: false }), [patchZ])

  const addEl = useCallback(
    (type: Element['type']) => {
      if (type === 'table') {
        openTableDialog()
        return
      }
      pushPast()
      const tr = tRef.current
      setZ((s) => {
        const id = 'z' + s.next
        const x = 130
        const y = 130
        let el: Element
        if (type === 'text')
          el = { id, type, x, y, w: 360, font: 38, fontW: 38, text: tr('z_new_text'), align: 'L', rot: 0, maxLines: 1, border: { on: false, t: 2, pad: 6 }, block: true, face: '0' }
        else if (type === 'barcode')
          el = { id, type, x, y, bcType: 'code128', data: '1234567890', module: 3, h: 150, hri: true, rot: 0, border: { on: false, t: 2, pad: 8 } }
        else if (type === 'qr')
          el = { id, type, x, y, data: 'https://workbench.tools', mag: 5, ecc: 'M', rot: 0, border: { on: false, t: 2, pad: 6 } }
        else if (type === 'image') {
          const emblem = makeEmblem()
          el = { id, type, x, y, w: 180, h: 180, orig: emblem, src: emblem, threshold: 128, dither: false, free: false, rot: 0, border: { on: false, t: 2, pad: 6 } }
        } else if (type === 'box') el = { id, type, x, y, w: 320, h: 220, t: 3 }
        else if (type === 'ellipse') el = { id, type, x, y, w: 300, h: 190, t: 3 }
        else if (type === 'circle') el = { id, type, x, y, d: 200, t: 3 }
        else if (type === 'diagonal') el = { id, type, x, y, w: 300, h: 190, t: 4, dir: 'L' }
        else el = { id, type: 'line', x, y, dir: 'h', len: 400, t: 4 }
        return { ...s, els: [...s.els, el], sel: id, selCell: null, selCells: [], next: s.next + 1 }
      })
      // 이미지 요소는 추가 직후 래스터해 src/gfaHex 를 채운다(id 는 커밋될 시퀀스와 동일).
      if (type === 'image') reraster('z' + zRef.current.next)
    },
    [openTableDialog, pushPast, reraster],
  )

  const deleteSel = useCallback(() => {
    const s = zRef.current
    if (!s.sel) return
    pushPast()
    setZ((st) => ({ ...st, els: st.els.filter((e) => e.id !== st.sel), sel: null, selCell: null, selCells: [] }))
  }, [pushPast])

  // ── 속성 필드 변경 ──
  const setField = useCallback(
    (key: string, val: string | number | boolean, numeric?: boolean) => {
      const s = zRef.current
      const id = s.sel
      if (!id) return
      const target = s.els.find((e) => e.id === id)
      if (!target) return
      pushPast(id + ':' + key)
      let v: string | number | boolean = numeric ? (typeof val === 'number' ? val : parseInt(String(val), 10) || 0) : val
      // 제약 패리티: ZPL 파라미터 유효범위를 필드 레벨에서 강제
      if (typeof v === 'number') {
        if (key === 'font' || key === 'fontW') v = Math.max(10, v) // ^A0 최소 글리프 10dot
        else if (key === 'mag' || key === 'module') v = Math.max(1, Math.min(10, v)) // ^BQ 배율·^BY 모듈 1–10
        else if (key === 'threshold') v = Math.max(0, Math.min(255, v))
        else if (key === 'maxLines') v = Math.max(1, v)
        else if (key === 't') v = Math.max(1, v) // ^GB/^GE/^GC/^GD 두께 ≥1
        else if (key === 'border.t') v = Math.max(1, v)
        else if (key === 'x' || key === 'y' || key === 'border.pad') v = Math.max(0, v)
        else if (key === 'w' || key === 'h' || key === 'len' || key === 'd') v = Math.max(1, v)
      }
      // 문자 제약: ZPL 내장 폰트/^FD 가 출력 가능한 문자만(비ASCII·제어문자 차단)
      if (typeof v === 'string') {
        if (key === 'text') v = sanitizeZplText(v)
        else if (key === 'data') v = target.type === 'barcode' ? sanitizeBarcodeData(target.bcType, v) : sanitizeFieldData(v)
      }
      mapEls((els) =>
        els.map((e) => {
          if (e.id !== id) return e
          if (key.indexOf('border.') === 0) {
            const cur = 'border' in e ? e.border : { on: false, t: 2, pad: 6 }
            return patchEl(e, { border: { ...cur, [key.slice(7)]: v } })
          }
          // 심볼로지 변경 시 기존 데이터를 새 문자셋으로 재정제
          if (key === 'bcType' && e.type === 'barcode') {
            return patchEl(e, { bcType: v, data: sanitizeBarcodeData(v as BarcodeType, e.data) })
          }
          return patchEl(e, { [key]: v })
        }),
      )
      const el = zRef.current.els.find((e) => e.id === id)
      if (el && el.type === 'image') reraster(id)
    },
    [mapEls, pushPast, reraster],
  )
  const toggleBorder = useCallback(() => {
    const el = zRef.current.els.find((e) => e.id === zRef.current.sel)
    if (!el || !('border' in el)) return
    setField('border.on', !el.border.on)
  }, [setField])
  const toggleField = useCallback(
    (key: string) => {
      const el = zRef.current.els.find((e) => e.id === zRef.current.sel)
      if (!el) return
      const cur = (el as unknown as Record<string, unknown>)[key]
      setField(key, !cur)
    },
    [setField],
  )

  // ── 드래그 이동(2px 임계, 고스트, 음수 클램프) ──
  const elPointerDown = useCallback(
    (id: string, ev: PointerLike) => {
      ev.stopPropagation()
      const s = zRef.current
      const el = s.els.find((x) => x.id === id)
      if (!el) return
      const sx = ev.clientX
      const sy = ev.clientY
      const ox = el.x
      const oy = el.y
      const zoom = s.zoom
      let moved = false
      setZ((st) => ({ ...st, sel: id }))
      const move = (e: PointerEvent) => {
        const dx = (e.clientX - sx) / zoom
        const dy = (e.clientY - sy) / zoom
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && !moved) return
        if (!moved) pushPast()
        moved = true
        const nx = Math.max(0, Math.round(ox + dx))
        const ny = Math.max(0, Math.round(oy + dy))
        setZ((st) => ({
          ...st,
          dragId: id,
          drag: { x: nx, y: ny },
          els: st.els.map((x) => (x.id === id ? patchEl(x, { x: nx, y: ny }) : x)),
        }))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        patchZ({ dragId: null, drag: null })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [patchZ, pushPast],
  )

  // ── 타입별 리사이즈 ──
  const resizeDown = useCallback(
    (id: string, role: string, ev: PointerLike) => {
      ev.stopPropagation()
      ev.preventDefault()
      const s = zRef.current
      const el0 = s.els.find((e) => e.id === id)
      if (!el0) return
      const zoom = s.zoom
      const sx = ev.clientX
      const sy = ev.clientY
      let started = false
      const move = (e: PointerEvent) => {
        const dx = Math.round((e.clientX - sx) / zoom)
        const dy = Math.round((e.clientY - sy) / zoom)
        if (!started) {
          if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
          pushPast()
          started = true
        }
        const patch = applyResize(el0, role, dx, dy)
        setZ((st) => ({
          ...st,
          els: st.els.map((x) => (x.id === id ? patchEl(x, patch) : x)),
        }))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (started) reraster(id)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [pushPast, reraster],
  )

  // ── 방향키 넛지 ──
  const nudge = useCallback(
    (dx: number, dy: number) => {
      const id = zRef.current.sel
      if (!id) return
      pushPast('nudge')
      mapEls((els) => els.map((e) => (e.id === id ? patchEl(e, { x: Math.max(0, e.x + dx), y: Math.max(0, e.y + dy) }) : e)))
    },
    [mapEls, pushPast],
  )

  // ── 이미지 업로드 ──
  const imgUpload = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const f = ev.target.files && ev.target.files[0]
      const id = zRef.current.sel
      if (!f || !id) return
      // 과대/비이미지 파일 방어(accept 는 UI 필터일 뿐 — 탭 프리즈·메모리 폭주 방지).
      if (f.size > 15 * 1024 * 1024 || (f.type && !f.type.startsWith('image/'))) {
        ev.target.value = ''
        return
      }
      const rd = new FileReader()
      rd.onload = () => {
        const orig = String(rd.result || '')
        const im = new Image()
        im.onload = () => {
          let w = 200
          let h = Math.round((200 * im.height) / im.width)
          if (im.height > im.width) {
            h = 200
            w = Math.round((200 * im.width) / im.height)
          }
          pushPast()
          mapEls((els) => els.map((x) => (x.id === id && x.type === 'image' ? { ...x, orig, w, h } : x)))
          reraster(id)
        }
        im.src = orig
      }
      rd.readAsDataURL(f)
      ev.target.value = ''
    },
    [mapEls, pushPast, reraster],
  )

  // ── 설정(Setup) ──
  const openSetup = useCallback(() => patchZ({ setupOpen: true }), [patchZ])
  const closeSetup = useCallback(() => patchZ({ setupOpen: false }), [patchZ])
  const setUnit = useCallback(
    (u: Unit) => {
      setZ((s) => {
        if (s.unit === u) return s
        let w = parseFloat(s.w) || 0
        let h = parseFloat(s.h) || 0
        if (u === 'mm') {
          w = +(w * 25.4).toFixed(1)
          h = +(h * 25.4).toFixed(1)
        } else {
          w = +(w / 25.4).toFixed(2)
          h = +(h / 25.4).toFixed(2)
        }
        return { ...s, unit: u, w: String(w), h: String(h) }
      })
    },
    [],
  )
  const setDim = useCallback(
    (key: 'w' | 'h', value: string) => {
      patchZ({ [key]: value })
    },
    [patchZ],
  )
  const setDpmm = useCallback(
    (value: number) => {
      patchZ({ dpmm: (value || 8) as Dpmm })
    },
    [patchZ],
  )

  // ── 가져오기(Import) ──
  const openImport = useCallback(() => patchZ({ importOpen: true, importText: SAMPLE_ZPL, importError: null }), [patchZ])
  const closeImport = useCallback(() => patchZ({ importOpen: false, importError: null }), [patchZ])
  const setImportText = useCallback((text: string) => patchZ({ importText: text, importError: null }), [patchZ])
  const doImport = useCallback(() => {
    const txt = zRef.current.importText || ''
    // 실제 역파서(zpl-parse) — 오류코드를 저장하고 다이얼로그가 번역한다.
    const res = parseZpl(txt)
    if (!res.ok) {
      const code =
        res.code === 'unsupported'
          ? `unsupported|${res.cmd || '?'}|${res.line}`
          : res.code === 'xq' || res.code === 'bad'
            ? `${res.code}|${res.line}`
            : res.code
      patchZ({ importError: code })
      return
    }
    pushPast()
    const base = zRef.current.next
    const withIds: Element[] = res.els.map((pe, i) => ({ ...pe, id: 'z' + (base + i) }) as Element)
    setZ((s) => {
      const dpi = dpiFor(s.dpmm)
      // ^PW/^LL(dot) → 현재 단위 환산해 라벨 크기 반영
      const cv = (dots: number) => (s.unit === 'mm' ? +(((dots / dpi) * 25.4).toFixed(1)) : +((dots / dpi).toFixed(2)))
      return {
        ...s,
        els: withIds,
        next: base + withIds.length,
        sel: null,
        selCell: null,
        selCells: [],
        importOpen: false,
        importError: null,
        w: res.pw ? String(cv(res.pw)) : s.w,
        h: res.ll ? String(cv(res.ll)) : s.h,
      }
    })
    // ^GFA 이미지의 캔버스 프리뷰 복원(헥스 → dataURL, 동기)
    for (const el of withIds) {
      if (el.type === 'image' && el.gfaHex && !el.src) {
        const src = gfaHexToDataUrl(el.gfaHex, el.gfaRowBytes ?? Math.ceil(el.w / 8), el.gfaRows ?? el.h)
        if (src) mapEls((els) => els.map((x) => (x.id === el.id && x.type === 'image' ? { ...x, src, orig: src } : x)))
      }
    }
  }, [mapEls, patchZ, pushPast])

  // ── 표 삽입 ──
  const setTableRows = useCallback((v: string) => patchZ({ tableRows: v }), [patchZ])
  const setTableCols = useCallback((v: string) => patchZ({ tableCols: v }), [patchZ])
  const insertTable = useCallback(() => {
    const s0 = zRef.current
    const R = Math.max(1, Math.min(12, parseInt(s0.tableRows, 10) || 3))
    const C = Math.max(1, Math.min(8, parseInt(s0.tableCols, 10) || 3))
    pushPast()
    setZ((s) => {
      const id = 'z' + s.next
      const cols = Array.from({ length: C }, () => Math.round(660 / C))
      const rows = Array.from({ length: R }, () => 84)
      const cells: Record<string, TableCell> = {}
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) cells[r + '_' + c] = { type: 'text', text: '', halign: 'L', valign: 'mid', font: 28 }
      const el: TableElement = { id, type: 'table', x: 90, y: 120, cols, rows, t: 3, pad: 12, merges: [], cells }
      return { ...s, els: [...s.els, el], sel: id, selCell: null, selCells: [], next: s.next + 1, tableDialog: false }
    })
  }, [pushPast])

  // ── 표 셀 상호작용 ──
  const cellDown = useCallback(
    (id: string, r: number, c: number, ev: PointerLike) => {
      ev.stopPropagation()
      const s = zRef.current
      if (ev.ctrlKey || ev.metaKey) {
        // Ctrl/Cmd+클릭: 멀티선택 토글(병합 후보)
        setZ((st) => {
          const cur = st.selCells || []
          const ex = cur.some((p) => p.r === r && p.c === c)
          const selCells = ex ? cur.filter((p) => !(p.r === r && p.c === c)) : [...cur, { r, c }]
          return { ...st, sel: id, selCell: { r, c }, selCells }
        })
        return
      }
      const el = s.els.find((x) => x.id === id)
      if (!el) return
      const sx = ev.clientX
      const sy = ev.clientY
      const ox = el.x
      const oy = el.y
      const zoom = s.zoom
      let moved = false
      setZ((st) => ({ ...st, sel: id }))
      const move = (e: PointerEvent) => {
        const dx = (e.clientX - sx) / zoom
        const dy = (e.clientY - sy) / zoom
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && !moved) return
        if (!moved) {
          pushPast()
          patchZ({ selCell: null, selCells: [] })
        }
        moved = true
        const nx = Math.max(0, Math.round(ox + dx))
        const ny = Math.max(0, Math.round(oy + dy))
        setZ((st) => ({
          ...st,
          dragId: id,
          drag: { x: nx, y: ny },
          els: st.els.map((x) => (x.id === id ? patchEl(x, { x: nx, y: ny }) : x)),
        }))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (moved) patchZ({ dragId: null, drag: null })
        else patchZ({ selCell: { r, c }, selCells: [{ r, c }], dragId: null, drag: null })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [patchZ, pushPast],
  )
  const selectTableWhole = useCallback(() => patchZ({ selCell: null, selCells: [] }), [patchZ])
  const mergeCells = useCallback(() => {
    const s = zRef.current
    const el = s.els.find((e) => e.id === s.sel)
    if (!el || el.type !== 'table') return
    const rect = mergeRectOf(el, s.selCells || [])
    if (!rect) return
    const { r, c, rs, cs } = rect
    pushPast()
    mapEls((els) =>
      els.map((e) =>
        e.id === s.sel && e.type === 'table'
          ? {
              ...e,
              merges: [...e.merges.filter((m) => !(m.r >= r && m.r < r + rs && m.c >= c && m.c < c + cs)), { r, c, rs, cs }],
            }
          : e,
      ),
    )
    patchZ({ selCell: { r, c }, selCells: [{ r, c }] })
  }, [mapEls, patchZ, pushPast])
  const splitCell = useCallback(() => {
    const s = zRef.current
    const sc = s.selCell
    if (!sc) return
    pushPast()
    mapEls((els) =>
      els.map((e) =>
        e.id === s.sel && e.type === 'table'
          ? { ...e, merges: e.merges.filter((m) => !(m.r === sc.r && m.c === sc.c)) }
          : e,
      ),
    )
  }, [mapEls, pushPast])
  const setCellField = useCallback(
    (key: string, val: string | number, numeric?: boolean) => {
      const s = zRef.current
      const sc = s.selCell
      if (!sc) return
      const k = sc.r + '_' + sc.c
      let v: string | number = numeric ? (typeof val === 'number' ? val : parseInt(String(val), 10) || 0) : val
      // 셀도 동일 제약: 셀 텍스트는 ^A0(최소 10dot), 셀 QR 은 ^BQ 배율 1–10, 패딩 ≥0
      if (typeof v === 'number') {
        if (key === 'font') v = Math.max(10, v)
        else if (key === 'mag') v = Math.max(1, Math.min(10, v))
        else if (key === 'pad') v = Math.max(0, v)
      }
      // 셀 텍스트/데이터는 단일 라인 ^FD 로 나가므로 개행 없는 ASCII 로 정제
      if (typeof v === 'string' && (key === 'text' || key === 'data')) v = sanitizeFieldData(v)
      pushPast(s.sel + ':' + k + ':' + key)
      mapEls((els) =>
        els.map((e) => {
          if (e.id !== s.sel || e.type !== 'table') return e
          const cells = { ...e.cells }
          const cur = cells[k] || ({ type: 'text', halign: 'L', valign: 'mid' } as TableCell)
          cells[k] = { ...cur, [key]: v } as TableCell
          return { ...e, cells }
        }),
      )
    },
    [mapEls, pushPast],
  )
  const setCellType = useCallback(
    (val: TableCell['type']) => {
      const s = zRef.current
      const sc = s.selCell
      if (!sc) return
      const k = sc.r + '_' + sc.c
      pushPast()
      mapEls((els) =>
        els.map((e) => {
          if (e.id !== s.sel || e.type !== 'table') return e
          const cells = { ...e.cells }
          const cur = cells[k] || ({ type: 'text', halign: 'L', valign: 'mid' } as TableCell)
          const base = { halign: cur.halign || 'L', valign: cur.valign || 'mid' }
          // 타입 변경 시 정렬은 유지하고 기본 데이터를 세팅 ('image' 셀 타입은 v2 에서 제거)
          cells[k] =
            val === 'text'
              ? { ...base, type: 'text', text: cur.text || tRef.current('z_type_text'), font: cur.font || 30 }
              : val === 'qr'
                ? { ...base, type: 'qr', data: cur.data || 'DATA', mag: 4 }
                : val === 'barcode'
                  ? { ...base, type: 'barcode', data: cur.data || '123456' }
                  : { ...base, type: 'empty' }
          return { ...e, cells }
        }),
      )
    },
    [mapEls, pushPast],
  )
  const setColW = useCallback(
    (i: number, value: string) => {
      const s = zRef.current
      const v = Math.max(20, parseInt(value, 10) || 20)
      pushPast(s.sel + ':col' + i)
      mapEls((els) =>
        els.map((e) => {
          if (e.id !== s.sel || e.type !== 'table') return e
          const cols = [...e.cols]
          cols[i] = v
          return { ...e, cols }
        }),
      )
    },
    [mapEls, pushPast],
  )
  const setRowH = useCallback(
    (i: number, value: string) => {
      const s = zRef.current
      const v = Math.max(20, parseInt(value, 10) || 20)
      pushPast(s.sel + ':row' + i)
      mapEls((els) =>
        els.map((e) => {
          if (e.id !== s.sel || e.type !== 'table') return e
          const rows = [...e.rows]
          rows[i] = v
          return { ...e, rows }
        }),
      )
    },
    [mapEls, pushPast],
  )
  // 열/행 구분선 드래그 — 인접 두 칸을 합 보존하며 상쇄 이동(각 최소 30).
  const divDown = useCallback(
    (id: string, i: number, ev: PointerLike, isCol: boolean) => {
      ev.stopPropagation()
      ev.preventDefault()
      const s = zRef.current
      const t0 = s.els.find((e) => e.id === id)
      if (!t0 || t0.type !== 'table') return
      const arr0 = isCol ? t0.cols : t0.rows
      const a = arr0[i]
      const b = arr0[i + 1]
      const zoom = s.zoom
      const s0 = isCol ? ev.clientX : ev.clientY
      let started = false
      const move = (e: PointerEvent) => {
        let dd = Math.round(((isCol ? e.clientX : e.clientY) - s0) / zoom)
        if (!started) {
          if (Math.abs(dd) < 2) return
          pushPast()
          started = true
        }
        dd = Math.max(-(a - 30), Math.min(b - 30, dd))
        setZ((st) => ({
          ...st,
          els: st.els.map((e) => {
            if (e.id !== id || e.type !== 'table') return e
            const arr = [...(isCol ? e.cols : e.rows)]
            arr[i] = a + dd
            arr[i + 1] = b - dd
            return isCol ? { ...e, cols: arr } : { ...e, rows: arr }
          }),
        }))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [pushPast],
  )
  const colDivDown = useCallback((id: string, i: number, ev: PointerLike) => divDown(id, i, ev, true), [divDown])
  const rowDivDown = useCallback((id: string, i: number, ev: PointerLike) => divDown(id, i, ev, false), [divDown])

  // ── 전체 초기화 — 모든 요소 제거(빈 라벨). 히스토리에 남아 undo 가능. ──
  const resetAll = useCallback(() => {
    if (!zRef.current.els.length) return
    pushPast()
    setZ((s) => ({ ...s, els: [], sel: null, selCell: null, selCells: [], dragId: null, drag: null }))
  }, [pushPast])

  // ── 코드 복사(1.4s "Copied") ──
  const copyZpl = useCallback(async () => {
    const txt = buildZpl(zRef.current).map((l) => l.text).join('\n')
    const copied = await writeClipboardText(txt)
    window.clearTimeout(copyTimer.current)
    patchZ({ copied })
    if (!copied) return
    copyTimer.current = window.setTimeout(() => patchZ({ copied: false }), 1400)
  }, [patchZ])

  // ── 파생값(렌더 시 계산) ──
  const dpi = dpiFor(z.dpmm)
  const PW = toDots(parseFloat(z.w) || 0, z.unit, dpi)
  const LL = toDots(parseFloat(z.h) || 0, z.unit, dpi)
  const zSpecText = `${z.w}×${z.h} ${z.unit} · ${dpi} dpi (${z.dpmm} dpmm) · ${PW} × ${LL} dot`

  const zplLines = useMemo(() => buildZpl(z), [z])
  const zplText = useMemo(() => zplLines.map((l) => l.text).join('\n'), [zplLines])

  const selEl = z.els.find((e) => e.id === z.sel) || null
  const selCellObj =
    selEl && selEl.type === 'table' && z.selCell
      ? selEl.cells[z.selCell.r + '_' + z.selCell.c] || ({ type: 'text', halign: 'L', valign: 'mid' } as TableCell)
      : null
  // 선택 셀 병합 상태 파생.
  const cellMergeInfo = useMemo(() => {
    if (!selEl || selEl.type !== 'table' || !z.selCell) return { isMerged: false, canMerge: false, blocked: false }
    const isMerged = !!mergeAt(selEl, z.selCell.r, z.selCell.c)
    const canMerge = !!mergeRectOf(selEl, z.selCells || [])
    const blocked = (z.selCells || []).length >= 2 && !canMerge
    return { isMerged, canMerge, blocked }
  }, [selEl, z.selCell, z.selCells])

  // ── 키보드 단축키(ZPL 에디터 마운트 중) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = (e.key || '').toLowerCase()
      // Ctrl/⌘+K 는 셸 전역 팔레트 — 가로채지 않음
      if (k === 'k' && (e.metaKey || e.ctrlKey)) return
      const s = zRef.current
      const target = e.target as HTMLElement | null
      const inField = !!target && /input|textarea/i.test(target.tagName || '')
      // Esc: 설정 → 가져오기 → 표 삽입 → 선택해제 순
      if (k === 'escape') {
        if (s.setupOpen) {
          e.preventDefault()
          closeSetup()
          return
        }
        if (s.importOpen) {
          e.preventDefault()
          closeImport()
          return
        }
        if (s.tableDialog) {
          e.preventDefault()
          closeTableDialog()
          return
        }
        if (s.sel) {
          e.preventDefault()
          deselect()
          return
        }
        return
      }
      // 다이얼로그 열림 중엔 Esc 외 단축키 무시
      if (s.setupOpen || s.importOpen || s.tableDialog) return
      if (e.metaKey || e.ctrlKey) {
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
          return
        }
        if (k === 'y' || (k === 'z' && e.shiftKey)) {
          e.preventDefault()
          redo()
          return
        }
        if (k === 'c' && !inField && s.sel) {
          e.preventDefault()
          copySel()
          return
        }
        if (k === 'v' && !inField) {
          e.preventDefault()
          pasteClip()
          return
        }
        return
      }
      if (!inField && (k === 'delete' || k === 'backspace') && s.sel) {
        e.preventDefault()
        deleteSel()
        return
      }
      // 방향키 넛지(표 셀 선택 중 제외)
      if (!inField && s.sel && !s.selCell && k.startsWith('arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        if (k === 'arrowleft') nudge(-step, 0)
        else if (k === 'arrowright') nudge(step, 0)
        else if (k === 'arrowup') nudge(0, -step)
        else if (k === 'arrowdown') nudge(0, step)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSetup, closeImport, closeTableDialog, deselect, undo, redo, copySel, pasteClip, deleteSel, nudge])

  // 언마운트 시 타이머 정리.
  useEffect(() => {
    return () => {
      window.clearTimeout(copyTimer.current)
    }
  }, [])

  return {
    // 상태
    z,
    // 파생
    dpi,
    PW,
    LL,
    zSpecText,
    zplLines,
    zplText,
    selEl,
    selCellObj,
    cellMergeInfo,
    borderable: (type: Element['type']) => BORDERABLE.has(type),
    canUndo: z.past.length > 0,
    canRedo: z.future.length > 0,
    canCopy: !!z.sel,
    canDelete: !!z.sel,
    canPaste: !!z.clip,
    canReset: z.els.length > 0,
    // 삽입/선택/편집
    addEl,
    selectEl,
    deselect,
    hoverEl,
    clearHover,
    deleteSel,
    setField,
    toggleBorder,
    toggleField,
    elPointerDown,
    resizeDown,
    nudge,
    imgUpload,
    // 히스토리/클립보드/줌/코드/초기화
    undo,
    redo,
    copySel,
    pasteClip,
    zoomBy,
    toggleCode,
    copyZpl,
    resetAll,
    // 설정
    openSetup,
    closeSetup,
    setUnit,
    setDim,
    setDpmm,
    // 가져오기
    openImport,
    closeImport,
    setImportText,
    doImport,
    // 표
    openTableDialog,
    closeTableDialog,
    setTableRows,
    setTableCols,
    insertTable,
    cellDown,
    selectTableWhole,
    mergeCells,
    splitCell,
    setCellField,
    setCellType,
    setColW,
    setRowH,
    colDivDown,
    rowDivDown,
  }
}

export type ZplEditorApi = ReturnType<typeof useZplEditor>
