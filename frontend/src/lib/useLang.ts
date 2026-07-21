// 현재 UI 언어를 Lang 타입으로 반환하는 훅. useTranslation을 구독하므로 언어 전환 시 리렌더된다.
import { useTranslation } from 'react-i18next'
import type { Lang } from '../data/catalog'

export function useLang(): Lang {
  const { i18n } = useTranslation()
  return i18n.language === 'en' ? 'en' : 'ko'
}
