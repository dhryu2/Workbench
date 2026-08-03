// react-i18next 초기화. 셸 UI 문자열은 여기 리소스로, 도구/카테고리 데이터는 catalog.ts로 분리.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang } from '../data/catalog'
import { ko } from './locales/ko'
import { en } from './locales/en'

const LANG_KEY = 'wb_lang'

// 브라우저 언어 선호 목록에서 첫 판정: 한국어면 'ko', 그 외 모든 언어는 'en'.
function detectLang(): Lang {
  const prefs =
    typeof navigator === 'undefined'
      ? []
      : navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : []

  // 'ko', 'ko-KR' 등 한국어 태그만 ko로 취급(하위 태그 경계까지 확인해 'kok' 등 오탐 방지).
  for (const tag of prefs) {
    const lower = tag.toLowerCase()
    if (lower === 'ko' || lower.startsWith('ko-')) return 'ko'
  }
  return 'en'
}

// 저장된 언어(사용자가 직접 토글한 값) 우선, 없으면 브라우저 언어로 판정.
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ko' || saved === 'en') return saved
  } catch {
    // localStorage 접근 불가 시 브라우저 언어 판정으로 폴백
  }
  return detectLang()
}

// <html lang>을 현재 UI 언어와 동기화(스크린리더·브라우저 번역 힌트).
function syncDocumentLang(lang: Lang): void {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

void i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
  },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React가 XSS를 방어하므로 이스케이프 불필요
})

syncDocumentLang(i18n.language === 'en' ? 'en' : 'ko')

// 현재 UI 언어를 Lang 타입으로 반환(카탈로그 언어별 맵 조회에 사용).
export function currentLang(): Lang {
  return i18n.language === 'en' ? 'en' : 'ko'
}

// ko ↔ en 토글 + localStorage 저장.
export function toggleLang(): void {
  const next: Lang = currentLang() === 'ko' ? 'en' : 'ko'
  void i18n.changeLanguage(next)
  syncDocumentLang(next)
  try {
    localStorage.setItem(LANG_KEY, next)
  } catch {
    // 저장 실패는 무시(런타임 언어 전환은 계속 동작)
  }
}

export default i18n
