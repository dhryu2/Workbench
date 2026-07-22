// ZPL 에디터 툴바 — INSERT 버튼 · 편집 조작 · 설정 · 줌 · 모드 · 코드/가져오기.
// (렌더 배지는 v2 에서 제거 — 캔버스 자체가 권위 있는 WYSIWYG 렌더러다.)
import {
  BoxSelect,
  Circle,
  ClipboardPaste,
  Code,
  Copy,
  Eye,
  FileInput,
  Image as ImageIcon,
  Minus,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  Slash,
  SlidersHorizontal,
  Table as TableIcon,
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

  // 삽입 버튼 정의 (lucide 아이콘 또는 인라인 ellipse)
  const insertBtns: { type: Element['type']; icon: LucideIcon | null; ell?: boolean; label: string }[] = [
    { type: 'text', icon: Type, label: t('z_text') },
    { type: 'barcode', icon: ScanLine, label: t('z_barcode') },
    { type: 'qr', icon: QrCode, label: t('z_qr') },
    { type: 'image', icon: ImageIcon, label: t('z_image') },
    { type: 'table', icon: TableIcon, label: t('z_table') },
    { type: 'box', icon: BoxSelect, label: t('z_box') },
    { type: 'ellipse', icon: null, ell: true, label: t('z_ellipse') },
    { type: 'circle', icon: Circle, label: t('z_circle') },
    { type: 'line', icon: Minus, label: t('z_line') },
    { type: 'diagonal', icon: Slash, label: t('z_diagonal') },
  ]

  // 편집 조작 버튼(undo/redo/copy/paste)
  const editOp = (icon: LucideIcon, title: string, onClick: () => void, disabled: boolean, first: boolean) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="wb-zpl-iconbtn"
      style={{
        width: 34,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        border: 'none',
        borderLeft: first ? 'none' : '1px solid var(--wb-color-divider)',
        color: 'var(--wb-color-text)',
        cursor: 'pointer',
      }}
    >
      <Icon icon={icon} size={15} />
    </button>
  )

  const modeOpt = (m: 'edit' | 'preview', icon: LucideIcon, label: string) => {
    const on = z.mode === m
    return (
      <button
        type="button"
        onClick={() => api.setMode(m)}
        className={'wb-zpl-seg-opt' + (on ? ' on' : '')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 11px',
          fontFamily: HEADING,
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          border: 'none',
          background: on ? 'var(--wb-color-accent)' : 'transparent',
          color: on ? 'var(--wb-color-bg)' : 'var(--wb-color-text)',
        }}
      >
        <Icon icon={icon} size={15} />
        {label}
      </button>
    )
  }

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
      {/* INSERT 그룹 */}
      <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)' }}>
        {t('z_insert')}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {insertBtns.map((b) => (
          <button
            key={b.type}
            type="button"
            onClick={() => api.addEl(b.type)}
            className="wb-btn wb-btn-secondary"
            style={{ height: 32, gap: 6, fontSize: 13, padding: '0 10px' }}
          >
            {b.ell ? <EllipseIcon size={15} /> : b.icon ? <Icon icon={b.icon} size={15} /> : null}
            {b.label}
          </button>
        ))}
      </div>

      {/* 세로 구분선 */}
      <span style={{ width: 1, height: 24, background: 'var(--wb-color-divider)' }} />

      {/* 편집 조작 그룹 */}
      <div style={{ display: 'flex', border: '1px solid var(--wb-color-divider)' }}>
        {editOp(Undo2, t('z_undo'), api.undo, !api.canUndo, true)}
        {editOp(Redo2, t('z_redo'), api.redo, !api.canRedo, false)}
        {editOp(Copy, t('z_copy_el'), api.copySel, !api.canCopy, false)}
        {editOp(ClipboardPaste, t('z_paste'), api.pasteClip, !api.canPaste, false)}
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

      {/* 모드 세그먼트 */}
      <div style={{ display: 'flex', border: '1px solid var(--wb-color-divider)', height: 32 }}>
        {modeOpt('edit', Pencil, t('z_edit'))}
        {modeOpt('preview', Eye, t('z_preview'))}
      </div>

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
