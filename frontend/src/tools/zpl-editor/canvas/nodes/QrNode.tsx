// QR 노드 — 실제 인코더 모듈 행렬을 mag 크기 정사각형으로 그린다(§6.3, 어떤 줌에서도 선명).
// 스케일된 <img> 를 쓰지 않는다. 인코딩 실패 시 흰 박스 폴백(v1 동일).
import { useMemo } from 'react'
import { Rect, Shape } from 'react-konva'
import { norm } from '../../geometry'
import { qrMatrix } from '../qr-matrix'
import { INK, PAPER } from '../theme'
import type { Ecc, QrElement } from '../../types'

// 모듈 행렬 조각(요소 본체 + 표 셀 QR 공용) — 전체 어두운 모듈을 한 패스로 채운다.
export function QrMatrixShape({
  x = 0,
  y = 0,
  data,
  ecc,
  mag,
}: {
  x?: number
  y?: number
  data: string
  ecc: Ecc
  mag: number
}) {
  const m = useMemo(() => qrMatrix(data, ecc), [data, ecc])
  if (!m) return null
  const size = m.count * mag
  return (
    <>
      <Rect x={x} y={y} width={size} height={size} fill={PAPER} listening={false} />
      <Shape
        x={x}
        y={y}
        fill={INK}
        listening={false}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          for (let r = 0; r < m.count; r++) {
            for (let c = 0; c < m.count; c++) {
              if (m.dark[r][c]) ctx.rect(c * mag, r * mag, mag, mag)
            }
          }
          ctx.fillStrokeShape(shape)
        }}
      />
    </>
  )
}

export function QrNode({ el }: { el: QrElement }) {
  const size = norm(el).w
  return (
    <>
      {/* 파생 크기 흰 바탕 — 인코딩 실패 시에도 v1 처럼 흰 박스가 남는다 */}
      <Rect width={size} height={size} fill={PAPER} listening={false} />
      <QrMatrixShape data={el.data} ecc={el.ecc || 'M'} mag={el.mag || 5} />
    </>
  )
}
