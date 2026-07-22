// 실제 QR 모듈 행렬(§6.3) — 캔버스가 스케일된 <img> 대신 진짜 모듈 격자를 그리기 위한 소스.
// geometry.qrModules 와 동일한 인코딩 경로를 쓰되, 행렬 전체를 (data, ecc) 키로 캐시한다.
import qrcode from 'qrcode-generator'
import type { Ecc } from '../types'

export interface QrMatrixData {
  count: number
  dark: boolean[][]
}

const cache = new Map<string, QrMatrixData | null>()

export function qrMatrix(data: string, ecc: Ecc): QrMatrixData | null {
  const key = ecc + '|' + (data || '')
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  let out: QrMatrixData | null
  try {
    // ESM 빌드 기본 stringToBytes 는 Latin1 절단 — 한글 안전하게 UTF-8 로 교체(qr-encode.ts 와 동일)
    qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s))
    const qr = qrcode(0, ecc)
    qr.addData(data || '', 'Byte')
    qr.make()
    const n = qr.getModuleCount()
    const dark: boolean[][] = []
    for (let r = 0; r < n; r++) {
      const row: boolean[] = []
      for (let c = 0; c < n; c++) row.push(qr.isDark(r, c))
      dark.push(row)
    }
    out = { count: n, dark }
  } catch {
    out = null // 인코딩 실패 → 흰 박스 폴백(v1 과 동일)
  }
  if (cache.size > 128) cache.clear()
  cache.set(key, out)
  return out
}
