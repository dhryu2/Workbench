// 1D 바코드 노드 — barcode-encode 의 실제 바 지오메트리를 bcWidth×h 박스로 스케일해 그린다.
import { useMemo } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { encodeBarcode } from '../../barcode-encode'
import { norm } from '../../geometry'
import { INK, PAPER, cssVar } from '../theme'
import type { BarcodeElement, BarcodeType } from '../../types'

// 바 줄무늬만 그리는 재사용 조각(요소 본체 + 표 셀 바코드 공용).
export function BarsShape({
  x = 0,
  y = 0,
  bcType,
  data,
  w,
  h,
}: {
  x?: number
  y?: number
  bcType: BarcodeType
  data: string
  w: number
  h: number
}) {
  const { bars, total } = useMemo(() => encodeBarcode(bcType, data), [bcType, data])
  const t = total || 1
  return (
    <Group x={x} y={y} listening={false}>
      <Rect width={w} height={h} fill={PAPER} />
      {bars.map((b, i) => (
        <Rect key={i} x={(b.x / t) * w} width={(b.w / t) * w} height={h} fill={INK} />
      ))}
    </Group>
  )
}

export function BarcodeNode({ el, zoom }: { el: BarcodeElement; zoom: number }) {
  const W = norm(el).w
  // HRI 는 v1 과 동일한 화면 크기(15dot 상당, 최소 7 화면픽셀)를 dot 공간으로 환산해 유지.
  const hriFont = Math.max(7 / zoom, 15)
  const hriH = el.hri ? hriFont * 1.2 + 2 : 0
  const barsH = Math.max(1, el.h - hriH)
  return (
    <>
      <Rect width={W} height={el.h} fill={PAPER} listening={false} />
      <BarsShape bcType={el.bcType} data={el.data} w={W} h={barsH} />
      {el.hri && (
        <Text
          y={barsH + 2}
          width={W}
          text={el.data}
          align="center"
          fontFamily={cssVar('--wb-font-mono', 'monospace')}
          fontSize={hriFont}
          letterSpacing={2}
          fill={INK}
          listening={false}
        />
      )}
    </>
  )
}
