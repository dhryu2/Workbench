// 이미지 유틸 — 캔버스(DOM) 기반. 엔진(순수 모듈)과 분리한 UI 전용 헬퍼다.
// 그레이스케일 → 임계값 이진화 → 선택적 Floyd–Steinberg 디더.
//
// v2 핵심: 래스터는 **정확히 w×h dot** 로 수행한다. 이 1비트 픽셀이
// ① 캔버스 프리뷰(src, 픽셀 보간 없이 확대)와 ② ^GFA 헥스(gfaHex) 의 공통 소스가 되어
// 에디터 화면과 프린터/Labelary 출력이 이미지에 한해 비트 단위로 일치한다.

// "WB" 엠블럼 PNG data URL 생성 — 신규 이미지 요소의 기본 비주얼.
// 캔버스 접근 불가(SSR 등) 시 undefined 를 반환한다.
export function makeEmblem(): string | undefined {
  try {
    if (typeof document === 'undefined') return undefined
    const c = document.createElement('canvas')
    c.width = c.height = 200
    const x = c.getContext('2d')
    if (!x) return undefined
    x.fillStyle = '#fff'
    x.fillRect(0, 0, 200, 200)
    x.fillStyle = '#111'
    // 사각 프레임(네 변)
    x.fillRect(8, 8, 184, 22)
    x.fillRect(8, 170, 184, 22)
    x.fillRect(8, 8, 22, 184)
    x.fillRect(170, 8, 22, 184)
    x.font = '700 92px "Barlow Condensed", system-ui, sans-serif'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText('WB', 100, 104)
    return c.toDataURL('image/png')
  } catch {
    return undefined
  }
}

// 래스터 결과: src = 1비트 픽셀 그대로의 PNG data URL(프리뷰), hex = ^GFA 데이터(행당 rowBytes).
// rowBytes/rows 는 hex 와 같은 래스터의 치수(헤더 정합용).
export interface RasterResult {
  src: string
  hex: string
  rowBytes: number
  rows: number
}

// 원본 data URL 을 w×h·threshold·dither 로 1비트 래스터화. 실패 시 null.
export function rasterize1bit(
  orig: string | undefined,
  w: number,
  h: number,
  threshold: number,
  dither: boolean,
): Promise<RasterResult | null> {
  return new Promise((resolve) => {
    if (!orig || typeof document === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => {
      try {
        const pw = Math.max(1, Math.round(w))
        const ph = Math.max(1, Math.round(h))
        const c = document.createElement('canvas')
        c.width = pw
        c.height = ph
        const ctx = c.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, pw, ph)
        ctx.drawImage(img, 0, 0, pw, ph)
        const idata = ctx.getImageData(0, 0, pw, ph)
        const d = idata.data
        const g = new Float32Array(pw * ph)
        for (let i = 0; i < pw * ph; i++) {
          const j = i * 4
          // 휘도(Rec.601)
          g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]
        }
        for (let y = 0; y < ph; y++) {
          for (let x = 0; x < pw; x++) {
            const i = y * pw + x
            const old = g[i]
            const nv = old < threshold ? 0 : 255
            const err = old - nv
            g[i] = nv
            if (dither) {
              // Floyd–Steinberg 오차 확산
              if (x + 1 < pw) g[i + 1] += (err * 7) / 16
              if (y + 1 < ph) {
                if (x > 0) g[i + pw - 1] += (err * 3) / 16
                g[i + pw] += (err * 5) / 16
                if (x + 1 < pw) g[i + pw + 1] += (err * 1) / 16
              }
            }
          }
        }
        // ^GFA 헥스: 행당 ceil(w/8) 바이트, MSB 우선, 검정=1. 마지막 바이트 잔여 비트는 0(흰색).
        const rowBytes = Math.ceil(pw / 8)
        const hexRows: string[] = []
        for (let y = 0; y < ph; y++) {
          let row = ''
          for (let bx = 0; bx < rowBytes; bx++) {
            let byte = 0
            for (let bit = 0; bit < 8; bit++) {
              const x = bx * 8 + bit
              if (x < pw && g[y * pw + x] === 0) byte |= 0x80 >> bit
            }
            row += byte.toString(16).padStart(2, '0').toUpperCase()
          }
          hexRows.push(row)
        }
        // 프리뷰 픽셀 되쓰기(이진화 결과 그대로)
        for (let i = 0; i < pw * ph; i++) {
          const j = i * 4
          const v = g[i]
          d[j] = d[j + 1] = d[j + 2] = v
          d[j + 3] = 255
        }
        ctx.putImageData(idata, 0, 0)
        resolve({ src: c.toDataURL('image/png'), hex: hexRows.join(''), rowBytes, rows: ph })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = orig
  })
}

// ^GFA 헥스 → 1비트 PNG data URL(가져오기 시 캔버스 프리뷰 복원). 실패 시 null.
export function gfaHexToDataUrl(hex: string, rowBytes: number, rows: number): string | null {
  try {
    if (typeof document === 'undefined' || rowBytes < 1 || rows < 1) return null
    const clean = hex.replace(/[^0-9A-Fa-f]/g, '')
    const w = rowBytes * 8
    const c = document.createElement('canvas')
    c.width = w
    c.height = rows
    const ctx = c.getContext('2d')
    if (!ctx) return null
    const idata = ctx.createImageData(w, rows)
    const d = idata.data
    for (let y = 0; y < rows; y++) {
      for (let bx = 0; bx < rowBytes; bx++) {
        const hi = (y * rowBytes + bx) * 2
        const byte = parseInt(clean.slice(hi, hi + 2) || '00', 16)
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          const black = (byte & (0x80 >> bit)) !== 0
          const j = (y * w + x) * 4
          const v = black ? 0 : 255
          d[j] = d[j + 1] = d[j + 2] = v
          d[j + 3] = 255
        }
      }
    }
    ctx.putImageData(idata, 0, 0)
    return c.toDataURL('image/png')
  } catch {
    return null
  }
}
