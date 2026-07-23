// 텍스트 노드 — ^A0{rot},{h},{w} + ^FB 의미를 Konva Text 로 재현(§6.2/§6.4).
// fontSize = font(dot), 장평은 scaleX = fontW/font. ^FB 블록 폭은 장평과 무관하게 el.w 이므로
// 레이아웃 폭을 scaleX 로 나눠 보정한다. 높이는 textH(el) 로 클립(v1 overflow hidden 과 동일).
// offsetY: Konva 의 middle 앵커 기반 배치를 ZPL 베이스라인(y+0.75h)에 정렬(fonts.labelTextOffsetY).
import { Group, Text } from 'react-konva'
import { norm } from '../../geometry'
import { INK } from '../theme'
import { LABEL_FONT, LABEL_LINE_HEIGHT, labelTextOffsetY } from '../fonts'
import type { TextElement } from '../../types'

export function TextNode({ el }: { el: TextElement }) {
  const { w, h } = norm(el)
  const sx = el.font > 0 ? (el.fontW || el.font) / el.font : 1
  const align = el.align === 'C' ? 'center' : el.align === 'R' ? 'right' : el.align === 'J' ? 'justify' : 'left'
  return (
    <Group clipX={0} clipY={0} clipWidth={w} clipHeight={h} listening={false}>
      <Text
        text={el.text}
        width={sx > 0 ? w / sx : w}
        scaleX={sx}
        offsetY={labelTextOffsetY(el.font, LABEL_LINE_HEIGHT)}
        fontFamily={LABEL_FONT}
        fontStyle="bold"
        fontSize={el.font}
        lineHeight={LABEL_LINE_HEIGHT}
        align={align}
        wrap="word"
        fill={INK}
      />
    </Group>
  )
}
