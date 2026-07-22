// 루트 런처(`/`) — 페이지 헤더 + 인라인 검색/카테고리 칩 + 카테고리별 도구 카드 그리드.
// 빈 상태(검색 결과 없음 / 빈 카탈로그)는 필터 결과·카탈로그 크기에 따라 자연 발생한다.
import { Inbox, Search } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../components/Blueprint'
import { CATEGORIES, TOOLS, categoryName, type Tool } from '../data/catalog'
import { Icon, ToolIcon } from '../lib/icons'
import { useLang } from '../lib/useLang'
import { useOpenTool } from '../lib/useOpenTool'

export function LauncherPage() {
  const { t } = useTranslation()
  const lang = useLang()
  const openTool = useOpenTool()
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  // ── 필터링 ──
  const q = query.trim().toLowerCase()
  const matchQ = (tool: Tool) =>
    !q ||
    tool.name[lang].toLowerCase().includes(q) ||
    tool.desc[lang].toLowerCase().includes(q) ||
    categoryName(tool.cat, lang).toLowerCase().includes(q) ||
    // 도구명은 ko+en 양쪽 모두 부분일치 대상
    (tool.name.en + tool.name.ko).toLowerCase().includes(q)
  const matchCat = (tool: Tool) => catFilter === 'all' || tool.cat === catFilter

  const filtered = useMemo(
    () => TOOLS.filter((tool) => matchCat(tool) && matchQ(tool)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, catFilter, lang],
  )

  const groups = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name[lang],
    tools: filtered.filter((tool) => tool.cat === c.id),
  })).filter((g) => g.tools.length)

  const showEmptyCatalog = TOOLS.length === 0
  const showNoResults = !showEmptyCatalog && filtered.length === 0
  const showGrid = !showEmptyCatalog && !showNoResults

  // ── 카테고리 칩 ──
  const chip = (id: string, label: string) => {
    const on = catFilter === id
    const style: CSSProperties = {
      cursor: 'pointer',
      fontFamily: 'var(--wb-font-body)',
      background: on ? 'var(--wb-color-accent)' : 'transparent',
      color: on ? 'var(--wb-color-bg)' : 'var(--wb-color-accent)',
      border: '1px solid var(--wb-color-accent)',
      transition: 'background .12s',
    }
    return (
      <button
        key={id}
        type="button"
        onClick={() => setCatFilter(id)}
        className="wb-tag"
        style={style}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 34px 90px' }}>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 34, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          {t('launcher_title')}
        </h1>
        <p className="wb-text-muted" style={{ fontSize: 14, margin: 0 }}>
          {t('launcher_sub', { count: TOOLS.length })}
        </p>
      </div>

      {/* 컨트롤 행 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 26,
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 380 }}>
          <span
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)',
            }}
          >
            <Icon icon={Search} size={17} />
          </span>
          <input
            className="wb-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('launcher_search')}
            style={{ paddingLeft: 34, height: 38 }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {chip('all', t('all'))}
          {CATEGORIES.map((c) => chip(c.id, c.name[lang]))}
        </div>
      </div>

      {/* 도구 그리드 */}
      {showGrid && (
        <div>
          {groups.map((group) => (
            <section key={group.id} style={{ marginBottom: 34 }}>
              <div
                style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}
              >
                <h2 style={{ fontSize: 18, margin: 0, letterSpacing: '-0.01em' }}>{group.name}</h2>
                <span className="wb-text-muted" style={{ fontSize: 12 }}>
                  {t('count', { count: group.tools.length })}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
                  gap: 16,
                }}
              >
                {group.tools.map((tool) => (
                  <Blueprint
                    key={tool.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTool(tool.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openTool(tool.id)
                      }
                    }}
                    className="wb-card wb-elev-sm wb-tool-card"
                    style={{
                      cursor: 'pointer',
                      gap: 11,
                      padding: 16,
                      minHeight: 138,
                      background: 'var(--wb-color-bg)',
                    }}
                  >
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        flex: 'none',
                        display: 'grid',
                        placeItems: 'center',
                        border: '1px solid var(--wb-color-divider)',
                        color: 'var(--wb-color-accent)',
                      }}
                    >
                      <ToolIcon name={tool.icon} size={22} />
                    </span>
                    <div className="wb-card-title" style={{ fontSize: 17 }}>
                      {tool.name[lang]}
                    </div>
                    <p className="wb-card-body" style={{ fontSize: 13, margin: 0 }}>
                      {tool.desc[lang]}
                    </p>
                    <div className="wb-card-meta">
                      <span className="wb-tag wb-tag-neutral">{group.name}</span>
                    </div>
                  </Blueprint>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {showNoResults && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '70px 20px',
          }}
        >
          <Blueprint
            style={{
              width: 64,
              height: 64,
              display: 'grid',
              placeItems: 'center',
              color: 'color-mix(in srgb, var(--wb-color-text) 45%, transparent)',
              marginBottom: 20,
            }}
          >
            <Icon icon={Search} size={26} />
          </Blueprint>
          <h3 style={{ fontSize: 20, margin: '0 0 6px' }}>{t('noresult_title')}</h3>
          <p className="wb-text-muted" style={{ fontSize: 14, margin: '0 0 16px', maxWidth: 360 }}>
            {t('noresult_body', { query })}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setCatFilter('all')
            }}
            className="wb-btn wb-btn-secondary"
            style={{ height: 34 }}
          >
            {t('clear_search')}
          </button>
        </div>
      )}

      {/* 빈 카탈로그 */}
      {showEmptyCatalog && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '70px 20px',
          }}
        >
          <Blueprint
            style={{
              width: 72,
              height: 72,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--wb-color-accent)',
              marginBottom: 20,
            }}
          >
            <Icon icon={Inbox} size={30} />
          </Blueprint>
          <h3 style={{ fontSize: 22, margin: '0 0 6px' }}>{t('empty_title')}</h3>
          <p className="wb-text-muted" style={{ fontSize: 14, margin: 0, maxWidth: 380 }}>
            {t('empty_body')}
          </p>
        </div>
      )}
    </div>
  )
}
