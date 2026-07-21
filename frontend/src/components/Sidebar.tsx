// 사이드바 — 즐겨찾기 / 최근 사용 / 카테고리별 전체 도구 + 하단 접기 버튼.
// 활성 상태는 현재 URL(/tools/:toolId)로 판정한다.
import { PanelLeft } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useMatch } from 'react-router-dom'
import { CATEGORIES, TOOLS, toolById, type Tool } from '../data/catalog'
import { Icon, ToolIcon } from '../lib/icons'
import { useLang } from '../lib/useLang'
import { useOpenTool } from '../lib/useOpenTool'
import { useWorkbench } from '../lib/workbench-context'

export function Sidebar() {
  const { t } = useTranslation()
  const lang = useLang()
  const { collapsed, toggleCollapsed } = useWorkbench()
  const { favorites, recents } = useWorkbench()
  const openTool = useOpenTool()
  const match = useMatch('/tools/:toolId')
  const activeId = match?.params.toolId ?? null

  // ── 스타일 팩토리(프로토타입 renderVals 대응) ──
  const rowStyle = (active: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 10,
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '9px 0' : '7px 9px',
    cursor: 'pointer',
    userSelect: 'none',
    color: active ? 'var(--wb-color-accent-700)' : 'var(--wb-color-text)',
    background: active ? 'var(--wb-color-accent-100)' : 'transparent',
    borderLeft: active ? '2px solid var(--wb-color-accent)' : '2px solid transparent',
    transition: 'background .12s',
  })
  const labelStyle: CSSProperties = {
    display: collapsed ? 'none' : 'block',
    fontSize: 13,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  const iconStyle: CSSProperties = {
    flex: 'none',
    width: 20,
    height: 20,
    display: 'grid',
    placeItems: 'center',
    color: 'inherit',
  }
  const headStyle: CSSProperties = {
    display: collapsed ? 'none' : 'block',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'color-mix(in srgb, var(--wb-color-text) 45%, transparent)',
    padding: '0 9px',
    margin: '0 0 6px',
  }

  const NavRow = ({ tool }: { tool: Tool }) => {
    const active = activeId === tool.id
    const name = tool.name[lang]
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => openTool(tool.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openTool(tool.id)
          }
        }}
        title={name}
        style={rowStyle(active)}
      >
        <span style={iconStyle}>
          <ToolIcon name={tool.icon} size={18} />
        </span>
        <span style={labelStyle}>{name}</span>
      </div>
    )
  }

  // ── 데이터 구성 ──
  const favItems = favorites.map(toolById).filter((x): x is Tool => Boolean(x))
  const recentItems = recents.map(toolById).filter((x): x is Tool => Boolean(x))
  const sideGroups = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name[lang],
    items: TOOLS.filter((tool) => tool.cat === c.id),
  })).filter((g) => g.items.length)

  return (
    <aside
      className="wb-scroll"
      style={{
        flex: 'none',
        width: collapsed ? 60 : 246,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--wb-color-divider)',
        background: 'var(--wb-color-bg)',
        transition: 'width .16s ease',
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 10px',
        }}
      >
        {favItems.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={headStyle}>{t('fav')}</div>
            {favItems.map((tool) => (
              <NavRow key={`fav-${tool.id}`} tool={tool} />
            ))}
          </div>
        )}

        {recentItems.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={headStyle}>{t('recent')}</div>
            {recentItems.map((tool) => (
              <NavRow key={`recent-${tool.id}`} tool={tool} />
            ))}
          </div>
        )}

        {sideGroups.map((group) => (
          <div key={group.id} style={{ marginBottom: 14 }}>
            <div style={headStyle}>{group.name}</div>
            {group.items.map((tool) => (
              <NavRow key={`${group.id}-${tool.id}`} tool={tool} />
            ))}
          </div>
        ))}
      </div>

      {/* 하단 접기/펼치기 버튼 */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? t('expand') : t('collapse')}
        className="wb-collapse-btn"
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '11px 0' : '11px 12px',
          margin: 0,
          cursor: 'pointer',
          border: 'none',
          borderTop: '1px solid var(--wb-color-divider)',
          background: 'transparent',
          color: 'color-mix(in srgb, var(--wb-color-text) 65%, transparent)',
          fontFamily: 'var(--wb-font-body)',
        }}
      >
        <span
          style={{
            display: 'flex',
            transition: 'transform .2s',
            transform: collapsed ? 'rotate(180deg)' : 'none',
          }}
        >
          <Icon icon={PanelLeft} size={18} />
        </span>
        <span style={{ display: collapsed ? 'none' : 'block', fontSize: 13 }}>
          {collapsed ? t('expand') : t('collapse')}
        </span>
      </button>
    </aside>
  )
}
