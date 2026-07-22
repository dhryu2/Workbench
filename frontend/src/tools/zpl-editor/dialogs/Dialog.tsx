// 다이얼로그 공통 셸 — 백드롭(클릭 닫힘) + Blueprint 카드(제목/부제/본문/우측 액션 푸터).
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Blueprint } from '../../../components/Blueprint'
import { Icon } from '../../../lib/icons'

export function Dialog({
  title,
  subtitle,
  onClose,
  width,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  width: number
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '9vh',
        background: 'color-mix(in srgb, var(--wb-color-neutral-900) 45%, transparent)',
        animation: 'wb-fade .12s ease',
      }}
    >
      <Blueprint
        onClick={(e) => e.stopPropagation()}
        className="wb-elev-lg"
        style={{
          width: `min(${width}px, 92vw)`,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--wb-color-bg)',
          animation: 'wb-pop .16s ease',
        }}
      >
        {/* 헤더 */}
        <div style={{ flex: 'none', padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 19, margin: 0 }}>{title}</h2>
            <button type="button" onClick={onClose} aria-label="close" className="wb-zpl-iconbtn" style={{ width: 28, height: 28, flex: 'none', display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'color-mix(in srgb, var(--wb-color-text) 55%, transparent)' }}>
              <Icon icon={X} size={16} />
            </button>
          </div>
          {subtitle && <p className="wb-text-muted" style={{ fontSize: 13, margin: '6px 0 0', lineHeight: 1.45 }}>{subtitle}</p>}
        </div>

        {/* 본문 */}
        <div className="wb-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 20px' }}>{children}</div>

        {/* 푸터 */}
        <div style={{ flex: 'none', display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--wb-color-divider)' }}>{footer}</div>
      </Blueprint>
    </div>
  )
}
