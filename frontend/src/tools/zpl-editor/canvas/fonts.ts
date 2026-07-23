// 캔버스 라벨 전용 폰트(§6.1) — 앱 UI(Barlow)와 분리된, ^A0 프린터 폰트의 근사.
//
// ^A0 = CG Triumvirate Bold Condensed(헬베티카 계열 컨덴스드 그로테스크).
// 후보(Roboto Condensed Bold / Archivo Narrow Bold / Liberation Sans Narrow / Fjalla One) 중
// 힌팅·가용성·계열 일치가 가장 좋은 **Roboto Condensed Bold(700)** 채택(플랜 기본 권고안).
// 한글은 컨덴스드 Noto 가 없어 **Noto Sans KR 700** + scaleX(fontW/font) 장평 보정(§6.2)으로 맞춘다.
import '@fontsource/roboto-condensed/700.css'
import '@fontsource/noto-sans-kr/700.css'
import type { FontFace } from '../types'

export const LABEL_FONT = "'Roboto Condensed', 'Noto Sans KR', sans-serif"
const LABEL_FONT_A = "monospace"

// ^FB 줄간격(§6.4) — 핸드오프 기준 1.18 에서 시작(Labelary 대조 튜닝 지점).
export const LABEL_LINE_HEIGHT = 1.18

// Konva 는 폰트 지연 로드 시 자동 재그리기를 하지 않는다(§6.1) —
// 첫 Stage draw 전에 로드를 await 하고, 완료 시점에 레이어를 다시 그려야 한다.
let ready = false
let pending: Promise<void> | null = null

// middle 베이스라인 앵커 → alphabetic 베이스라인 거리(em 비율). 런타임 실측(브라우저/폰트 무관 보정).
const middleToBaseline: Partial<Record<FontFace, number>> = { '0': 0.32, A: 0.32 }
const capToBaseline: Partial<Record<FontFace, number>> = { '0': 0.75, A: 7 / 9 }

export function labelFontFamily(face?: FontFace): string {
  return face === 'A' ? LABEL_FONT_A : LABEL_FONT
}

export function labelFontScaleX(face: FontFace | undefined, fontSize: number, fontWidth: number): number {
  if (fontSize <= 0) return 1
  const requested = (fontWidth || fontSize) / fontSize
  // CSS 고정폭 글꼴의 기본 셀 폭(약 0.6em)을 ZPL 글꼴 A의 5×9 셀 폭에 맞춘다.
  return face === 'A' ? requested / 0.6 : requested
}

export function labelFontsReady(): boolean {
  return ready
}

// Konva Text(내부 textBaseline='middle', 줄 앵커 = lineHeight/2)가 그린 글리프의 베이스라인을
// ZPL ^A0 와 같은 위치(y + 0.75×h — CG Triumvirate 캡 높이, Labelary 실측)로 옮기는 offsetY.
export function labelTextOffsetY(fontSize: number, lineHeight: number, face: FontFace = '0'): number {
  return (lineHeight / 2 + (middleToBaseline[face] ?? middleToBaseline['0'] ?? 0.32) - (capToBaseline[face] ?? capToBaseline['0'] ?? 0.75)) * fontSize
}

export function loadLabelFonts(): Promise<void> {
  if (pending) return pending
  pending = (async () => {
    try {
      await Promise.all([
        document.fonts.load("bold 32px 'Roboto Condensed'"),
        document.fonts.load("bold 32px 'Noto Sans KR'"),
      ])
      await document.fonts.ready
      // 베이스라인과 실제 대문자 상단을 글꼴별로 실측해 큰 글자에서도 오차가 비례 확대되지 않게 한다.
      const c = document.createElement('canvas')
      const x = c.getContext('2d')
      if (x) {
        for (const face of ['0', 'A'] as const) {
          x.font = face === 'A' ? '100px monospace' : "700 100px 'Roboto Condensed', sans-serif"
          x.textBaseline = 'alphabetic'
          const a = x.measureText('H').actualBoundingBoxAscent
          x.textBaseline = 'middle'
          const m = x.measureText('H').actualBoundingBoxAscent
          const middle = (a - m) / 100
          const cap = a / 100
          if (Number.isFinite(middle) && middle > 0 && middle < 0.6) middleToBaseline[face] = middle
          if (Number.isFinite(cap) && cap > 0.5 && cap < 1) capToBaseline[face] = cap
        }
      }
    } catch {
      // 로드/측정 실패 시 폴백으로 진행(렌더는 계속되어야 한다)
    }
    ready = true
  })()
  return pending
}
