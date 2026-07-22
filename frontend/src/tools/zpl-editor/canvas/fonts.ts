// 캔버스 라벨 전용 폰트(§6.1) — 앱 UI(Barlow)와 분리된, ^A0 프린터 폰트의 근사.
//
// ^A0 = CG Triumvirate Bold Condensed(헬베티카 계열 컨덴스드 그로테스크).
// 후보(Roboto Condensed Bold / Archivo Narrow Bold / Liberation Sans Narrow / Fjalla One) 중
// 힌팅·가용성·계열 일치가 가장 좋은 **Roboto Condensed Bold(700)** 채택(플랜 기본 권고안).
// 한글은 컨덴스드 Noto 가 없어 **Noto Sans KR 700** + scaleX(fontW/font) 장평 보정(§6.2)으로 맞춘다.
import '@fontsource/roboto-condensed/700.css'
import '@fontsource/noto-sans-kr/700.css'

export const LABEL_FONT = "'Roboto Condensed', 'Noto Sans KR', sans-serif"

// ^FB 줄간격(§6.4) — 핸드오프 기준 1.18 에서 시작(Labelary 대조 튜닝 지점).
export const LABEL_LINE_HEIGHT = 1.18

// Konva 는 폰트 지연 로드 시 자동 재그리기를 하지 않는다(§6.1) —
// 첫 Stage draw 전에 로드를 await 하고, 완료 시점에 레이어를 다시 그려야 한다.
let ready = false
let pending: Promise<void> | null = null

export function labelFontsReady(): boolean {
  return ready
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
    } catch {
      // 로드 실패 시 sans-serif 폴백으로 진행(렌더는 계속되어야 한다)
    }
    ready = true
  })()
  return pending
}
