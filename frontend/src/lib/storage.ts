// localStorage 문자열 배열 읽기/쓰기 헬퍼. 접근 불가(프라이빗 모드 등) 시 시드/무시로 안전 처리.
export function readStringList(key: string, seed: string[]): string[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string')
    }
  } catch {
    // 파싱/접근 실패 시 시드값 사용
  }
  return seed
}

export function writeStringList(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 실패는 무시(런타임 동작에는 영향 없음)
  }
}
