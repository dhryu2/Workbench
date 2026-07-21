// QR 인코딩 — 스캔 안정성 최우선 규칙을 정확히 지킨다(README "QR 인코딩 규칙").
// 입력 텍스트는 절대 변형하지 않는다: URL 접두어/정규화/재인코딩 없이 바이트 그대로 인코딩.
import qrcode from 'qrcode-generator'

// quiet zone = 4 모듈(사방 여백). QR 사양 최소치이며 절대 줄이지 않는다.
const QUIET = 4
// 목표 변(px) — 모듈당 정수 픽셀 스케일을 뽑아 경계 번짐 없이 선명하게 렌더한다.
const TARGET_PX = 600

// 입력 문자열을 순수 흑백 PNG data URL로 인코딩한다. 실패 시 예외를 던진다(호출부에서 에러 UI 처리).
export function encodeQrToDataUrl(text: string): string {
  // 멀티바이트(한글 등) 안전: 입력을 표준 TextEncoder로 UTF-8 바이트로 인코딩한다.
  // qrcode-generator의 ESM 빌드에는 stringToBytesFuncs['UTF-8']가 없고 기본 구현이
  // Latin1 절단(charCodeAt & 0xff)이라 한글이 깨진다. qr8BitByte가 addData 시점에
  // qrcode.stringToBytes를 동적으로 읽으므로, addData 전에 UTF-8 함수로 교체한다.
  qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s))

  // type 0 = 데이터 길이에 맞춰 버전 자동 결정, ECC 레벨 'M'(고정)
  const qr = qrcode(0, 'M')
  qr.addData(text, 'Byte') // Byte 모드 — 임의 문자열 그대로
  qr.make()

  const n = qr.getModuleCount()
  const total = n + QUIET * 2
  const scale = Math.max(2, Math.floor(TARGET_PX / total)) // 모듈당 정수 px
  const px = total * scale

  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  // 흰 배경(#ffffff)은 quiet zone 대비를 위해 필수
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, px, px)
  // 어두운 모듈만 순수 검정(#000000) 사각형으로. quiet 오프셋으로 사방 여백 확보
  ctx.fillStyle = '#000000'
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale)
      }
    }
  }

  return canvas.toDataURL('image/png')
}
