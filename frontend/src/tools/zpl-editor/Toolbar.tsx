// ZPL 에디터 툴바 — INSERT 버튼 · 편집 조작 · 설정 · 줌 · 모드 · 코드/가져오기.
// (렌더 배지는 v2 에서 제거 — 캔버스 자체가 권위 있는 WYSIWYG 렌더러다.)
import {
  BoxSelect,
  Circle,
  ClipboardPaste,
  Code,
  Copy,
  FileInput,
  Image as ImageIcon,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  ScanLine,
  Slash,
  SlidersHorizontal,
  Table as TableIcon,
  Trash2,
  Type,
  Undo2,
  Redo2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../lib/icons'
import type { LucideIcon } from 'lucide-react'
import type { Element } from './types'
import type { ZplEditorApi } from './useZplEditor'

// lucide 에 ellipse 아이콘이 없어 인라인 타원(stroke-width 1.5 유지).
function EllipseIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ display: 'block' }}>
      <ellipse cx="12" cy="12" rx="10" ry="7" />
    </svg>
  )
}

const HEADING = 'var(--wb-font-heading)'

export function Toolbar({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z } = api

  type InsertBtn = { type: Element['type']; icon: LucideIcon | null; ell?: boolean; label: string }

  // 삽입 버튼 — 기능별 분류: 콘텐츠(텍스트·바코드·QR·이미지·표) vs 도형(박스·타원·원·선·대각선)
  const contentBtns: InsertBtn[] = [
    { type: 'text', icon: Type, label: t('z_text') },
    { type: 'barcode', icon: ScanLine, label: t('z_barcode') },
    { type: 'qr', icon: QrCode, label: t('z_qr') },
    { type: 'image', icon: ImageIcon, label: t('z_image') },
    { type: 'table', icon: TableIcon, label: t('z_table') },
  ]
  const shapeBtns: InsertBtn[] = [
    { type: 'box', icon: BoxSelect, label: t('z_box') },
    { type: 'ellipse', icon: null, ell: true, label: t('z_ellipse') },
    { type: 'circle', icon: Circle, label: t('z_circle') },
    { type: 'line', icon: Minus, label: t('z_line') },
    { type: 'diagonal', icon: Slash, label: t('z_diagonal') },
  ]

  // 세그먼트형 아이콘 버튼(툴바 그룹 공통) — 아이콘 전용 + 툴팁으로 공간 절약.
  const segBtn = (
    key: string,
    icon: LucideIcon | null,
    title: string,
    onClick: () => void,
    opts?: { disabled?: boolean; first?: boolean; ell?: boolean },
  ) => (
    <button
      key={key}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={opts?.disabled}
      className="wb-zpl-iconbtn"
      style={{
        width: 34,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        border: 'none',
        borderLeft: opts?.first ? 'none' : '1px solid var(--wb-color-divider)',
        color: 'var(--wb-color-text)',
        cursor: 'pointer',
      }}
    >
      {opts?.ell ? <EllipseIcon size={15} /> : icon ? <Icon icon={icon} size={15} /> : null}
    </button>
  )

  // 삽입 그룹(콘텐츠/도형) 렌더 헬퍼
  const insertGroup = (btns: InsertBtn[], keyPrefix: string) => (
    <div style={{ display: 'flex', border: '1px solid var(--wb-color-divider)' }}>
      {btns.map((b, i) =>
        segBtn(`${keyPrefix}-${b.type}`, b.icon, b.label, () => api.addEl(b.type), { first: i === 0, ell: b.ell }),
      )}
    </div>
  )

  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '11px 20px',
        borderBottom: '1px solid var(--wb-color-divider)',
        flexWrap: 'wrap',
      }}
    >
      {/* INSERT 그룹 — 콘텐츠/도형 두 세그먼트로 분류(아이콘 전용) */}
      <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)' }}>
        {t('z_insert')}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {insertGroup(contentBtns, 'content')}
        {insertGroup(shapeBtns, 'shape')}
      </div>

      {/* 세로 구분선 */}
      <span style={{ width: 1, height: 24, background: 'var(--wb-color-divider)' }} />

      {/* 편집 조작 그룹(undo/redo/copy/paste/delete) */}
      <div style={{ display: 'flex', border: '1px solid var(--wb-color-divider)' }}>
        {segBtn('undo', Undo2, t('z_undo'), api.undo, { disabled: !api.canUndo, first: true })}
        {segBtn('redo', Redo2, t('z_redo'), api.redo, { disabled: !api.canRedo })}
        {segBtn('copy', Copy, t('z_copy_el'), api.copySel, { disabled: !api.canCopy })}
        {segBtn('paste', ClipboardPaste, t('z_paste'), api.pasteClip, { disabled: !api.canPaste })}
        {segBtn('delete', Trash2, t('z_delete'), api.deleteSel, { disabled: !api.canDelete })}
      </div>

      {/* 설정 버튼 */}
      <button type="button" onClick={api.openSetup} className="wb-btn wb-btn-secondary" style={{ height: 32, gap: 8, fontSize: 13, whiteSpace: 'nowrap' }}>
        <Icon icon={SlidersHorizontal} size={15} />
        {api.zSpecText}
      </button>

      {/* 줌 컨트롤 */}
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--wb-color-divider)' }}>
        <button type="button" onClick={() => api.zoomBy(-0.06)} aria-label={t('z_zoom_out')} className="wb-zpl-iconbtn" style={{ width: 32, height: 30, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--wb-color-text)' }}>
          <Icon icon={Minus} size={15} />
        </button>
        <span style={{ minWidth: 48, textAlign: 'center', fontFamily: HEADING, fontWeight: 600, fontSize: 13 }}>{Math.round(z.zoom * 100)}%</span>
        <button type="button" onClick={() => api.zoomBy(0.06)} aria-label={t('z_zoom_in')} className="wb-zpl-iconbtn" style={{ width: 32, height: 30, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--wb-color-text)' }}>
          <Icon icon={Plus} size={15} />
        </button>
      </div>

      {/* 스페이서 */}
      <div style={{ flex: 1, minWidth: 12 }} />

      {/* 전체 초기화(undo 가능) */}
      <button
        type="button"
        onClick={api.resetAll}
        disabled={!api.canReset}
        className="wb-btn wb-btn-secondary"
        style={{ height: 32, gap: 6, fontSize: 13, opacity: api.canReset ? 1 : 0.45 }}
      >
        <Icon icon={RotateCcw} size={15} />
        {t('z_reset')}
      </button>

      {/* ZPL 코드 토글 */}
      <button type="button" onClick={api.toggleCode} className="wb-btn wb-btn-secondary" style={{ height: 32, gap: 6, fontSize: 13 }}>
        <Icon icon={Code} size={15} />
        {t('z_code')}
      </button>

      {/* 가져오기 */}
      <button type="button" onClick={api.openImport} className="wb-btn wb-btn-secondary" style={{ height: 32, gap: 6, fontSize: 13 }}>
        <Icon icon={FileInput} size={15} />
        {t('z_import')}
      </button>
    </div>
  )
}
