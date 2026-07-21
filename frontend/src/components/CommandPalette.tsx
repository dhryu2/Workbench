// 커맨드 팔레트(⌘K/Ctrl K) — 도구명·설명·카테고리 부분일치 검색 + 키보드 네비(↑↓ 순환/↵/esc).
// paletteOpen일 때만 마운트되므로 열 때마다 쿼리·선택이 초기화된다.
import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from './Blueprint'
import { TOOLS, categoryName } from '../data/catalog'
import { Icon, ToolIcon } from '../lib/icons'
import { useLang } from '../lib/useLang'
import { useOpenTool } from '../lib/useOpenTool'
import { useWorkbench } from '../lib/workbench-context'

export function CommandPalette() {
  const { t } = useTranslation()
  const lang = useLang()
  const { closePalette } = useWorkbench()
  const openTool = useOpenTool()
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 마운트 시 입력에 포커스
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const pq = query.trim().toLowerCase()
    return TOOLS.filter(
      (tool) =>
        !pq ||
        tool.name[lang].toLowerCase().includes(pq) ||
        tool.desc[lang].toLowerCase().includes(pq) ||
        categoryName(tool.cat, lang).toLowerCase().includes(pq) ||
        // 도구명은 ko+en 양쪽 모두 부분일치 대상(README 커맨드 팔레트 규칙)
        (tool.name.en + tool.name.ko).toLowerCase().includes(pq),
    )
  }, [query, lang])

  const selClamped = results.length ? Math.min(sel, results.length - 1) : 0

  // 키보드 네비게이션 (⌘K 토글은 AppShell에서 전역 처리)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'escape') {
        e.preventDefault()
        closePalette()
      } else if (k === 'arrowdown') {
        e.preventDefault()
        if (results.length) setSel((s) => (s + 1) % results.length)
      } else if (k === 'arrowup') {
        e.preventDefault()
        if (results.length) setSel((s) => (s - 1 + results.length) % results.length)
      } else if (k === 'enter') {
        e.preventDefault()
        if (results.length) openTool(results[selClamped].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [results, selClamped, closePalette, openTool])

  return (
    <div
      onClick={closePalette}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '12vh',
        background: 'color-mix(in srgb, var(--wb-color-neutral-900) 45%, transparent)',
        animation: 'wb-fade .12s ease',
      }}
    >
      <Blueprint
        onClick={(e) => e.stopPropagation()}
        className="wb-elev-lg"
        style={{
          width: 'min(600px, 92vw)',
          height: 'max-content',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--wb-color-bg)',
          animation: 'wb-pop .16s ease',
        }}
      >
        {/* 입력 행 */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '14px 16px',
            borderBottom: '1px solid var(--wb-color-divider)',
          }}
        >
          <span
            style={{ display: 'flex', color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)' }}
          >
            <Icon icon={Search} size={17} />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSel(0)
            }}
            placeholder={t('palette_ph')}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--wb-font-body)',
              fontSize: 16,
              color: 'var(--wb-color-text)',
            }}
          />
          <span
            style={{
              fontSize: 11,
              padding: '2px 7px',
              border: '1px solid var(--wb-color-divider)',
              color: 'color-mix(in srgb, var(--wb-color-text) 55%, transparent)',
            }}
          >
            esc
          </span>
        </div>

        {/* 결과 리스트 */}
        <div className="wb-scroll" style={{ overflowY: 'auto', padding: 7 }}>
          {results.length > 0 ? (
            results.map((tool, i) => {
              const on = i === selClamped
              return (
                <div
                  key={tool.id}
                  onClick={() => openTool(tool.id)}
                  onMouseEnter={() => setSel(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 11px',
                    cursor: 'pointer',
                    background: on ? 'var(--wb-color-accent-100)' : 'transparent',
                    color: on ? 'var(--wb-color-accent-800)' : 'var(--wb-color-text)',
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      flex: 'none',
                      display: 'grid',
                      placeItems: 'center',
                      border: '1px solid var(--wb-color-divider)',
                      color: 'var(--wb-color-accent)',
                    }}
                  >
                    <ToolIcon name={tool.icon} size={17} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tool.name[lang]}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)',
                      }}
                    >
                      {categoryName(tool.cat, lang)}
                    </div>
                  </div>
                  <span style={{ display: on ? 'flex' : 'none', color: 'var(--wb-color-accent-700)' }}>
                    <Icon icon={CornerDownLeft} size={15} />
                  </span>
                </div>
              )
            })
          ) : (
            <div
              style={{
                padding: '34px 16px',
                textAlign: 'center',
                color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)',
                fontSize: 14,
              }}
            >
              {t('palette_empty')}
            </div>
          )}
        </div>

        {/* 하단 힌트 바 */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            gap: 16,
            padding: '9px 16px',
            borderTop: '1px solid var(--wb-color-divider)',
            fontSize: 11,
            color: 'color-mix(in srgb, var(--wb-color-text) 55%, transparent)',
          }}
        >
          <span>↑↓ {t('palette_nav')}</span>
          <span>↵ {t('palette_sel')}</span>
          <span>esc {t('palette_close')}</span>
        </div>
      </Blueprint>
    </div>
  )
}
