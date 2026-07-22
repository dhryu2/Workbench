// Konva 캔버스는 CSS 변수를 해석하지 못한다 — 렌더 시점에 계산값을 읽어 구체 문자열로 변환.
// 라벨 잉크/용지 색은 열전사 제약(§2)에 따라 고정값(#111 on #fff)이다.

export const INK = '#111'
export const PAPER = '#fff'

// document 루트의 CSS 변수 값을 읽는다(테마 변경 시 다음 렌더에서 새 값 반영).
export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
