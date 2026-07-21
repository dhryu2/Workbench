// 플랫폼 감지 — 커맨드 팔레트 단축키 힌트 표기(mac: ⌘K / 그 외: Ctrl K)에 사용.
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent || '')

export const cmdHint = isMac ? '⌘K' : 'Ctrl K'
