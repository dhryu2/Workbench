// 편집 모드 캔버스(Konva) — Stage scale=zoom, 모든 노드 좌표는 raw dot(§5.1).
// 레이어: paper(비청취) → elements → overlay. 블루프린트 프레임/빈 라벨 CTA 는 DOM 유지.
// 상호작용은 v1 의 검증된 window-listener 방식(threshold/clamp/round/history 동일)을
// Konva 이벤트의 원시 PointerEvent(e.evt)로 그대로 잇는다(§5.3).
import { useEffect, useState } from 'react'
import { Group, Layer, Rect, Stage } from 'react-konva'
import { FileInput, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../../../components/Blueprint'
import { Icon } from '../../../lib/icons'
import { borderBox, norm } from '../geometry'
import { labelFontsReady, loadLabelFonts } from './fonts'
import { OverlayLayer } from './SelectionOverlay'
import { TextNode } from './nodes/TextNode'
import { BarcodeNode } from './nodes/BarcodeNode'
import { QrNode } from './nodes/QrNode'
import { ImageNode } from './nodes/ImageNode'
import { ShapeNode } from './nodes/ShapeNodes'
import { TableNode } from './nodes/TableNode'
import { INK } from './theme'
import type { ReactNode } from 'react'
import type { BorderableElement, Element } from '../types'
import type { ZplEditorApi } from '../useZplEditor'
import type { KonvaEventObject } from 'konva/lib/Node'

function setCursor(e: KonvaEventObject<PointerEvent>, cursor: string) {
  const st = e.target.getStage()
  if (st) st.container().style.cursor = cursor
}

function SyntheticBorder({ el }: { el: BorderableElement }) {
  const b = el.border
  if (!b.on) return null
  const box = borderBox(el)
  // Konva 스트로크는 경로 양쪽으로 자라므로 경로를 반 두께만큼 안으로 넣어 ^GB의 안쪽 두께와 맞춘다.
  const t = Math.min(Math.max(box.t, 1), box.w / 2, box.h / 2)
  return (
    <Rect
      x={box.x + t / 2}
      y={box.y + t / 2}
      width={box.w - t}
      height={box.h - t}
      stroke={INK}
      strokeWidth={t}
      listening={false}
    />
  )
}

// 요소 1개 — 회전 타입은 ^FO 원점 피벗 Group 회전(§6.5), bbox 투명 Rect 가 히트 영역(v1 div 동일).
function ElementNode({ el, api, zoom, imageLabel }: { el: Element; api: ZplEditorApi; zoom: number; imageLabel: string }) {
  if (el.type === 'table') return <TableNode t={el} api={api} zoom={zoom} />
  const n = norm(el)
  const rot = 'rot' in el ? el.rot : 0
  let visual: ReactNode
  switch (el.type) {
    case 'text':
      visual = <TextNode el={el} />
      break
    case 'barcode':
      visual = <BarcodeNode el={el} />
      break
    case 'qr':
      visual = <QrNode el={el} />
      break
    case 'image':
      visual = <ImageNode el={el} zoom={zoom} placeholderLabel={imageLabel} />
      break
    default:
      visual = <ShapeNode el={el} zoom={zoom} />
  }
  const borderable = el.type === 'text' || el.type === 'barcode' || el.type === 'qr' || el.type === 'image'
  return (
    <Group
      x={el.x}
      y={el.y}
      onPointerDown={(e) => api.elPointerDown(el.id, e.evt)}
      onPointerEnter={(e) => {
        api.hoverEl(el.id)
        setCursor(e, 'move')
      }}
      onPointerLeave={(e) => {
        api.clearHover()
        setCursor(e, '')
      }}
    >
      <Group rotation={rot}>
        <Rect width={n.w} height={n.h} fill="transparent" />
        {visual}
      </Group>
      {borderable && <SyntheticBorder el={el} />}
    </Group>
  )
}

export function EditorStage({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z, selEl, selCellObj, PW, LL } = api
  const Z = z.zoom

  // 라벨 폰트 지연 로드 → 완료 시 Stage 리마운트로 재그리기(§6.1: Konva 는 자동 리플로우 없음)
  const [fontsReady, setFontsReady] = useState(labelFontsReady())
  useEffect(() => {
    let live = true
    void loadLabelFonts().then(() => {
      if (live) setFontsReady(true)
    })
    return () => {
      live = false
    }
  }, [])

  const tagText = selCellObj ? t('z_type_cell') : selEl ? t('z_type_' + selEl.type) : ''
  const imageLabel = t('z_image')

  return (
    <div
      className="wb-scroll"
      onPointerDown={() => api.deselect()}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        background: 'var(--wb-color-surface)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 34,
      }}
    >
      <Blueprint style={{ position: 'relative', width: PW * Z, height: LL * Z, background: '#fff', boxShadow: 'var(--wb-shadow-md)', flex: 'none' }}>
        <Stage key={fontsReady ? 'fonts-ready' : 'fonts-pending'} width={PW * Z} height={LL * Z} scaleX={Z} scaleY={Z}>
          {/* 용지 */}
          <Layer listening={false}>
            <Rect width={PW} height={LL} fill="#fff" />
          </Layer>
          {/* 요소 */}
          <Layer>
            {z.els.map((el) => (
              <ElementNode key={el.id} el={el} api={api} zoom={Z} imageLabel={imageLabel} />
            ))}
          </Layer>
          {/* 선택/hover/구분선/고스트 오버레이 */}
          <OverlayLayer api={api} tagText={tagText} />
        </Stage>

        {/* 빈 라벨 CTA(DOM 오버레이) */}
        {z.els.length === 0 && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              textAlign: 'center',
              padding: 24,
            }}
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
      </Blueprint>
    </div>
  )
}
