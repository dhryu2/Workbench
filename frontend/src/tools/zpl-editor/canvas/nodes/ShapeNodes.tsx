// 도형 노드(box/ellipse/circle/line/diagonal) — ^GB/^GE/^GC/^GD 를 잉크 고정색으로 재현.
// 테두리 두께는 ZPL 처럼 도형 안쪽으로 자라며, 최소 1 화면픽셀은 보이게 한다(v1 동일).
import { Circle, Ellipse, Line, Rect } from 'react-konva'
import { norm } from '../../geometry'
import { INK } from '../theme'
import type { BoxElement, CircleElement, DiagonalElement, EllipseElement, LineElement } from '../../types'

type ShapeElement = BoxElement | EllipseElement | CircleElement | LineElement | DiagonalElement

export function ShapeNode({ el, zoom }: { el: ShapeElement; zoom: number }) {
  const minT = 1 / zoom
  const composite = el.reverse ? 'xor' : 'source-over'
  switch (el.type) {
    case 'box': {
      const t = Math.min(Math.max(el.t, minT), el.w / 2, el.h / 2)
      // ^GB 라운딩(0~8): 외곽 반경 = round/8 × min(w,h)/2 (Labelary 실측) — 패스는 t/2 안쪽이므로 t/2 차감
      const outerR = el.round ? (el.round / 8) * (Math.min(el.w, el.h) / 2) : 0
      return <Rect x={t / 2} y={t / 2} width={el.w - t} height={el.h - t} cornerRadius={Math.max(0, outerR - t / 2)} stroke={INK} strokeWidth={t} globalCompositeOperation={composite} listening={false} />
    }
    case 'ellipse': {
      const t = Math.min(Math.max(el.t, minT), el.w / 2, el.h / 2)
      return (
        <Ellipse
          x={el.w / 2}
          y={el.h / 2}
          radiusX={(el.w - t) / 2}
          radiusY={(el.h - t) / 2}
          stroke={INK}
          strokeWidth={t}
          globalCompositeOperation={composite}
          listening={false}
        />
      )
    }
    case 'circle': {
      const t = Math.min(Math.max(el.t, minT), el.d / 2)
      return <Circle x={el.d / 2} y={el.d / 2} radius={(el.d - t) / 2} stroke={INK} strokeWidth={t} globalCompositeOperation={composite} listening={false} />
    }
    case 'line': {
      const n = norm(el)
      return <Rect width={n.w} height={n.h} fill={INK} globalCompositeOperation={composite} listening={false} />
    }
    case 'diagonal':
      return (
        <Line
          points={el.dir === 'R' ? [0, el.h, el.w, 0] : [0, 0, el.w, el.h]}
          stroke={INK}
          strokeWidth={Math.max(el.t, minT)}
          globalCompositeOperation={composite}
          listening={false}
        />
      )
    default: {
      const _never: never = el
      return _never
    }
  }
}
