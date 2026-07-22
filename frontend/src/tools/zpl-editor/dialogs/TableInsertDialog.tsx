// 표 삽입 다이얼로그 — 행/열 수 입력(기본 3×3). 삽입 시 R 1~12·C 1~8 클램프.
import { Table as TableIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../../lib/icons'
import type { ZplEditorApi } from '../useZplEditor'
import { Dialog } from './Dialog'

const labelStyle = { display: 'block', fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)', marginBottom: 6 } as const

export function TableInsertDialog({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z } = api

  return (
    <Dialog
      title={t('z_table_title')}
      subtitle={t('z_table_body')}
      onClose={api.closeTableDialog}
      width={460}
      footer={
        <>
          <button type="button" onClick={api.closeTableDialog} className="wb-btn wb-btn-secondary" style={{ height: 36, fontSize: 14 }}>{t('z_cancel')}</button>
          <button type="button" onClick={api.insertTable} className="wb-btn wb-btn-primary" style={{ height: 36, gap: 6, fontSize: 14 }}>
            <Icon icon={TableIcon} size={15} />
            {t('z_insert_table')}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <label style={{ flex: 1 }}>
          <span style={labelStyle}>{t('z_rows')}</span>
          <input className="wb-input" inputMode="numeric" value={z.tableRows} onChange={(e) => api.setTableRows(e.target.value)} style={{ height: 36, fontFamily: 'var(--wb-font-mono)', fontSize: 13 }} />
        </label>
        <label style={{ flex: 1 }}>
          <span style={labelStyle}>{t('z_cols')}</span>
          <input className="wb-input" inputMode="numeric" value={z.tableCols} onChange={(e) => api.setTableCols(e.target.value)} style={{ height: 36, fontFamily: 'var(--wb-font-mono)', fontSize: 13 }} />
        </label>
      </div>
    </Dialog>
  )
}
