// 미리보기 모드 — 생성된 ZPL 을 Labelary 실 API 로 렌더한 PNG 를 용지 자리에 표시.
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'
import type { ZplEditorApi } from './useZplEditor'

export function PreviewPane({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { preview, PW, LL, z } = api
  const Z = z.zoom

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--wb-color-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 12, padding: 34 }}>
      <Blueprint style={{ position: 'relative', width: PW * Z, height: LL * Z, background: '#fff', boxShadow: 'var(--wb-shadow-md)', flex: 'none', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {preview.loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--wb-color-accent-700)', fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 13 }}>
            <Icon icon={RefreshCw} size={22} className="wb-zpl-spin" />
            {t('z_preview_loading')}
          </div>
        ) : preview.error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24, textAlign: 'center', color: '#b34a3a', maxWidth: 320 }}>
            <Icon icon={AlertTriangle} size={22} />
            <span style={{ fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 14 }}>{t('z_preview_error')}</span>
            <span style={{ fontFamily: 'var(--wb-font-mono)', fontSize: 12, wordBreak: 'break-word' }}>{preview.error}</span>
          </div>
        ) : preview.url ? (
          <img src={preview.url} alt={t('z_preview_hint')} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <span className="wb-text-muted" style={{ fontSize: 13, padding: 24, textAlign: 'center' }}>{t('z_preview_hint')}</span>
        )}
      </Blueprint>
      {/* 서드파티 전송 고지 — 미리보기는 라벨 내용을 Labelary 로 전송한다(보안 리뷰 권고) */}
      <div className="wb-text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, maxWidth: 360, textAlign: 'center' }}>
        <Icon icon={AlertCircle} size={13} />
        <span>{t('z_preview_egress')}</span>
      </div>
    </div>
  )
}
