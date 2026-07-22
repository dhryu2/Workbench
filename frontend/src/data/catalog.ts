// 도구 카탈로그 — 카테고리 4개 · 도구 5개.
// 전용 상세 화면이 구현된 도구만 등록한다(registry.ts의 TOOL_COMPONENTS와 1:1 대응).
// 이름/설명은 언어별 맵으로 보관해 UI 언어에 따라 해석한다(README: 언어별 맵 방식).
import type { IconKey } from '../lib/icons'

export type Lang = 'ko' | 'en'

// 언어별 문자열 맵
export type LocalizedText = Record<Lang, string>

export interface Category {
  id: string
  name: LocalizedText
}

export interface Tool {
  id: string
  cat: string // Category.id 참조
  icon: IconKey
  name: LocalizedText
  desc: LocalizedText
}

export const CATEGORIES: Category[] = [
  { id: 'barcode', name: { ko: '바코드 & 라벨', en: 'Barcode & Labels' } },
  { id: 'text', name: { ko: '텍스트 & 포맷', en: 'Text & Format' } },
  { id: 'convert', name: { ko: '변환 & 인코딩', en: 'Convert & Encode' } },
  { id: 'security', name: { ko: '보안 & 키', en: 'Security & Keys' } },
]

export const TOOLS: Tool[] = [
  {
    id: 'qr-generator',
    cat: 'barcode',
    icon: 'qr',
    name: { ko: 'QR 코드 생성기', en: 'QR Code Generator' },
    desc: {
      ko: '한 화면에 여러 QR 동시 출력 (PDA 스캔 테스트용)',
      en: 'Render many QR codes at once for PDA scan testing',
    },
  },
  {
    id: 'zpl-editor',
    cat: 'barcode',
    icon: 'tag',
    name: { ko: 'ZPL 에디터', en: 'ZPL Editor' },
    desc: {
      ko: 'GUI로 라벨 구성 후 ZPL 코드 생성',
      en: 'Compose labels in a GUI, then generate ZPL',
    },
  },
  {
    id: 'text-diff',
    cat: 'text',
    icon: 'diff',
    name: { ko: '텍스트 비교', en: 'Text Diff' },
    desc: { ko: '두 텍스트의 차이 확인', en: 'Compare two blocks of text' },
  },
  {
    id: 'base64',
    cat: 'convert',
    icon: 'binary',
    name: { ko: 'Base64 인코더', en: 'Base64 Encoder' },
    desc: { ko: '문자열 · 파일 인코딩/디코딩', en: 'Encode and decode strings and files' },
  },
  {
    id: 'key-generator',
    cat: 'security',
    icon: 'key',
    name: { ko: '키 생성기', en: 'Key Generator' },
    desc: {
      ko: 'JWT · UUID · SSH/RSA 등 랜덤 키·시크릿 생성 (브라우저 로컬)',
      en: 'Generate random keys and secrets — JWT, UUID, SSH/RSA and more',
    },
  },
]

// ── 조회 헬퍼 ──
export const toolById = (id: string): Tool | undefined => TOOLS.find((t) => t.id === id)
export const categoryById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id)
export const categoryName = (catId: string, lang: Lang): string =>
  categoryById(catId)?.name[lang] ?? ''
