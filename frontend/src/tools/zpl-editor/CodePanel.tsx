// ZPL 코드 패널 — 줄번호 + 요소 연동(hover/select 양방향) + Copy(1.4s "Copied") + 닫기.
import { Check, Copy, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../lib/icons'
import type { ZplEditorApi } from './useZplEditor'

export function CodePanel({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z, zplLines } = api

  return (
    <div style={{ flex: 'none', width: 360, borderLeft: '1px solid var(--wb-color-divider)', background: 'var(--wb-color-bg)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 헤더 */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px 11px 16px', borderBottom: '1px solid var(--wb-color-divider)' }}>
        <span style={{ fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 14 }}>{t('z_zpl_title')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" onClick={api.copyZpl} className="wb-btn wb-btn-ghost" style={{ gap: 6, fontSize: 13, height: 30 }}>
            <Icon icon={z.copied ? Check : Copy} size={14} />
            {z.copied ? t('z_copied') : t('z_copy')}
          </button>
          <button type="button" onClick={api.toggleCode} aria-label={t('z_close')} className="wb-zpl-iconbtn" style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'color-mix(in srgb, var(--wb-color-text) 55%, transparent)' }}>
            <Icon icon={X} size={15} />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="wb-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', fontFamily: 'var(--wb-font-mono)', fontSize: 12, lineHeight: 1.7, padding: '8px 0' }}>
        {zplLines.map((line, i) => {
          const linked = !line.isHeader && line.elId !== null
          const active = linked && line.elId === z.sel
          const hovered = linked && line.elId === z.hover
          return (
            <div
              key={i}
              className={linked ? 'wb-zpl-codeline' : undefined}
              onClick={linked ? () => api.selectEl(line.elId as string) : undefined}
              onPointerEnter={linked ? () => api.hoverEl(line.elId) : undefined}
              onPointerLeave={linked ? () => api.clearHover() : undefined}
              style={{
                display: 'flex',
                gap: 12,
                padding: '2px 12px',
                background: active ? 'var(--wb-color-accent-100)' : hovered ? 'color-mix(in srgb, var(--wb-color-accent) 7%, transparent)' : 'transparent',
                borderLeft: active ? '2px solid var(--wb-color-accent)' : '2px solid transparent',
              }}
            >
              <span style={{ flex: 'none', width: 22, textAlign: 'right', color: 'color-mix(in srgb, var(--wb-color-text) 38%, transparent)', userSelect: 'none' }}>{i + 1}</span>
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
