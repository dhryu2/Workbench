// 라벨 설정 다이얼로그 — 단위/크기/밀도 → ^PW·^LL 즉시 반영. 취소 개념 없음(Done).
import { useTranslation } from 'react-i18next'
import { DPI_BY_DPMM } from '../types'
import type { Dpmm } from '../types'
import type { ZplEditorApi } from '../useZplEditor'
import { Dialog } from './Dialog'

const HEADING = 'var(--wb-font-heading)'

export function SetupDialog({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z, PW, LL } = api
  const unit = z.unit

  const unitBtn = (u: 'in' | 'mm', label: string) => {
    const on = unit === u
    return (
      <button
        type="button"
        onClick={() => api.setUnit(u)}
        className={'wb-zpl-seg-opt' + (on ? ' on' : '')}
        style={{ flex: 1, height: 38, border: 'none', cursor: 'pointer', fontFamily: HEADING, fontWeight: 600, fontSize: 13, background: on ? 'var(--wb-color-accent)' : 'transparent', color: on ? 'var(--wb-color-bg)' : 'var(--wb-color-text)' }}
      >
        {label}
      </button>
    )
  }

  return (
    <Dialog
      title={t('z_setup')}
      subtitle={t('z_setup_body')}
      onClose={api.closeSetup}
      width={480}
      footer={
        <button type="button" onClick={api.closeSetup} className="wb-btn wb-btn-primary" style={{ height: 36, fontSize: 14 }}>
          {t('z_done')}
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 단위 세그 */}
        <div>
          <span style={{ display: 'block', fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)', marginBottom: 6 }}>{t('z_unit')}</span>
          <div style={{ display: 'flex', border: '1px solid var(--wb-color-divider)' }}>
            {unitBtn('in', t('z_unit_in'))}
            <span style={{ width: 1, background: 'var(--wb-color-divider)' }} />
            {unitBtn('mm', t('z_unit_mm'))}
          </div>
        </div>

        {/* 너비 / 높이 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)', marginBottom: 6 }}>{`${t('z_width')} (${unit})`}</span>
            <input className="wb-input" inputMode="decimal" value={z.w} onChange={(e) => api.setDim('w', e.target.value)} style={{ height: 36, fontFamily: 'var(--wb-font-mono)', fontSize: 13 }} />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)', marginBottom: 6 }}>{`${t('z_height')} (${unit})`}</span>
            <input className="wb-input" inputMode="decimal" value={z.h} onChange={(e) => api.setDim('h', e.target.value)} style={{ height: 36, fontFamily: 'var(--wb-font-mono)', fontSize: 13 }} />
          </label>
        </div>

        {/* 인쇄 밀도 */}
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)', marginBottom: 6 }}>{t('z_density')}</span>
          <select className="wb-input wb-zpl-select" value={String(z.dpmm)} onChange={(e) => api.setDpmm(parseInt(e.target.value, 10))} style={{ height: 36, fontSize: 13 }}>
            {([6, 8, 12, 24] as Dpmm[]).map((d) => (
              <option key={d} value={String(d)}>{`${d} dpmm · ${DPI_BY_DPMM[d]} dpi`}</option>
            ))}
          </select>
        </label>

        {/* 출력 크기 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--wb-color-divider)' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--wb-color-text) 45%, transparent)' }}>{t('z_output')}</span>
          <span style={{ fontFamily: 'var(--wb-font-mono)', fontWeight: 600, fontSize: 14, color: 'var(--wb-color-accent-700)' }}>{`${PW} × ${LL} dot`}</span>
        </div>
      </div>
    </Dialog>
  )
}
