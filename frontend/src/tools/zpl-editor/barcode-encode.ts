// 캔버스 비주얼 전용 1D 바코드 모듈 인코더. ZPL 출력과는 무관하며(ZPL 은 zpl-generate 가 담당),
// 캔버스에 "실제에 가까운" 줄무늬를 그리기 위한 순수 수식이다. DOM/의존성 없음, 절대 throw 하지 않는다.
//
// 반환: bars 는 검은 막대 사각형 목록{x,w}(흰 여백은 암묵적), total 은 0..total 단위 폭 공간.
import type { BarcodeType } from './types'

export interface Bar {
  x: number
  w: number
}
export interface BarcodeBars {
  bars: Bar[]
  total: number
}

// ── Code 128 (code set B) ──────────────────────────────────────────────
// 값 0..106 의 표준 폭 패턴(각 6모듈, 인덱스 106 Stop 만 7모듈). 짝수 인덱스=막대, 홀수=공백.
const C128: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]
const START_B = 104
const STOP = 106
const QUIET = 10

// 패턴 문자열 배열 → 막대 목록. 앞뒤 quiet zone 포함.
function patternsToBars(patterns: string[]): BarcodeBars {
  const bars: Bar[] = []
  let x = QUIET
  for (const pat of patterns) {
    for (let i = 0; i < pat.length; i++) {
      const wdt = pat.charCodeAt(i) - 48
      if (i % 2 === 0) bars.push({ x, w: wdt }) // 짝수 인덱스 = 막대
      x += wdt
    }
  }
  return { bars, total: x + QUIET }
}

function code128(data: string): BarcodeBars {
  // code set B: ASCII 32..127 → 값 0..95. 범위 밖 문자는 공백(0)으로 대체(never throw).
  const vals: number[] = []
  for (const ch of data) {
    const v = ch.charCodeAt(0) - 32
    vals.push(v >= 0 && v <= 95 ? v : 0)
  }
  let sum = START_B
  vals.forEach((v, i) => {
    sum += v * (i + 1)
  })
  const checksum = sum % 103
  const seq = [START_B, ...vals, checksum, STOP]
  return patternsToBars(seq.map((v) => C128[v]))
}

// ── Code 39 (양끝 `*` 가드) ─────────────────────────────────────────────
// 각 문자: 9요소(막대/공백 교차, 막대로 시작). n=narrow(1), w=wide(3).
const C39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
}

function code39(data: string): BarcodeBars {
  const inner = [...String(data).toUpperCase()].filter((c) => c in C39 && c !== '*')
  const chars = ['*', ...inner, '*']
  const bars: Bar[] = []
  let x = QUIET
  chars.forEach((c, ci) => {
    const pat = C39[c]
    for (let i = 0; i < pat.length; i++) {
      const wdt = pat[i] === 'w' ? 3 : 1
      if (i % 2 === 0) bars.push({ x, w: wdt }) // 짝수 인덱스 = 막대
      x += wdt
    }
    if (ci < chars.length - 1) x += 1 // 문자 사이 narrow 공백
  })
  return { bars, total: x + QUIET }
}

// ── EAN-13 / UPC-A ─────────────────────────────────────────────────────
// L/G/R 인코딩(7모듈, 1=막대). 좌군은 첫 자리 패리티로 L/G 혼합, 우군은 R.
const L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
]
const G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
]
const R = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
]
// 첫 자리 → 좌군 6자리 패리티(L=홀수, G=짝수)
const EAN_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
]

// 숫자만 추출해 n자리로 맞춘다(부족하면 0패딩, 넘치면 절단). never throw.
function digits(data: string, n: number): number[] {
  const only = String(data).replace(/\D/g, '').padEnd(n, '0').slice(0, n)
  return [...only].map((c) => c.charCodeAt(0) - 48)
}

// 비트열(0/1, 각 1모듈) → 막대 목록. 연속된 1을 하나의 막대로 묶는다.
function bitsToBars(bits: string, quietL: number, quietR: number): BarcodeBars {
  const bars: Bar[] = []
  let x = quietL
  let i = 0
  while (i < bits.length) {
    if (bits[i] === '1') {
      let w = 0
      while (i < bits.length && bits[i] === '1') {
        w++
        i++
      }
      bars.push({ x, w })
      x += w
    } else {
      x++
      i++
    }
  }
  return { bars, total: x + quietR }
}

function ean13(data: string): BarcodeBars {
  const d = digits(data, 13)
  const parity = EAN_PARITY[d[0]]
  let bits = '101' // 시작 가드
  for (let i = 0; i < 6; i++) bits += parity[i] === 'L' ? L[d[i + 1]] : G[d[i + 1]]
  bits += '01010' // 센터 가드
  for (let i = 7; i < 13; i++) bits += R[d[i]]
  bits += '101' // 종료 가드
  return bitsToBars(bits, 11, 7)
}

function upca(data: string): BarcodeBars {
  const d = digits(data, 12)
  let bits = '101' // 시작 가드
  for (let i = 0; i < 6; i++) bits += L[d[i]]
  bits += '01010' // 센터 가드
  for (let i = 6; i < 12; i++) bits += R[d[i]]
  bits += '101' // 종료 가드
  return bitsToBars(bits, 9, 9)
}

// 심볼로지 실패/미지원 시 결정적 폴백 패턴(문자 코드 기반). 절대 throw 하지 않기 위한 안전망.
function fallbackBars(data: string): BarcodeBars {
  const bars: Bar[] = []
  let x = QUIET
  const s = data || '0'
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    for (let k = 0; k < 4; k++) {
      const w = ((code >> (k * 2)) & 3) + 1
      bars.push({ x, w })
      x += w + 1 // 막대 + narrow 공백
    }
  }
  return { bars, total: x + QUIET }
}

// 공개 진입점: 심볼로지별 인코딩. 입력이 부적합해도 폴백으로 항상 결과를 낸다.
export function encodeBarcode(bcType: BarcodeType, data: string): BarcodeBars {
  const s = String(data ?? '')
  try {
    switch (bcType) {
      case 'code39':
        return code39(s)
      case 'ean13':
        return ean13(s)
      case 'upca':
        return upca(s)
      case 'code128':
      default:
        return code128(s)
    }
  } catch {
    return fallbackBars(s)
  }
}
