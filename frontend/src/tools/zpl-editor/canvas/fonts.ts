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

// ^FB 줄 피치(Labelary 실측) = 글꼴높이 + gap(^FB 3번째 파라미터) — 1.18 배수 아님.
// Konva lineHeight 배수는 요소별로 (font + lineGap) / font 로 계산한다(TextNode).
export function labelLineHeight(fontSize: number, lineGap: number): number {
  return fontSize > 0 ? (fontSize + lineGap) / fontSize : 1
}

// Konva 는 폰트 지연 로드 시 자동 재그리기를 하지 않는다(§6.1) —
// 첫 Stage draw 전에 로드를 await 하고, 완료 시점에 레이어를 다시 그려야 한다.
let ready = false
let pending: Promise<void> | null = null

// Konva 10+(legacyTextRendering=false)는 textBaseline='alphabetic'으로, 줄 앵커(lineHeight/2)에서
// measureSize('M')의 (fontBoundingBoxAscent-Descent)/2 만큼 내린 곳에 베이스라인을 놓는다 —
// 그 앵커→베이스라인 거리(em 비율)를 같은 API로 실측해 보관한다(브라우저/폰트 무관 보정).
const anchorToBaseline: Partial<Record<FontFace, number>> = { '0': 0.34, A: 0.34 }
// 캔버스 폰트의 캡 높이(em 비율) — 베이스라인을 y+cap×h 에 두면 캡 상단이 정확히 FO y 에 온다.
const capToBaseline: Partial<Record<FontFace, number>> = { '0': 0.71, A: 7 / 9 }

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

// Konva Text 가 그린 글리프의 베이스라인을 캡 상단 = FO y(ZPL ^A0 의 Labelary 실측 배치)가
// 되도록 옮기는 offsetY. Konva 배치식(lineHeight/2 + 앵커거리)을 빼고 cap×h 를 더한 값.
export function labelTextOffsetY(fontSize: number, lineHeight: number, face: FontFace = '0'): number {
  return (lineHeight / 2 + (anchorToBaseline[face] ?? anchorToBaseline['0'] ?? 0.34) - (capToBaseline[face] ?? capToBaseline['0'] ?? 0.71)) * fontSize
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
        for (const face of ['0'] as const) {
          x.font = "700 100px 'Roboto Condensed', sans-serif"
          x.textBaseline = 'alphabetic'
          const cap = x.measureText('H').actualBoundingBoxAscent / 100
          // Konva measureSize('M')와 동일한 메트릭(fontBoundingBox, 없으면 actual 폴백)으로 앵커 거리 실측
          const m = x.measureText('M')
          const anchor = ((m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent)
            - (m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent)) / 200
          if (Number.isFinite(anchor) && anchor > 0.1 && anchor < 0.6) anchorToBaseline[face] = anchor
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
