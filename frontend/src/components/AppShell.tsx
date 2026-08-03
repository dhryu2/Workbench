// 앱 셸 — 항상 렌더되는 chrome(상단 바 + 사이드바) + 라우트별 메인(Outlet) + 커맨드 팔레트.
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { postVisit } from '../lib/api'
import { useWorkbench } from '../lib/workbench-context'

export function AppShell() {
  const { paletteOpen, togglePalette } = useWorkbench()

  // 전역 ⌘K / Ctrl+K → 팔레트 토글
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        togglePalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePalette])

  // 앱 셸 마운트 시 1회 방문 카운트 집계
  useEffect(() => {
    postVisit()
  }, [])

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--wb-color-bg)',
        color: 'var(--wb-color-text)',
        overflow: 'hidden',
      }}
    >
      <TopBar />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar />
        <main
          className="wb-scroll"
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--wb-color-bg)' }}
        >
          <Outlet />
        </main>
      </div>
      {paletteOpen && <CommandPalette />}
    </div>
  )
}
