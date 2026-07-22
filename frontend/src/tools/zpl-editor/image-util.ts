// 이미지 유틸 — 캔버스(DOM) 기반. 엔진(순수 모듈)과 분리한 UI 전용 헬퍼다.
// support.js `_makeEmblem`/`_raster` 를 그대로 옮겼다(그레이스케일 → 임계값 이진화 → 선택적 Floyd–Steinberg 디더).

// "WB" 엠블럼 PNG data URL 생성 — 시드/신규 이미지·셀 이미지의 기본 비주얼.
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

// 원본 data URL 을 w×h·threshold·dither 로 1-bit 흑백 래스터화한 PNG data URL 을 반환한다(미리보기용).
// 실패 시 null. (실제 ZPL 출력엔 비트맵 대신 플레이스홀더 ^GFA 주석이 나감 — zpl-generate.ts)
export function rasterize1bit(
  orig: string | undefined,
  w: number,
  h: number,
  threshold: number,
  dither: boolean,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!orig || typeof document === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => {
      try {
        // 표시 크기가 작아도 최소한의 해상도를 확보하기 위한 업스케일(최대 3배)
        const sc = Math.min(3, Math.max(1, Math.floor(360 / Math.max(w, h, 1))))
        const pw = Math.max(1, Math.round(w * sc))
        const ph = Math.max(1, Math.round(h * sc))
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
        for (let i = 0; i < pw * ph; i++) {
          const j = i * 4
          const v = g[i]
          d[j] = d[j + 1] = d[j + 2] = v
          d[j + 3] = 255
        }
        ctx.putImageData(idata, 0, 0)
        resolve(c.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = orig
  })
}
