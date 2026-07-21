// react-i18next 초기화. 셸 UI 문자열은 여기 리소스로, 도구/카테고리 데이터는 catalog.ts로 분리.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang } from '../data/catalog'
import { ko } from './locales/ko'
import { en } from './locales/en'

const LANG_KEY = 'wb_lang'

// 저장된 언어 우선, 없으면 프로토타입 기본값 'ko'.
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ko' || saved === 'en') return saved
  } catch {
    // localStorage 접근 불가 시 기본값 사용
  }
  return 'ko'
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

// 현재 UI 언어를 Lang 타입으로 반환(카탈로그 언어별 맵 조회에 사용).
export function currentLang(): Lang {
  return i18n.language === 'en' ? 'en' : 'ko'
}

// ko ↔ en 토글 + localStorage 저장.
export function toggleLang(): void {
  const next: Lang = currentLang() === 'ko' ? 'en' : 'ko'
  void i18n.changeLanguage(next)
  try {
    localStorage.setItem(LANG_KEY, next)
  } catch {
    // 저장 실패는 무시(런타임 언어 전환은 계속 동작)
  }
}

export default i18n
