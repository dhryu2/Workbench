// 편집 모드 캔버스 — 용지(Blueprint) 위 요소 렌더 + 선택 오버레이/핸들 + 표 셀 + 구분선 + 드래그 고스트.
import { FileInput, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'
import { cellRect, isHidden, mergeAt, mergedRect, norm } from './geometry'
import type { Element, TableElement } from './types'
import type { ZplEditorApi } from './useZplEditor'
import { CellContent, ElementVisual } from './visuals'

const ACCENT = 'var(--wb-color-accent)'
const BG = 'var(--wb-color-bg)'

// 핸들 위치(선택 박스 기준 퍼센트)
const HP: Record<string, [string, string]> = {
  nw: ['0', '0'],
  n: ['50%', '0'],
  ne: ['100%', '0'],
  e: ['100%', '50%'],
  se: ['100%', '100%'],
  s: ['50%', '100%'],
  sw: ['0', '100%'],
  w: ['0', '50%'],
}

interface HandleDef {
  role: string
  pos: string
  cursor: string
}

interface SelBox {
  id: string
  x: number
  y: number
  w: number
  h: number
  round: boolean
  handles: HandleDef[]
  tagText: string
}

// 타입별 핸들 세트 계산.
function handlesFor(el: Element): HandleDef[] {
  if (el.type === 'text') return [{ role: 'wL', pos: 'w', cursor: 'ew-resize' }, { role: 'wR', pos: 'e', cursor: 'ew-resize' }]
  if (el.type === 'barcode') return [{ role: 'hT', pos: 'n', cursor: 'ns-resize' }, { role: 'hB', pos: 's', cursor: 'ns-resize' }]
  if (el.type === 'qr' || el.type === 'circle' || (el.type === 'image' && !el.free))
    return [
      { role: 'nw', pos: 'nw', cursor: 'nwse-resize' },
      { role: 'ne', pos: 'ne', cursor: 'nesw-resize' },
      { role: 'se', pos: 'se', cursor: 'nwse-resize' },
      { role: 'sw', pos: 'sw', cursor: 'nesw-resize' },
    ]
  if (el.type === 'line')
    return el.dir === 'v'
      ? [{ role: 'p1', pos: 'n', cursor: 'ns-resize' }, { role: 'p2', pos: 's', cursor: 'ns-resize' }]
      : [{ role: 'p1', pos: 'w', cursor: 'ew-resize' }, { role: 'p2', pos: 'e', cursor: 'ew-resize' }]
  if (el.type === 'table') return []
  // box / ellipse / diagonal / image(free) — 8방향 자유 리사이즈(README 핸들 표)
  return [
    { role: 'nw', pos: 'nw', cursor: 'nwse-resize' },
    { role: 'n', pos: 'n', cursor: 'ns-resize' },
    { role: 'ne', pos: 'ne', cursor: 'nesw-resize' },
    { role: 'e', pos: 'e', cursor: 'ew-resize' },
    { role: 'se', pos: 'se', cursor: 'nwse-resize' },
    { role: 's', pos: 's', cursor: 'ns-resize' },
    { role: 'sw', pos: 'sw', cursor: 'nesw-resize' },
    { role: 'w', pos: 'w', cursor: 'ew-resize' },
  ]
}

// 표 비주얼 — 셀 격자 + 선택 하이라이트 + 셀 pointerdown.
function TableVisual({ api, t, Z }: { api: ZplEditorApi; t: TableElement; Z: number }) {
  const { z } = api
  const bpx = Math.max(1, t.t * Z)
  const cells = []
  for (let r = 0; r < t.rows.length; r++) {
    for (let c = 0; c < t.cols.length; c++) {
      if (isHidden(t, r, c)) continue
      const m = mergeAt(t, r, c)
      const rect = m ? mergedRect(t, r, c) : cellRect(t, r, c)
      const cell = t.cells[r + '_' + c] || { type: 'empty' as const, halign: 'L' as const, valign: 'mid' as const }
      const selCell = z.sel === t.id && !!z.selCell && z.selCell.r === r && z.selCell.c === c
      const inMulti = z.sel === t.id && (z.selCells || []).some((p) => p.r === r && p.c === c) && !selCell
      cells.push(
        <div
          key={r + '_' + c}
          onPointerDown={(ev: ReactPointerEvent) => api.cellDown(t.id, r, c, ev)}
          style={{
            position: 'absolute',
            left: rect.x * Z,
            top: rect.y * Z,
            width: rect.w * Z,
            height: rect.h * Z,
            border: `${bpx}px solid #111`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: cell.valign === 'top' ? 'flex-start' : cell.valign === 'bot' ? 'flex-end' : 'center',
            justifyContent: cell.halign === 'C' ? 'center' : cell.halign === 'R' ? 'flex-end' : 'flex-start',
            padding: t.pad * Z,
            overflow: 'hidden',
            background: selCell
              ? 'color-mix(in srgb, var(--wb-color-accent) 20%, #fff)'
              : inMulti
                ? 'color-mix(in srgb, var(--wb-color-accent) 11%, #fff)'
                : 'transparent',
            outline: selCell ? '2px solid var(--wb-color-accent)' : inMulti ? '1.5px dashed var(--wb-color-accent)' : 'none',
            outlineOffset: '-2px',
            cursor: z.mode === 'edit' ? 'pointer' : 'default',
          }}
        >
          <CellContent cell={cell} rect={rect} zoom={Z} />
        </div>,
      )
    }
  }
  return <div style={{ position: 'absolute', inset: 0, background: '#fff' }}>{cells}</div>
}

export function Canvas({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z, selEl, selCellObj, PW, LL } = api
  const Z = z.zoom

  // 선택 오버레이 파생 (const 로 두어 콜백 안에서도 non-null 내로잉이 유지되게 함)
  const selBox: SelBox | null =
    selEl && z.mode === 'edit'
      ? {
          id: selEl.id,
          x: selEl.x,
          y: selEl.y,
          w: norm(selEl).w,
          h: norm(selEl).h,
          round: selEl.type === 'qr' || selEl.type === 'circle' || (selEl.type === 'image' && !selEl.free),
          handles: handlesFor(selEl),
          tagText: selCellObj ? t('z_type_cell') : t('z_type_' + selEl.type),
        }
      : null

  // 표 구분선(표 전체 선택 시)
  const dividers: { key: string; style: CSSProperties; onDown: (ev: ReactPointerEvent) => void }[] = []
  if (selEl && selEl.type === 'table' && z.mode === 'edit' && !z.selCell) {
    const sn = norm(selEl)
    let cx = 0
    for (let i = 0; i < selEl.cols.length - 1; i++) {
      cx += selEl.cols[i]
      dividers.push({
        key: 'c' + i,
        style: { position: 'absolute', left: (selEl.x + cx) * Z, top: selEl.y * Z, width: 10, height: sn.h * Z, transform: 'translateX(-50%)', cursor: 'ew-resize', pointerEvents: 'auto' },
        onDown: (ev) => api.colDivDown(selEl.id, i, ev),
      })
    }
    let cy = 0
    for (let i = 0; i < selEl.rows.length - 1; i++) {
      cy += selEl.rows[i]
      dividers.push({
        key: 'r' + i,
        style: { position: 'absolute', left: selEl.x * Z, top: (selEl.y + cy) * Z, width: sn.w * Z, height: 10, transform: 'translateY(-50%)', cursor: 'ns-resize', pointerEvents: 'auto' },
        onDown: (ev) => api.rowDivDown(selEl.id, i, ev),
      })
    }
  }

  // 드래그 고스트
  let ghost = null
  if (z.dragId && z.drag) {
    const de = z.els.find((e) => e.id === z.dragId)
    if (de) {
      const dn = norm(de)
      ghost = { x: de.x, y: de.y, w: dn.w, h: dn.h, bx: z.drag.x, by: z.drag.y }
    }
  }

  const isCol = (v: string) => v.indexOf('c') === 0

  return (
    <div
      className="wb-scroll"
      onPointerDown={() => api.deselect()}
      style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--wb-color-surface)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 34 }}
    >
      <Blueprint style={{ position: 'relative', width: PW * Z, height: LL * Z, background: '#fff', boxShadow: 'var(--wb-shadow-md)', flex: 'none' }}>
        {/* 빈 라벨 CTA */}
        {z.els.length === 0 && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24 }}
          >
            <h3 style={{ fontSize: 18, margin: 0, fontFamily: 'var(--wb-font-heading)', color: '#111' }}>{t('z_empty_title')}</h3>
            <p style={{ fontSize: 12, margin: 0, maxWidth: 240, color: '#555' }}>{t('z_empty_body')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => api.addEl('text')} className="wb-btn wb-btn-primary" style={{ height: 34, gap: 6, fontSize: 13 }}>
                <Icon icon={Plus} size={15} />
                {t('z_add_text')}
              </button>
              <button type="button" onClick={api.openImport} className="wb-btn wb-btn-secondary" style={{ height: 34, gap: 6, fontSize: 13 }}>
                <Icon icon={FileInput} size={15} />
                {t('z_import')}
              </button>
            </div>
          </div>
        )}

        {/* 요소 */}
        {z.els.map((el) => {
          const n = norm(el)
          const selected = z.sel === el.id
          const hovered = z.hover === el.id
          return (
            <div
              key={el.id}
              className={selected ? undefined : 'wb-zpl-el'}
              onPointerDown={(ev: ReactPointerEvent) => api.elPointerDown(el.id, ev)}
              onPointerEnter={() => api.hoverEl(el.id)}
              onPointerLeave={() => api.clearHover()}
              style={{
                position: 'absolute',
                left: el.x * Z,
                top: el.y * Z,
                width: n.w * Z,
                height: n.h * Z,
                cursor: z.mode === 'edit' ? 'move' : 'default',
                outline: !selected && hovered ? '1.5px dashed var(--wb-color-accent)' : 'none',
                outlineOffset: 2,
              }}
            >
              {el.type === 'table' ? <TableVisual api={api} t={el} Z={Z} /> : <ElementVisual el={el} zoom={Z} />}
            </div>
          )
        })}

        {/* 표 구분선 핸들 */}
        {dividers.map((d) => (
          <div key={d.key} className="wb-zpl-divbar" onPointerDown={d.onDown} style={d.style}>
            <i
              style={
                isCol(d.key)
                  ? { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)', background: ACCENT, opacity: 0.55 }
                  : { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, transform: 'translateY(-50%)', background: ACCENT, opacity: 0.55 }
              }
            />
          </div>
        ))}

        {/* 선택 오버레이 */}
        {selBox && (
          <>
            {/* 타입 태그 */}
            <div
              style={{
                position: 'absolute',
                left: selBox.x * Z,
                top: selBox.y * Z - 19,
                background: ACCENT,
                color: BG,
                fontFamily: 'var(--wb-font-heading)',
                fontWeight: 600,
                fontSize: 11,
                padding: '1px 7px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {selBox.tagText}
            </div>
            {/* 선택 박스 + 핸들 */}
            <div style={{ position: 'absolute', left: selBox.x * Z, top: selBox.y * Z, width: selBox.w * Z, height: selBox.h * Z, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', inset: 0, outline: '1.5px solid var(--wb-color-accent)' }} />
              {selBox.handles.map((h) => (
                <div
                  key={h.role}
                  onPointerDown={(ev: ReactPointerEvent) => api.resizeDown(selBox.id, h.role, ev)}
                  style={{
                    position: 'absolute',
                    left: HP[h.pos][0],
                    top: HP[h.pos][1],
                    width: 12,
                    height: 12,
                    transform: 'translate(-50%,-50%)',
                    background: BG,
                    border: '1.5px solid var(--wb-color-accent)',
                    cursor: h.cursor,
                    pointerEvents: 'auto',
                    borderRadius: selBox.round ? '50%' : 0,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* 드래그 고스트 */}
        {ghost && (
          <>
            <div style={{ position: 'absolute', left: ghost.x * Z, top: ghost.y * Z, width: ghost.w * Z, height: ghost.h * Z, border: '1.5px dashed var(--wb-color-accent)', background: 'color-mix(in srgb, var(--wb-color-accent) 8%, transparent)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: ghost.x * Z, top: ghost.y * Z - 22, background: 'var(--wb-color-accent-800)', color: BG, fontFamily: 'var(--wb-font-mono)', fontSize: 11, padding: '2px 7px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              X {ghost.bx}  ·  Y {ghost.by}
            </div>
          </>
        )}
      </Blueprint>
    </div>
  )
}
