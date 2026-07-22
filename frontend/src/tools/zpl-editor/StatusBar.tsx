// 하단 상태바(34px) — 선택 요소 좌표/크기 · 힌트 · 스펙.
import { useTranslation } from 'react-i18next'
import { norm } from './geometry'
import type { ZplEditorApi } from './useZplEditor'

export function StatusBar({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z, selEl, zSpecText } = api

  let status: string | null = null
  if (selEl) {
    if (selEl.type === 'table' && z.selCell) {
      status = t('z_status_cell', { r: z.selCell.r + 1, c: z.selCell.c + 1 })
    } else if (selEl.type === 'circle') {
      status = `X ${selEl.x} · Y ${selEl.y} · ⌀ ${selEl.d} dot`
    } else if (selEl.type === 'line') {
      status = `X ${selEl.x} · Y ${selEl.y} · L ${selEl.len} dot`
    } else {
      const n = norm(selEl)
      status = `X ${selEl.x} · Y ${selEl.y} · ${n.w}×${n.h} dot`
    }
  }

  return (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, height: 34, padding: '0 18px', borderTop: '1px solid var(--wb-color-divider)', fontSize: 12 }}>
      {status && <span style={{ fontFamily: 'var(--wb-font-mono)', color: 'var(--wb-color-accent-700)', fontWeight: 600 }}>{status}</span>}
      <div style={{ flex: 1 }} />
      <span className="wb-text-muted">{t('z_status_hint')}</span>
      <span className="wb-text-muted" style={{ fontFamily: 'var(--wb-font-mono)' }}>{zSpecText}</span>
    </div>
  )
}
