// 셸 전역 상태 — 즐겨찾기/최근 사용(localStorage 백업) + 사이드바 접힘 + 커맨드 팔레트 표시.
// 라우팅 상태(현재 도구)는 react-router URL이 진실의 원천이므로 여기서 다루지 않는다.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { readStringList, writeStringList } from './storage'

const FAV_KEY = 'wb_favorites'
const RECENT_KEY = 'wb_recents'
const FAV_SEED = ['qr-generator']
const RECENT_SEED = ['zpl-editor', 'qr-generator']
const RECENT_MAX = 6

interface WorkbenchState {
  favorites: string[]
  recents: string[]
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
  pushRecent: (id: string) => void
  collapsed: boolean
  toggleCollapsed: () => void
  paletteOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
}

const WorkbenchContext = createContext<WorkbenchState | null>(null)

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => readStringList(FAV_KEY, FAV_SEED))
  const [recents, setRecents] = useState<string[]>(() => readStringList(RECENT_KEY, RECENT_SEED))
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // 변경 시 즉시 localStorage에 반영
  useEffect(() => writeStringList(FAV_KEY, favorites), [favorites])
  useEffect(() => writeStringList(RECENT_KEY, recents), [recents])

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  // 도구 열 때: 최신을 맨 앞으로, 중복 제거, 최대 6개
  const pushRecent = useCallback((id: string) => {
    setRecents((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_MAX))
  }, [])

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), [])
  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])
  const togglePalette = useCallback(() => setPaletteOpen((o) => !o), [])

  const value = useMemo<WorkbenchState>(
    () => ({
      favorites,
      recents,
      isFavorite,
      toggleFavorite,
      pushRecent,
      collapsed,
      toggleCollapsed,
      paletteOpen,
      openPalette,
      closePalette,
      togglePalette,
    }),
    [
      favorites,
      recents,
      isFavorite,
      toggleFavorite,
      pushRecent,
      collapsed,
      toggleCollapsed,
      paletteOpen,
      openPalette,
      closePalette,
      togglePalette,
    ],
  )

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>
}

export function useWorkbench(): WorkbenchState {
  const ctx = useContext(WorkbenchContext)
  if (!ctx) throw new Error('useWorkbench must be used within WorkbenchProvider')
  return ctx
}
