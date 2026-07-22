// 셸 전역 상태 — 사이드바 접힘 + 커맨드 팔레트 표시.
// 라우팅 상태(현재 도구)는 react-router URL이 진실의 원천이므로 여기서 다루지 않는다.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface WorkbenchState {
  collapsed: boolean
  toggleCollapsed: () => void
  paletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

const WorkbenchContext = createContext<WorkbenchState | null>(null)

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [])
  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])
  const togglePalette = useCallback(() => setPaletteOpen((o) => !o), [])

  const value = useMemo<WorkbenchState>(
    () => ({
      collapsed,
      toggleCollapsed,
      paletteOpen,
      openPalette,
      closePalette,
      togglePalette,
    }),
    [collapsed, toggleCollapsed, paletteOpen, openPalette, closePalette, togglePalette],
  )

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>
}

export function useWorkbench(): WorkbenchState {
  const ctx = useContext(WorkbenchContext)
  if (!ctx) throw new Error('useWorkbench must be used within WorkbenchProvider')
  return ctx
}
