// 텍스트 노드 — 글꼴 A는 내장 알파 아틀라스를, 나머지는 Konva Text 근사를 사용한다.
import { useMemo } from 'react'
import { Group, Image as KonvaImage, Text } from 'react-konva'
import { norm } from '../../geometry'
import { fontAAlphaGrid, fontAMag } from '../font-a'
import { INK } from '../theme'
import { labelFontFamily, labelFontScaleX, labelLineHeight, labelTextOffsetY } from '../fonts'
import type { TextElement } from '../../types'

export function TextNode({ el }: { el: TextElement }) {
  const { w, h } = norm(el)
  const mag = fontAMag(el.font, el.fontW)
  const alphaGrid = useMemo(
    () => fontAAlphaGrid(
      el.text,
      mag.v,
      mag.hz,
      el.block === false ? undefined : { w: el.w, align: el.align, maxLines: el.maxLines, gap: el.lineGap },
    ),
    [el.align, el.block, el.lineGap, el.maxLines, el.text, el.w, mag.hz, mag.v],
  )
  const alphaImage = useMemo(() => {
    if (el.face !== 'A' || alphaGrid.w === 0 || alphaGrid.h === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = alphaGrid.w
    canvas.height = alphaGrid.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const image = ctx.createImageData(alphaGrid.w, alphaGrid.h)
    const rgb = parseInt(INK.slice(1).split('').map((digit) => digit + digit).join(''), 16)
    for (let i = 0; i < alphaGrid.alpha.length; i++) {
      image.data[i * 4] = rgb >> 16
      image.data[i * 4 + 1] = (rgb >> 8) & 0xff
      image.data[i * 4 + 2] = rgb & 0xff
      image.data[i * 4 + 3] = alphaGrid.alpha[i]
    }
    ctx.putImageData(image, 0, 0)
    return canvas
  }, [alphaGrid, el.face])
  if (el.face === 'A') {
    if (!alphaImage) return null
    return <KonvaImage
      x={alphaGrid.x0}
      y={alphaGrid.y0}
      image={alphaImage}
      imageSmoothingEnabled={false}
      globalCompositeOperation={el.reverse ? 'xor' : 'source-over'}
      listening={false}
    />
  }
  const sx = labelFontScaleX(el.face, el.font, el.fontW)
  const align = el.align === 'C' ? 'center' : el.align === 'R' ? 'right' : el.align === 'J' ? 'justify' : 'left'
  const lh = labelLineHeight(el.font, el.lineGap ?? 0)
  // Labelary ^FB 중앙정렬은 트레일링 스페이스 1개를 포함해 센터링 → 정확 중앙보다 0.1625×h 왼쪽(실측)
  const phantomC = el.block !== false && el.align === 'C' ? 0.1625 * el.font : 0
  const text = (
    <Text
      text={el.text}
      width={el.block === false ? undefined : sx > 0 ? w / sx : w}
      scaleX={sx}
      offsetX={phantomC}
      offsetY={labelTextOffsetY(el.font, lh, el.face)}
      fontFamily={labelFontFamily(el.face)}
      fontStyle="bold"
      fontSize={el.font}
      lineHeight={lh}
      align={align}
      wrap={el.block === false ? 'none' : 'word'}
      fill={INK}
      globalCompositeOperation={el.reverse ? 'xor' : 'source-over'}
      listening={false}
    />
  )
  if (el.block === false) return text
  return <Group clipX={0} clipY={0} clipWidth={w} clipHeight={h} listening={false}>{text}</Group>
}
