// 블루프린트 프레임 — 사각 헤어라인 박스 + 네 모서리 "+" 등록 마크. Industry 미학의 핵심 래퍼.
import type { HTMLAttributes, ReactNode, Ref } from 'react'

interface BlueprintProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  className?: string
  // React 19에서 ref는 함수 컴포넌트의 일반 prop — forwardRef 없이 그대로 내려보낸다.
  ref?: Ref<HTMLDivElement>
}

export function Blueprint({ children, className, ref, ...rest }: BlueprintProps) {
  return (
    <div ref={ref} className={className ? `wb-blueprint ${className}` : 'wb-blueprint'} {...rest}>
      <i className="wb-corner tl" />
      <i className="wb-corner tr" />
      <i className="wb-corner bl" />
      <i className="wb-corner br" />
      {children}
    </div>
  )
}
