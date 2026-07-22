// 도구 열기 액션 — URL 이동 + 팔레트 닫기를 한 번에 처리.
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkbench } from './workbench-context'

export function useOpenTool(): (id: string) => void {
  const navigate = useNavigate()
  const { closePalette } = useWorkbench()

  return useCallback(
    (id: string) => {
      closePalette()
      navigate(`/tools/${id}`)
    },
    [navigate, closePalette],
  )
}
