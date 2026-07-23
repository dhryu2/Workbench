// ZPL 가져오기 다이얼로그 — 실시간 유효성 배지 + 파싱 검증(오류코드) + 성공 시 로드.
import { AlertTriangle, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../../lib/icons'
import type { ZplEditorApi } from '../useZplEditor'
import { Dialog } from './Dialog'

export function ImportDialog({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z } = api

  // 오류코드 → 번역 메시지 (형식: 'no_xa' | 'no_xz' | 'xq|N' | 'bad|N' | 'unsupported|^CMD|N')
  let errorDetail: string | null = null
  if (z.importError === 'no_xa') errorDetail = t('z_err_no_xa')
  else if (z.importError === 'no_xz') errorDetail = t('z_err_no_xz')
  else if (z.importError && z.importError.indexOf('xq|') === 0) errorDetail = t('z_err_xq', { n: z.importError.slice(3) })
  else if (z.importError && z.importError.indexOf('bad|') === 0) errorDetail = t('z_err_bad', { n: z.importError.slice(4) })
  else if (z.importError && z.importError.indexOf('unsupported|') === 0) {
    const parts = z.importError.split('|')
    errorDetail = t('z_err_unsupported', { cmd: parts[1] || '?', n: parts[2] || '?' })
  }

  const validReady = !z.importError && /\^XA/.test(z.importText) && /\^XZ/.test(z.importText)

  return (
    <Dialog
      title={t('z_import_title')}
      subtitle={t('z_import_body')}
      onClose={api.closeImport}
      width={620}
      footer={
        <>
          <button type="button" onClick={api.closeImport} className="wb-btn wb-btn-secondary" style={{ height: 36, fontSize: 14 }}>{t('z_cancel')}</button>
          <button type="button" onClick={api.doImport} className="wb-btn wb-btn-primary" style={{ height: 36, fontSize: 14 }}>{t('z_do_import')}</button>
        </>
      }
    >
      <textarea
        className="wb-input"
        value={z.importText}
        onChange={(e) => api.setImportText(e.target.value)}
        placeholder={t('z_import_ph')}
        style={{ width: '100%', minHeight: 210, resize: 'vertical', fontFamily: 'var(--wb-font-mono)', fontSize: 13, lineHeight: 1.5 }}
      />

      {/* 유효성 배지 */}
      {validReady && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '9px 12px', background: 'var(--wb-color-accent-100)', border: '1px solid var(--wb-color-accent)', color: 'var(--wb-color-accent-800)', fontSize: 13 }}>
          <span style={{ display: 'flex', color: 'var(--wb-color-accent-700)' }}>
            <Icon icon={Check} size={16} />
          </span>
          {t('z_parse_ok')}
        </div>
      )}

      {/* 파싱 오류 */}
      {errorDetail && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12, padding: '10px 12px', background: 'color-mix(in srgb, #b34a3a 12%, transparent)', border: '1px solid color-mix(in srgb, #b34a3a 55%, transparent)', color: '#b34a3a' }}>
          <span style={{ display: 'flex', flex: 'none', marginTop: 1 }}>
            <Icon icon={AlertTriangle} size={16} />
          </span>
          <div>
            <div style={{ fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 14 }}>{t('z_parse_err')}</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{errorDetail}</div>
          </div>
        </div>
      )}
    </Dialog>
  )
}
