// 아이콘 매핑 — Lucide(lucide-react), stroke-width 1.5(얇은 테크니컬 스트로크).
// 도구 카탈로그는 IconKey 문자열로 아이콘을 참조하고, 여기서 Lucide 컴포넌트로 해석한다.
import {
  Binary,
  GitCompare,
  KeyRound,
  QrCode,
  Tag,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

// 카탈로그에서 쓰는 도구 아이콘 키
export type IconKey = 'qr' | 'tag' | 'diff' | 'binary' | 'key'

const TOOL_ICONS: Record<IconKey, LucideIcon> = {
  qr: QrCode,
  tag: Tag,
  diff: GitCompare, // git-compare = diff
  binary: Binary,
  key: KeyRound,
}

// stroke-width 1.5를 강제하는 공용 래퍼. size 기본 20.
export function Icon({
  icon: Cmp,
  size = 20,
  strokeWidth = 1.5,
  ...rest
}: { icon: LucideIcon } & LucideProps) {
  return <Cmp size={size} strokeWidth={strokeWidth} {...rest} />
}

// 카탈로그 IconKey → Lucide 아이콘
export function ToolIcon({
  name,
  size = 20,
  ...rest
}: { name: IconKey; size?: number } & Omit<LucideProps, 'ref'>) {
  return <Icon icon={TOOL_ICONS[name]} size={size} {...rest} />
}
