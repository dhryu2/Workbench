// 백엔드 /stats API 클라이언트 — 방문/도구 사용 카운터.
// 서버는 204(본문 없음)로만 답한다. 집계 수치는 응답에 실리지 않으므로 읽을 것도 없고,
// 실패해도 앱 동작에 영향이 없도록 조용히 무시한다.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

// 방문은 페이지 로드당 1회. StrictMode의 이펙트 이중 호출도 여기서 걸러진다.
let visitSent = false

// 같은 도구를 짧은 간격으로 다시 집계하지 않는다(StrictMode 이중 호출, 뒤로가기 연타 흡수).
// 세션 내 재진입은 정상적으로 다시 집계되도록 영구 차단이 아닌 시간 창으로 막는다.
const TOOL_DEDUPE_MS = 2000
const lastToolSentAt = new Map<string, number>()

export async function postVisit(): Promise<void> {
  if (visitSent) return
  visitSent = true
  try {
    await fetch(`${API_BASE}/stats/visit`, { method: 'POST' })
  } catch (e) {
    console.debug('postVisit failed', e)
  }
}

export async function postToolUsage(toolId: string): Promise<void> {
  const now = Date.now()
  const last = lastToolSentAt.get(toolId)
  if (last !== undefined && now - last < TOOL_DEDUPE_MS) return
  lastToolSentAt.set(toolId, now)
  try {
    await fetch(`${API_BASE}/stats/tools/${encodeURIComponent(toolId)}/usage`, { method: 'POST' })
  } catch (e) {
    console.debug('postToolUsage failed', e)
  }
}
