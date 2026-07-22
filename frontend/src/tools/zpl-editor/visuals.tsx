// 캔버스 요소 비주얼 — 열전사 라벨 흑백(#111 on #fff)을 모사한다.
// 바코드/QR 는 프로토타입의 해시 시뮬레이션 대신 실제 인코더를 재사용한다(엔진 barcode-encode + qr-generator/qr-encode).
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import type { BarcodeType, Element, TableCell } from './types'
import type { Rect } from './geometry'
import { encodeBarcode } from './barcode-encode'
import { encodeQrToDataUrl } from '../qr-generator/qr-encode'

const INK = '#111'
const PAPER = '#fff'

// 1D 바코드 SVG(줄무늬) + 옵션 HRI 텍스트. 세로 flex.
function BarcodeVisual({ bcType, data, hri, zoom, fontPx }: { bcType: BarcodeType; data: string; hri: boolean; zoom: number; fontPx?: number }) {
  const { bars, total } = useMemo(() => encodeBarcode(bcType, data), [bcType, data])
  const t = total || 1
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER }}>
      <div style={{ flex: 1, minHeight: 0, background: PAPER }}>
        <svg viewBox={`0 0 ${t} 100`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
          {bars.map((b, i) => (
            <rect key={i} x={b.x} y={0} width={b.w} height={100} fill={INK} />
          ))}
        </svg>
      </div>
      {hri && (
        <div
          style={{
            flex: 'none',
            textAlign: 'center',
            fontFamily: 'var(--wb-font-mono)',
            fontSize: fontPx ?? Math.max(7, 15 * zoom),
            color: INK,
            letterSpacing: 2 * zoom,
            paddingTop: 2 * zoom,
          }}
        >
          {data}
        </div>
      )}
    </div>
  )
}

// QR 비주얼 — 실제 인코더의 PNG data URL(데이터 기준 메모). 실패 시 흰 박스.
function QrVisual({ data }: { data: string }) {
  const url = useMemo(() => {
    try {
      return encodeQrToDataUrl(data || '')
    } catch {
      return null
    }
  }, [data])
  return url ? (
    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }} />
  ) : (
    <div style={{ width: '100%', height: '100%', background: PAPER }} />
  )
}

// 이미지 비주얼 — src 있으면 <img>, 없으면 대각선 줄무늬 플레이스홀더 + "이미지".
function ImageVisual({ src, zoom }: { src?: string; zoom: number }) {
  const { t } = useTranslation()
  if (src) return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated', display: 'block' }} />
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background: 'repeating-linear-gradient(-45deg,#eee,#eee 4px,#fff 4px,#fff 8px)',
        color: '#888',
        fontSize: Math.max(8, 12 * zoom),
        fontFamily: 'var(--wb-font-body)',
      }}
    >
      {t('z_image')}
    </div>
  )
}

// 요소 타입별 내부 비주얼(표는 Canvas 가 별도 처리).
export function ElementVisual({ el, zoom }: { el: Element; zoom: number }) {
  const Z = zoom
  switch (el.type) {
    case 'text': {
      const align: CSSProperties['textAlign'] = el.align === 'C' ? 'center' : el.align === 'R' ? 'right' : el.align === 'J' ? 'justify' : 'left'
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            fontFamily: 'var(--wb-font-heading)',
            fontWeight: 600,
            color: INK,
            fontSize: Math.max(6, el.font * Z),
            lineHeight: 1.18,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            textAlign: align,
            transform: el.rot ? `rotate(${el.rot}deg)` : 'none',
            transformOrigin: 'center',
          }}
        >
          {el.text}
        </div>
      )
    }
    case 'box':
      return <div style={{ width: '100%', height: '100%', border: `${Math.max(1, el.t * Z)}px solid ${INK}`, boxSizing: 'border-box' }} />
    case 'ellipse':
      return <div style={{ width: '100%', height: '100%', border: `${Math.max(1, el.t * Z)}px solid ${INK}`, borderRadius: '50%', boxSizing: 'border-box' }} />
    case 'circle':
      return <div style={{ width: '100%', height: '100%', border: `${Math.max(1, el.t * Z)}px solid ${INK}`, borderRadius: '50%', boxSizing: 'border-box' }} />
    case 'line':
      return <div style={{ width: '100%', height: '100%', background: INK }} />
    case 'diagonal': {
      const w = el.w * Z
      const h = el.h * Z
      const tw = Math.max(1, el.t * Z)
      const p = el.dir === 'R' ? `M0,${h} L${w},0` : `M0,0 L${w},${h}`
      return (
        <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
          <path d={p} stroke={INK} strokeWidth={tw} fill="none" />
        </svg>
      )
    }
    case 'barcode':
      return <BarcodeVisual bcType={el.bcType} data={el.data} hri={el.hri} zoom={Z} />
    case 'qr':
      return <QrVisual data={el.data} />
    case 'image':
      return <ImageVisual src={el.src} zoom={Z} />
    case 'table':
      return null // 표는 Canvas 의 TableVisual 이 그린다
    default: {
      const _never: never = el
      return _never
    }
  }
}

// 표 셀 내부 콘텐츠(글자/QR/바코드/이미지). Rect 는 병합 반영 셀 크기(dot).
export function CellContent({ cell, rect, zoom }: { cell: TableCell; rect: Rect; zoom: number }) {
  const Z = zoom
  if (!cell || cell.type === 'empty') return null
  if (cell.type === 'text') {
    const align: CSSProperties['textAlign'] = cell.halign === 'C' ? 'center' : cell.halign === 'R' ? 'right' : 'left'
    return (
      <div
        style={{
          fontFamily: 'var(--wb-font-heading)',
          fontWeight: 600,
          color: INK,
          fontSize: Math.max(6, (cell.font || 30) * Z),
          lineHeight: 1.05,
          width: '100%',
          textAlign: align,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {cell.text}
      </div>
    )
  }
  if (cell.type === 'qr') {
    const sz = Math.min(rect.w, rect.h) * Z * 0.78
    return (
      <div style={{ width: sz, height: sz }}>
        <QrVisual data={cell.data || ''} />
      </div>
    )
  }
  if (cell.type === 'barcode')
    return (
      <div style={{ width: rect.w * Z * 0.82, height: rect.h * Z * 0.6 }}>
        <BarcodeVisual bcType="code128" data={cell.data || ''} hri={false} zoom={Z} />
      </div>
    )
  if (cell.type === 'image')
    return cell.data ? <img src={cell.data} alt="" style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' }} /> : null
  return null
}
