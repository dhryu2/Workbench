// 이미지 노드 — 1비트 래스터 결과(src)를 픽셀 보간 없이 그린다. src 없으면 v1 과 같은
// 대각 줄무늬 플레이스홀더 + "이미지" 라벨(라벨 문자열은 DOM 쪽에서 번역해 prop 으로 받는다).
import { Image as KonvaImage, Shape, Text } from 'react-konva'
import { useHtmlImage } from '../use-html-image'
import { cssVar } from '../theme'
import type { ImageElement } from '../../types'

export function ImageNode({ el, zoom, placeholderLabel }: { el: ImageElement; zoom: number; placeholderLabel: string }) {
  const img = useHtmlImage(el.src)
  if (img) {
    return <KonvaImage image={img} width={el.w} height={el.h} imageSmoothingEnabled={false} listening={false} />
  }
  const w = el.w
  const h = el.h
  return (
    <>
      <Shape
        listening={false}
        sceneFunc={(ctx) => {
          ctx.save()
          ctx.beginPath()
          ctx.rect(0, 0, w, h)
          ctx.clip()
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, w, h)
          ctx.strokeStyle = '#eee'
          ctx.lineWidth = 4
          ctx.beginPath()
          for (let s = -h; s < w + h; s += 8) {
            ctx.moveTo(s, 0)
            ctx.lineTo(s + h, h)
          }
          ctx.stroke()
          ctx.restore()
        }}
      />
      <Text
        width={w}
        height={h}
        text={placeholderLabel}
        align="center"
        verticalAlign="middle"
        fontFamily={cssVar('--wb-font-body', 'sans-serif')}
        fontSize={Math.max(8 / zoom, 12)}
        fill="#888"
        listening={false}
      />
    </>
  )
}
