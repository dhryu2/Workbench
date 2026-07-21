// 공통 도구 placeholder — 전용 화면이 아직 없는 도구가 마운트되는 자리(사선 해치 배경 + 라우트 표시).
import { LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../components/Blueprint'
import { Icon } from '../lib/icons'

export function ToolPlaceholder({ toolId }: { toolId: string }) {
  const { t } = useTranslation()

  return (
    <div style={{ flex: 1, padding: '26px 34px', minHeight: 0 }}>
      <Blueprint
        style={{
          height: '100%',
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 8,
          color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)',
          background:
            'repeating-linear-gradient(-45deg, transparent, transparent 11px, color-mix(in srgb, var(--wb-color-text) 3%, transparent) 11px, color-mix(in srgb, var(--wb-color-text) 3%, transparent) 12px)',
        }}
      >
        <span
          style={{
            display: 'flex',
            color: 'color-mix(in srgb, var(--wb-color-text) 35%, transparent)',
            marginBottom: 6,
          }}
        >
          <Icon icon={LayoutGrid} size={30} />
        </span>
        <div
          style={{
            fontFamily: 'var(--wb-font-heading)',
            fontWeight: 600,
            fontSize: 18,
            color: 'color-mix(in srgb, var(--wb-color-text) 70%, transparent)',
          }}
        >
          {t('tool_placeholder_title')}
        </div>
        <p style={{ fontSize: 14, margin: 0 }}>{t('tool_placeholder_body')}</p>
        <code
          style={{
            fontSize: 12,
            padding: '4px 10px',
            marginTop: 6,
            background: 'var(--wb-color-surface)',
            border: '1px solid var(--wb-color-divider)',
            color: 'var(--wb-color-accent-700)',
          }}
        >
          /tools/{toolId}
        </code>
      </Blueprint>
    </div>
  )
}
