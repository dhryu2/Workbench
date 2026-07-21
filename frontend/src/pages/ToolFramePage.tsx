// 도구 진입 프레임(`/tools/:toolId`) — 브레드크럼 + 타이틀 행 + 빈 placeholder.
// 개별 도구 콘텐츠는 범위 밖: placeholder 자리에 이후 각 도구 컴포넌트가 마운트된다.
import { ArrowLeft, LayoutGrid, Star } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Blueprint } from '../components/Blueprint'
import { categoryName, toolById } from '../data/catalog'
import { Icon, ToolIcon } from '../lib/icons'
import { useLang } from '../lib/useLang'
import { useWorkbench } from '../lib/workbench-context'

export function ToolFramePage() {
  const { t } = useTranslation()
  const lang = useLang()
  const navigate = useNavigate()
  const { toolId } = useParams()
  const { isFavorite, toggleFavorite, pushRecent } = useWorkbench()
  const tool = toolId ? toolById(toolId) : undefined

  // 딥링크로 직접 진입해도 최근 사용에 반영
  useEffect(() => {
    if (tool) pushRecent(tool.id)
  }, [tool, pushRecent])

  // 존재하지 않는 도구 id → 런처로
  if (!tool) return <Navigate to="/" replace />

  const fav = isFavorite(tool.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 도구 헤더 */}
      <div
        style={{
          flex: 'none',
          padding: '22px 34px',
          borderBottom: '1px solid var(--wb-color-divider)',
        }}
      >
        {/* 브레드크럼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="wb-btn wb-btn-ghost"
            style={{ gap: 6, fontSize: 13, padding: '4px 6px' }}
          >
            <Icon icon={ArrowLeft} size={15} />
            {t('back')}
          </button>
          <span className="wb-text-muted" style={{ fontSize: 12 }}>
            /
          </span>
          <span className="wb-text-muted" style={{ fontSize: 12 }}>
            {categoryName(tool.cat, lang)}
          </span>
        </div>

        {/* 타이틀 행 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 15 }}>
          <span
            style={{
              width: 48,
              height: 48,
              flex: 'none',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid var(--wb-color-divider)',
              color: 'var(--wb-color-accent)',
            }}
          >
            <ToolIcon name={tool.icon} size={26} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 28, margin: '0 0 3px', letterSpacing: '-0.02em' }}>
              {tool.name[lang]}
            </h1>
            <p className="wb-text-muted" style={{ fontSize: 14, margin: 0 }}>
              {tool.desc[lang]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(tool.id)}
            className="wb-btn wb-btn-secondary"
            style={{ height: 34, gap: 7, fontSize: 13 }}
          >
            <Icon icon={Star} size={15} fill={fav ? 'var(--wb-color-accent)' : 'none'} />
            {fav ? t('fav_remove') : t('fav_add')}
          </button>
        </div>
      </div>

      {/* 콘텐츠 placeholder — 각 도구 컴포넌트가 마운트될 자리 */}
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
            /tools/{tool.id}
          </code>
        </Blueprint>
      </div>
    </div>
  )
}
