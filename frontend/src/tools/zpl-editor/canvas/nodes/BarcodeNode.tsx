// 1D 바코드 노드 — barcode-encode 의 실제 바 지오메트리를 bcWidth×h 박스로 스케일해 그린다.
// HRI 는 ZPL/Labelary 와 동일하게 바 **아래** 영역에 그린다(파생 높이는 geometry.hriHeight).
// HRI 글리프 높이 ≈ 10×module 은 Labelary 실측 보정값.
import { useMemo } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { encodeBarcode, hriText } from '../../barcode-encode'
import { bcWidth, hriFontSize } from '../../geometry'
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

export function BarcodeNode({ el }: { el: BarcodeElement }) {
  const W = bcWidth(el)
  const hriF = hriFontSize(el)
  return (
    <>
      <Rect width={W} height={el.h + (el.hri ? hriF : 0)} fill={PAPER} listening={false} />
      <BarsShape bcType={el.bcType} data={el.data} w={W} h={el.h} />
      {el.hri && (
        // 바 종료 직후부터 그린다 — 실측상 글리프 상단 여백(~2×module)이 바와의 간격을 만든다
        <Text
          y={el.h}
          width={W}
          text={hriText(el.bcType, el.data)}
          align="center"
          fontFamily={cssVar('--wb-font-mono', 'monospace')}
          fontSize={hriF}
          fill={INK}
          listening={false}
        />
      )}
    </>
  )
}
