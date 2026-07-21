// 블루프린트 프레임 — 사각 헤어라인 박스 + 네 모서리 "+" 등록 마크. Industry 미학의 핵심 래퍼.
import type { HTMLAttributes, ReactNode } from 'react'

interface BlueprintProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  className?: string
}

export function Blueprint({ children, className, ...rest }: BlueprintProps) {
  return (
    <div className={className ? `wb-blueprint ${className}` : 'wb-blueprint'} {...rest}>
      <i className="wb-corner tl" />
      <i className="wb-corner tr" />
      <i className="wb-corner bl" />
      <i className="wb-corner br" />
      {children}
    </div>
  )
}
