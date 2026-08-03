// 도구 진입 프레임(`/tools/:toolId`) — 브레드크럼 + 타이틀 행 + 도구 콘텐츠.
// 콘텐츠는 레지스트리(TOOL_COMPONENTS)에 등록된 전용 화면을, 미등록 도구는 공통 placeholder를 렌더한다.
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { categoryName, toolById } from '../data/catalog'
import { Icon, ToolIcon } from '../lib/icons'
import { postToolUsage } from '../lib/api'
import { TOOL_COMPONENTS } from '../tools/registry'
import { ToolPlaceholder } from './ToolPlaceholder'
import { useLang } from '../lib/useLang'

export function ToolFramePage() {
  const { t } = useTranslation()
  const lang = useLang()
  const navigate = useNavigate()
  const { toolId } = useParams()
  const tool = toolId ? toolById(toolId) : undefined

  // 도구가 바뀔 때마다(=도구 진입 시) 사용 횟수 집계.
  // 이 이펙트는 아래 `!tool` 조기 반환보다 먼저 등록되므로, 카탈로그에 없는 id로도 실행된다.
  // 그대로 두면 누구나 /tools/<아무거나> 로 임의의 scopeKey 행을 만들 수 있어 반드시 tool로 가드한다.
  useEffect(() => {
    if (tool) postToolUsage(tool.id)
  }, [tool])

  // 존재하지 않는 도구 id → 런처로
  if (!tool) return <Navigate to="/" replace />

  // 등록된 전용 화면(예: QR 생성기). 없으면 공통 placeholder를 렌더한다.
  const ToolComponent = TOOL_COMPONENTS[tool.id]

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
        </div>
      </div>

      {/* 콘텐츠 영역 — 등록된 전용 화면, 없으면 공통 placeholder */}
      {ToolComponent ? <ToolComponent /> : <ToolPlaceholder toolId={tool.id} />}
    </div>
  )
}
