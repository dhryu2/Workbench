// 표 노드 — 격자(외곽 + 내부 세그먼트)는 tableZpl 이 emit 하는 ^GB 조각과 같은 기하로 그려
// 인쇄물과 일치시킨다(v1 은 셀마다 CSS border 를 그려 내부선이 2t 로 두꺼웠다).
// 셀 콘텐츠도 생성 ZPL 좌표(패딩·valign 수식)를 그대로 재현한다. 셀 히트 Rect 가
// cellDown(클릭=선택, Ctrl/Cmd=멀티, 드래그=표 이동)을 이어받는다.
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva'
import type { ReactNode } from 'react'
import { bcWidth, cellRect, isHidden, mergeAt, mergedRect, tableH, tableW } from '../../geometry'
import type { Rect as CellRect } from '../../geometry'
import { BarsShape } from './BarcodeNode'
import { QrMatrixShape } from './QrNode'
import { useHtmlImage } from '../use-html-image'
import { INK, PAPER, cssVar } from '../theme'
import { LABEL_FONT } from '../fonts'
import type { BarcodeElement, TableCell, TableElement } from '../../types'
import type { ZplEditorApi } from '../../useZplEditor'
import type { KonvaEventObject } from 'konva/lib/Node'

// 스테이지 컨테이너 커서 변경(Konva 노드에는 CSS cursor 가 없다).
function setCursor(e: KonvaEventObject<PointerEvent>, cursor: string) {
  const st = e.target.getStage()
  if (st) st.container().style.cursor = cursor
}

// 셀 이미지 — 콘텐츠 영역에 contain 맞춤(생성 ZPL 이 셀 이미지 크기를 아직 지정하지 않으므로 v1 시각 유지).
function CellImage({ src, rect, pad }: { src: string; rect: CellRect; pad: number }) {
  const img = useHtmlImage(src)
  if (!img || !img.width || !img.height) return null
  const aw = Math.max(0, rect.w - pad * 2)
  const ah = Math.max(0, rect.h - pad * 2)
  const r = Math.min(aw / img.width, ah / img.height)
  return (
    <KonvaImage
      image={img}
      x={rect.x + pad}
      y={rect.y + pad}
      width={img.width * r}
      height={img.height * r}
      imageSmoothingEnabled={false}
      listening={false}
    />
  )
}

// 셀 콘텐츠 — 좌표/크기는 tableZpl 의 ^FO/^A0/^BQ/^BC 파라미터와 동일한 수식.
function CellContentNode({ table, cell, rect }: { table: TableElement; cell: TableCell; rect: CellRect }) {
  const pad = cell.pad != null ? cell.pad : table.pad
  if (cell.type === 'text') {
    const f = cell.font || 30
    const va = cell.valign || 'mid'
    const inner = Math.max(0, rect.w - pad * 2)
    const y = va === 'top' ? rect.y + pad : va === 'bot' ? rect.y + rect.h - pad - f : rect.y + Math.round((rect.h - f) / 2)
    return (
      <Text
        x={rect.x + pad}
        y={y}
        width={inner}
        text={cell.text || ''}
        align={cell.halign === 'C' ? 'center' : cell.halign === 'R' ? 'right' : 'left'}
        wrap="none"
        fontFamily={LABEL_FONT}
        fontStyle="bold"
        fontSize={f}
        fill={INK}
        listening={false}
      />
    )
  }
  if (cell.type === 'qr') {
    return <QrMatrixShape x={rect.x + pad} y={rect.y + pad} data={cell.data || ''} ecc="M" mag={cell.mag || 4} />
  }
  if (cell.type === 'barcode') {
    const data = cell.data || ''
    const w = bcWidth({ bcType: 'code128', module: 2, data } as BarcodeElement)
    const h = Math.max(0, rect.h - pad * 2)
    return <BarsShape x={rect.x + pad} y={rect.y + pad} bcType="code128" data={data} w={w} h={h} />
  }
  if (cell.type === 'image' && cell.data) return <CellImage src={cell.data} rect={rect} pad={pad} />
  return null
}

export function TableNode({ t, api, zoom }: { t: TableElement; api: ZplEditorApi; zoom: number }) {
  const { z } = api
  const tw = tableW(t)
  const th = tableH(t)
  const bt = Math.max(t.t, 1 / zoom)
  const accent = cssVar('--wb-color-accent', '#3b6ef5')
  const editing = z.mode === 'edit'

  // 내부 세로 세그먼트 — tableZpl ② 와 동일한 병합 스킵 규칙
  const vSegs: { key: string; x: number; y: number; h: number }[] = []
  let cx = 0
  for (let i = 0; i < t.cols.length - 1; i++) {
    cx += t.cols[i]
    let cy = 0
    for (let r = 0; r < t.rows.length; r++) {
      const spans = (t.merges || []).some((m) => m.c <= i && m.c + m.cs - 1 >= i + 1 && r >= m.r && r < m.r + m.rs)
      if (!spans) vSegs.push({ key: `v${i}_${r}`, x: cx, y: cy, h: t.rows[r] })
      cy += t.rows[r]
    }
  }
  // 내부 가로 세그먼트 — tableZpl ③ 과 동일
  const hSegs: { key: string; x: number; y: number; w: number }[] = []
  let cy2 = 0
  for (let j = 0; j < t.rows.length - 1; j++) {
    cy2 += t.rows[j]
    let cx2 = 0
    for (let c = 0; c < t.cols.length; c++) {
      const spans = (t.merges || []).some((m) => m.r <= j && m.r + m.rs - 1 >= j + 1 && c >= m.c && c < m.c + m.cs)
      if (!spans) hSegs.push({ key: `h${j}_${c}`, x: cx2, y: cy2, w: t.cols[c] })
      cx2 += t.cols[c]
    }
  }

  // 셀(하이라이트 → 콘텐츠 → 히트 순서로 쌓는다)
  const highlights: ReactNode[] = []
  const contents: ReactNode[] = []
  const hits: ReactNode[] = []
  for (let r = 0; r < t.rows.length; r++) {
    for (let c = 0; c < t.cols.length; c++) {
      if (isHidden(t, r, c)) continue
      const m = mergeAt(t, r, c)
      const rect = m ? mergedRect(t, r, c) : cellRect(t, r, c)
      const cell = t.cells[r + '_' + c] || ({ type: 'empty', halign: 'L', valign: 'mid' } as TableCell)
      const key = r + '_' + c
      const selCell = z.sel === t.id && !!z.selCell && z.selCell.r === r && z.selCell.c === c
      const inMulti = z.sel === t.id && (z.selCells || []).some((p) => p.r === r && p.c === c) && !selCell
      if (selCell || inMulti) {
        highlights.push(
          <Rect
            key={'hl' + key}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={accent}
            opacity={selCell ? 0.2 : 0.11}
            listening={false}
          />,
          <Rect
            key={'ho' + key}
            x={rect.x + 1 / zoom}
            y={rect.y + 1 / zoom}
            width={rect.w - 2 / zoom}
            height={rect.h - 2 / zoom}
            stroke={accent}
            strokeWidth={selCell ? 2 / zoom : 1.5 / zoom}
            dash={selCell ? undefined : [4 / zoom, 3 / zoom]}
            listening={false}
          />,
        )
      }
      contents.push(<CellContentNode key={'ct' + key} table={t} cell={cell} rect={rect} />)
      hits.push(
        <Rect
          key={'ht' + key}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          fill="transparent"
          onPointerDown={(e) => api.cellDown(t.id, r, c, e.evt)}
          onPointerEnter={(e) => {
            if (editing) setCursor(e, 'pointer')
          }}
          onPointerLeave={(e) => {
            if (editing) setCursor(e, 'move')
          }}
        />,
      )
    }
  }

  return (
    <Group
      x={t.x}
      y={t.y}
      onPointerEnter={(e) => {
        api.hoverEl(t.id)
        if (editing) setCursor(e, 'move')
      }}
      onPointerLeave={(e) => {
        api.clearHover()
        setCursor(e, '')
      }}
    >
      <Rect width={tw} height={th} fill={PAPER} />
      {/* 외곽 박스 — ^GB 처럼 안쪽 두께 */}
      <Rect x={bt / 2} y={bt / 2} width={tw - bt} height={th - bt} stroke={INK} strokeWidth={bt} listening={false} />
      {vSegs.map((s) => (
        <Rect key={s.key} x={s.x} y={s.y} width={bt} height={s.h} fill={INK} listening={false} />
      ))}
      {hSegs.map((s) => (
        <Rect key={s.key} x={s.x} y={s.y} width={s.w} height={bt} fill={INK} listening={false} />
      ))}
      {highlights}
      {contents}
      {hits}
    </Group>
  )
}
