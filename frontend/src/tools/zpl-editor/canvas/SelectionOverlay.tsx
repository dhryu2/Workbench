// 오버레이 레이어 — 선택 박스/타입별 핸들/타입 태그, hover 점선, 표 구분선, 드래그 고스트.
// dot 좌표계(Stage scale)에 그리되, 화면 고정 크기(핸들 12px 등)는 1/zoom 으로 역보정한다.
// 회전 요소(§6.5)는 ^FO 원점 피벗 회전의 bbox 를 계산해 그 경계를 감싼다.
import { Group, Label, Layer, Rect, Tag, Text } from 'react-konva'
import { norm } from '../geometry'
import { cssVar } from './theme'
import type { Element } from '../types'
import type { ZplEditorApi } from '../useZplEditor'
import type { KonvaEventObject } from 'konva/lib/Node'

interface BBox {
  x: number
  y: number
  w: number
  h: number
}

// 회전 bbox — 화면 좌표(y-down)에서 rot 도 시계방향, ^FO 원점(el.x, el.y) 피벗.
function elBBox(el: Element): BBox {
  const { w, h } = norm(el)
  const rot = 'rot' in el ? el.rot : 0
  if (rot === 90) return { x: el.x - h, y: el.y, w: h, h: w }
  if (rot === 180) return { x: el.x - w, y: el.y - h, w, h }
  if (rot === 270) return { x: el.x, y: el.y - w, w: h, h: w }
  return { x: el.x, y: el.y, w, h }
}

interface HandleDef {
  role: string
  fx: number
  fy: number
  cursor: string
}
const H = (role: string, fx: number, fy: number, cursor: string): HandleDef => ({ role, fx, fy, cursor })

// 타입별 핸들 세트(§5.2 — v1/핸드오프와 동일, 제약 패리티 우선).
function handlesFor(el: Element): HandleDef[] {
  if (el.type === 'text') return [H('wL', 0, 0.5, 'ew-resize'), H('wR', 1, 0.5, 'ew-resize')]
  if (el.type === 'barcode') return [H('hT', 0.5, 0, 'ns-resize'), H('hB', 0.5, 1, 'ns-resize')]
  if (el.type === 'qr' || el.type === 'circle' || (el.type === 'image' && !el.free))
    return [H('nw', 0, 0, 'nwse-resize'), H('ne', 1, 0, 'nesw-resize'), H('se', 1, 1, 'nwse-resize'), H('sw', 0, 1, 'nesw-resize')]
  if (el.type === 'line')
    return el.dir === 'v'
      ? [H('p1', 0.5, 0, 'ns-resize'), H('p2', 0.5, 1, 'ns-resize')]
      : [H('p1', 0, 0.5, 'ew-resize'), H('p2', 1, 0.5, 'ew-resize')]
  if (el.type === 'table') return []
  // box / ellipse / diagonal / image(free) — 8방향
  return [
    H('nw', 0, 0, 'nwse-resize'),
    H('n', 0.5, 0, 'ns-resize'),
    H('ne', 1, 0, 'nesw-resize'),
    H('e', 1, 0.5, 'ew-resize'),
    H('se', 1, 1, 'nwse-resize'),
    H('s', 0.5, 1, 'ns-resize'),
    H('sw', 0, 1, 'nesw-resize'),
    H('w', 0, 0.5, 'ew-resize'),
  ]
}

function setCursor(e: KonvaEventObject<PointerEvent>, cursor: string) {
  const st = e.target.getStage()
  if (st) st.container().style.cursor = cursor
}

export function OverlayLayer({ api, tagText }: { api: ZplEditorApi; tagText: string }) {
  const { z, selEl } = api
  const Z = z.zoom
  const accent = cssVar('--wb-color-accent', '#3b6ef5')
  const accentDark = cssVar('--wb-color-accent-800', '#26429c')
  const bg = cssVar('--wb-color-bg', '#fff')
  const heading = cssVar('--wb-font-heading', 'sans-serif')
  const mono = cssVar('--wb-font-mono', 'monospace')

  // hover(비선택) 점선 외곽 — v1 outline offset 2px 화면 등가
  let hoverBox: BBox | null = null
  if (z.mode === 'edit' && z.hover && z.hover !== z.sel) {
    const he = z.els.find((e) => e.id === z.hover)
    if (he) hoverBox = elBBox(he)
  }

  const selBox = selEl && z.mode === 'edit' ? elBBox(selEl) : null
  const round = !!selEl && (selEl.type === 'qr' || selEl.type === 'circle' || (selEl.type === 'image' && !selEl.free))
  const handles = selEl && selBox ? handlesFor(selEl) : []

  // 표 구분선(표 전체 선택 시) — 10 화면픽셀 폭 히트 바 + 중앙 액센트 라인
  const dividers: { key: string; isCol: boolean; i: number; x: number; y: number; w: number; h: number }[] = []
  if (selEl && selEl.type === 'table' && z.mode === 'edit' && !z.selCell) {
    const sn = norm(selEl)
    let cx = 0
    for (let i = 0; i < selEl.cols.length - 1; i++) {
      cx += selEl.cols[i]
      dividers.push({ key: 'c' + i, isCol: true, i, x: selEl.x + cx - 5 / Z, y: selEl.y, w: 10 / Z, h: sn.h })
    }
    let cy = 0
    for (let i = 0; i < selEl.rows.length - 1; i++) {
      cy += selEl.rows[i]
      dividers.push({ key: 'r' + i, isCol: false, i, x: selEl.x, y: selEl.y + cy - 5 / Z, w: sn.w, h: 10 / Z })
    }
  }

  // 드래그 고스트
  let ghost: (BBox & { bx: number; by: number }) | null = null
  if (z.dragId && z.drag) {
    const de = z.els.find((e) => e.id === z.dragId)
    if (de) ghost = { ...elBBox(de), bx: z.drag.x, by: z.drag.y }
  }

  return (
    <Layer>
      {hoverBox && (
        <Rect
          x={hoverBox.x - 2 / Z}
          y={hoverBox.y - 2 / Z}
          width={hoverBox.w + 4 / Z}
          height={hoverBox.h + 4 / Z}
          stroke={accent}
          strokeWidth={1.5 / Z}
          dash={[4 / Z, 3 / Z]}
          listening={false}
        />
      )}

      {selEl &&
        dividers.map((d) => (
          <Group key={d.key}>
            {d.isCol ? (
              <Rect x={d.x + d.w / 2 - 1 / Z} y={d.y} width={2 / Z} height={d.h} fill={accent} opacity={0.55} listening={false} />
            ) : (
              <Rect x={d.x} y={d.y + d.h / 2 - 1 / Z} width={d.w} height={2 / Z} fill={accent} opacity={0.55} listening={false} />
            )}
            <Rect
              x={d.x}
              y={d.y}
              width={d.w}
              height={d.h}
              fill="transparent"
              onPointerDown={(e) => (d.isCol ? api.colDivDown(selEl.id, d.i, e.evt) : api.rowDivDown(selEl.id, d.i, e.evt))}
              onPointerEnter={(e) => setCursor(e, d.isCol ? 'ew-resize' : 'ns-resize')}
              onPointerLeave={(e) => setCursor(e, '')}
            />
          </Group>
        ))}

      {selEl && selBox && (
        <>
          {/* 타입 태그 */}
          <Label x={selBox.x} y={selBox.y - 19 / Z} listening={false}>
            <Tag fill={accent} />
            <Text text={tagText} fontFamily={heading} fontStyle="600" fontSize={11 / Z} padding={4 / Z} fill={bg} />
          </Label>
          {/* 선택 박스 */}
          <Rect x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h} stroke={accent} strokeWidth={1.5 / Z} listening={false} />
          {/* 핸들(12 화면픽셀, 원형 여부는 타입 규칙) */}
          {handles.map((hd) => (
            <Rect
              key={hd.role}
              x={selBox.x + hd.fx * selBox.w - 6 / Z}
              y={selBox.y + hd.fy * selBox.h - 6 / Z}
              width={12 / Z}
              height={12 / Z}
              fill={bg}
              stroke={accent}
              strokeWidth={1.5 / Z}
              cornerRadius={round ? 6 / Z : 0}
              onPointerDown={(e) => api.resizeDown(selEl.id, hd.role, e.evt)}
              onPointerEnter={(e) => setCursor(e, hd.cursor)}
              onPointerLeave={(e) => setCursor(e, '')}
            />
          ))}
        </>
      )}

      {ghost && (
        <>
          <Rect x={ghost.x} y={ghost.y} width={ghost.w} height={ghost.h} fill={accent} opacity={0.08} listening={false} />
          <Rect
            x={ghost.x}
            y={ghost.y}
            width={ghost.w}
            height={ghost.h}
            stroke={accent}
            strokeWidth={1.5 / Z}
            dash={[4 / Z, 3 / Z]}
            listening={false}
          />
          <Label x={ghost.x} y={ghost.y - 22 / Z} listening={false}>
            <Tag fill={accentDark} />
            <Text text={`X ${ghost.bx}  ·  Y ${ghost.by}`} fontFamily={mono} fontSize={11 / Z} padding={4 / Z} fill={bg} />
          </Label>
        </>
      )}
    </Layer>
  )
}
