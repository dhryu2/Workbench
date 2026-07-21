// 상단 바(56px) — 브랜드 락업 / 전역 검색 트리거(팔레트 오픈) / 언어 토글.
import { Languages, Search, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toggleLang } from '../i18n/config'
import { Icon } from '../lib/icons'
import { useLang } from '../lib/useLang'
import { cmdHint } from '../lib/platform'
import { useWorkbench } from '../lib/workbench-context'

export function TopBar() {
  const { t } = useTranslation()
  const lang = useLang()
  const navigate = useNavigate()
  const { openPalette } = useWorkbench()

  return (
    <header
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        height: 56,
        padding: '0 18px',
        borderBottom: '1px solid var(--wb-color-divider)',
        background: 'var(--wb-color-bg)',
        zIndex: 20,
      }}
    >
      {/* 좌: 브랜드 락업 → 런처 */}
      <div
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          cursor: 'pointer',
          userSelect: 'none',
          marginRight: 4,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--wb-color-accent)',
            color: 'var(--wb-color-bg)',
          }}
        >
          <Icon icon={Wrench} size={15} />
        </span>
        <span
          style={{
            fontFamily: 'var(--wb-font-heading)',
            fontWeight: 600,
            fontSize: 19,
            letterSpacing: '-0.01em',
          }}
        >
          Workbench
        </span>
      </div>

      {/* 중앙: 전역 검색 트리거 → 커맨드 팔레트 */}
      <button
        type="button"
        onClick={openPalette}
        className="wb-search-trigger"
        style={{
          flex: 1,
          maxWidth: 520,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          height: 36,
          padding: '0 12px',
          background: 'var(--wb-color-surface)',
          border: '1px solid var(--wb-color-divider)',
          borderRadius: 0,
          cursor: 'text',
          color: 'color-mix(in srgb, var(--wb-color-text) 55%, transparent)',
          fontFamily: 'var(--wb-font-body)',
        }}
      >
        <span style={{ display: 'flex', color: 'inherit' }}>
          <Icon icon={Search} size={17} />
        </span>
        <span style={{ fontSize: 14, flex: 1, textAlign: 'left' }}>{t('search_global')}</span>
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.04em',
            padding: '2px 7px',
            border: '1px solid var(--wb-color-divider)',
            color: 'color-mix(in srgb, var(--wb-color-text) 60%, transparent)',
          }}
        >
          {cmdHint}
        </span>
      </button>

      {/* 우: 언어 토글 (계정/유저 메뉴 없음) */}
      <button
        type="button"
        onClick={toggleLang}
        title={t('lang_switch')}
        className="wb-btn wb-btn-secondary"
        style={{ height: 34, gap: 7, fontSize: 13, padding: '0 12px' }}
      >
        <span style={{ display: 'flex' }}>
          <Icon icon={Languages} size={16} />
        </span>
        {lang === 'ko' ? 'KO' : 'EN'}
      </button>
    </header>
  )
}
