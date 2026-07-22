// Key Generator 타입 — 키 종류 스펙 · 옵션 컨트롤 · 생성 결과.
// enum 대신 문자열 리터럴 유니온 사용(erasableSyntaxOnly 준수).

export type OptionType = 'select' | 'number' | 'text'

export interface OptionChoice {
  value: string
  label: string // 기술 상수(HS256·P-256 등)는 언어 중립 → 그대로 표시
}

export interface OptionSpec {
  key: string
  type: OptionType
  labelKey: string // i18n 키(필드 라벨)
  def: string // 기본값(number도 문자열로 보관)
  choices?: OptionChoice[] // select 전용
  min?: number
  max?: number
  step?: number
  monospace?: boolean // text 입력 모노폰트 여부
}

export interface KeyOutput {
  labelKey: string // '' 이면 라벨 없음(단일 출력)
  value: string
}

export interface GenResult {
  outputs: KeyOutput[]
  meta: string // 예: 'RSA 2048-bit · PKCS#8 PEM'
}

export interface KeyKind {
  id: string
  group: string // 그룹 i18n 키
  nameKey: string
  descKey: string
  options: OptionSpec[]
  generate: (opts: Record<string, string>) => Promise<GenResult>
}

export interface KeyGroup {
  id: string // i18n 키
  kinds: KeyKind[]
}
