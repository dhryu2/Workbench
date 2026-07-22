// ZPL II 코드 생성기 — GUI 라벨 상태 → 정확한 ZPL 문자열. 이 도구의 핵심 로직.
// support.js `_zplLines`/`_elZpl`/`_borderZpl`/`_tableZpl` 의 문자열 조립을 바이트 단위로 재현한다.
//
// ── 벤치마크(정합성 기준) ──────────────────────────────────────────────
// seed.ts 의 SEED_ELEMENTS + SEED_SPEC(4×6 in @ 8dpmm) 로 buildZpl 을 돌리면
// 아래 37줄이 그대로 나와야 한다(assets/screenshots/panel-zplcode.png).
// (^A0N 의 두 번째 글자는 대문자 O 가 아니라 숫자 0 임에 주의 — ZPL 스케일러블 폰트 ^A0)
//
//  1  ^XA
//  2  ^PW812
//  3  ^LL1218
//  4  ^CI28
//  5  ^FO24,24^GB764,1170,3^FS
//  6  ^FO52,50^A0N,56,56^FB596,1,0,C^FD부품 라벨 / PART LABEL^FS
//  7  ^FO40,38^GB620,90,3^FS
//  8  ^FO664,56^GFA,1300,1300,13,<1비트 비트맵 100×100 · 임계값 128>^FS
//  9  ^FO52,176^GB712,5,5^FS
// 10  ^FO54,206^GB712,368,3^FS
// 11  ^FO264,206^GB3,92,3^FS
// 12  ^FO264,298^GB3,92,3^FS
// 13  ^FO264,390^GB3,92,3^FS
// 14  ^FO264,482^GB3,92,3^FS
// 15  ^FO564,206^GB3,92,3^FS
// 16  ^FO564,298^GB3,92,3^FS
// 17  ^FO564,390^GB3,92,3^FS
// 18  ^FO564,482^GB3,92,3^FS
// 19  ^FO54,298^GB210,3,3^FS
// 20  ^FO264,298^GB300,3,3^FS
// 21  ^FO54,390^GB210,3,3^FS
// 22  ^FO264,390^GB300,3,3^FS
// 23  ^FO54,482^GB210,3,3^FS
// 24  ^FO264,482^GB300,3,3^FS
// 25  ^FO68,237^A0N,30,30^FB182,1,0,L^FDPART NO^FS
// 26  ^FO278,235^A0N,34,34^FB272,1,0,L^FDWB-4061-203^FS
// 27  ^FO578,220^BQN,2,5,M^FDLA,WB-4061-203^FS
// 28  ^FO68,329^A0N,30,30^FB182,1,0,L^FD품명 / NAME^FS
// 29  ^FO278,327^A0N,34,34^FB272,1,0,L^FD브래킷 ASSY^FS
// 30  ^FO68,421^A0N,30,30^FB182,1,0,L^FD수량 / QTY^FS
// 31  ^FO278,419^A0N,34,34^FB272,1,0,L^FD50 EA^FS
// 32  ^FO68,513^A0N,30,30^FB182,1,0,L^FDLOT^FS
// 33  ^FO278,511^A0N,34,34^FB272,1,0,L^FDL-250722^FS
// 34  ^FO52,600^A0N,28,28^FB596,1,0,L^FDSUPPLIER   워크벤치 정밀^FS
// 35  ^FO52,648^BY3^BCN,170,Y,N,N^FD8829301047^FS
// 36  ^FO52,858^A0N,26,26^FB596,1,0,L^FDTRACKING   8829301047^FS
// 37  ^XZ
// ─────────────────────────────────────────────────────────────────────
import { dpiFor, toDots, norm, tableW, tableH, mergedRect, isHidden } from './geometry'
import type { Element, BorderableElement, TableElement, Rotation, ZplLine, ZplState } from './types'

// 회전 코드: 0→N, 90→R, 180→I, 270→B.
function rotCode(r: Rotation): string {
  return r === 90 ? 'R' : r === 180 ? 'I' : r === 270 ? 'B' : 'N'
}

// 헤더/푸터 줄 생성 헬퍼(요소와 무관).
function header(text: string): ZplLine {
  return { text, elId: null, isHeader: true }
}

// 합성 테두리(^GB) — border.on 일 때 요소 바깥에 사각형 하나를 더 그린다.
// 반환은 0개(off) 또는 1개 문자열. 빈 문자열을 emit 하면 빈 ZPL 줄이 생기므로 배열로 처리한다.
export function borderZpl(el: BorderableElement): string[] {
  const b = el.border
  if (!b || !b.on) return []
  const p = b.pad || 0
  const t = b.t || 2
  const { w, h } = norm(el)
  return [`^FO${el.x - p},${el.y - p}^GB${w + p * 2},${h + p * 2},${t}^FS`]
}

// 요소 → ZPL 명령 줄(들). 테두리 있는 타입은 자기 명령 뒤에 border 를 이어 붙인다.
export function elZpl(el: Element): string[] {
  switch (el.type) {
    case 'text': {
      const t = String(el.text || '').split('\n').join('\\&')
      const rot = rotCode(el.rot)
      return [
        `^FO${el.x},${el.y}^A0${rot},${el.font},${el.fontW || el.font}^FB${el.w},${el.maxLines || 1},0,${el.align || 'L'}^FD${t}^FS`,
        ...borderZpl(el),
      ]
    }
    case 'barcode': {
      const rot = rotCode(el.rot)
      const hri = el.hri ? 'Y' : 'N'
      let bc: string
      if (el.bcType === 'code39') bc = `^B3${rot},N,${el.h},${hri},N`
      else if (el.bcType === 'ean13') bc = `^BE${rot},${el.h},${hri},N`
      else if (el.bcType === 'upca') bc = `^BU${rot},${el.h},${hri},N`
      else bc = `^BC${rot},${el.h},${hri},N,N`
      return [`^FO${el.x},${el.y}^BY${el.module || 3}${bc}^FD${el.data}^FS`, ...borderZpl(el)]
    }
    case 'qr': {
      const rot = rotCode(el.rot)
      return [`^FO${el.x},${el.y}^BQ${rot},2,${el.mag || 5},${el.ecc || 'M'}^FDLA,${el.data}^FS`, ...borderZpl(el)]
    }
    case 'image': {
      const rowBytes = Math.ceil(el.w / 8)
      const bytes = rowBytes * el.h
      const note = el.dither ? ' · 디더링' : ' · 임계값 ' + el.threshold
      return [
        `^FO${el.x},${el.y}^GFA,${bytes},${bytes},${rowBytes},<1비트 비트맵 ${el.w}×${el.h}${note}>^FS`,
        ...borderZpl(el),
      ]
    }
    case 'box':
      return [`^FO${el.x},${el.y}^GB${el.w},${el.h},${el.t}^FS`]
    case 'ellipse':
      return [`^FO${el.x},${el.y}^GE${el.w},${el.h},${el.t}^FS`]
    case 'circle':
      return [`^FO${el.x},${el.y}^GC${el.d},${el.t}^FS`]
    case 'line':
      return el.dir === 'v'
        ? [`^FO${el.x},${el.y}^GB${el.t},${el.len},${el.t}^FS`]
        : [`^FO${el.x},${el.y}^GB${el.len},${el.t},${el.t}^FS`]
    case 'diagonal':
      return [`^FO${el.x},${el.y}^GD${el.w},${el.h},${el.t},${el.dir || 'L'}^FS`]
    case 'table':
      return tableZpl(el)
    default: {
      // 유니온 완전성 보장
      const _never: never = el
      return _never
    }
  }
}

// 표 → ZPL: ① 외곽 박스 ② 내부 세로선(병합에 가로로 가려진 행 구간 skip)
// ③ 내부 가로선(병합에 세로로 가려진 열 구간 skip) ④ 셀 콘텐츠(숨김 셀 제외, 병합은 병합 사각형 기준).
export function tableZpl(t: TableElement): string[] {
  const out: string[] = []
  const tw = tableW(t)
  const th = tableH(t)

  // ① 외곽 박스
  out.push(`^FO${t.x},${t.y}^GB${tw},${th},${t.t}^FS`)

  // ② 내부 세로선 — 각 열 경계마다 행 구간별 조각(병합이 그 경계를 가로로 덮으면 skip)
  let cx = 0
  for (let i = 0; i < t.cols.length - 1; i++) {
    cx += t.cols[i]
    let cy = 0
    for (let r = 0; r < t.rows.length; r++) {
      const spans = (t.merges || []).some(
        (m) => m.c <= i && m.c + m.cs - 1 >= i + 1 && r >= m.r && r < m.r + m.rs,
      )
      if (!spans) out.push(`^FO${t.x + cx},${t.y + cy}^GB${t.t},${t.rows[r]},${t.t}^FS`)
      cy += t.rows[r]
    }
  }

  // ③ 내부 가로선 — 각 행 경계마다 열 구간별 조각(병합이 그 경계를 세로로 덮으면 skip)
  let cy2 = 0
  for (let j = 0; j < t.rows.length - 1; j++) {
    cy2 += t.rows[j]
    let cx2 = 0
    for (let c = 0; c < t.cols.length; c++) {
      const spans = (t.merges || []).some(
        (m) => m.r <= j && m.r + m.rs - 1 >= j + 1 && c >= m.c && c < m.c + m.cs,
      )
      if (!spans) out.push(`^FO${t.x + cx2},${t.y + cy2}^GB${t.cols[c]},${t.t},${t.t}^FS`)
      cx2 += t.cols[c]
    }
  }

  // ④ 셀 콘텐츠
  for (let r = 0; r < t.rows.length; r++) {
    for (let c = 0; c < t.cols.length; c++) {
      if (isHidden(t, r, c)) continue
      const cell = t.cells[r + '_' + c]
      if (!cell || cell.type === 'empty') continue
      const rect = mergedRect(t, r, c)
      const pad = cell.pad != null ? cell.pad : t.pad
      const ax = t.x + rect.x
      const ay = t.y + rect.y
      if (cell.type === 'text') {
        const inner = rect.w - pad * 2
        const f = cell.font || 30
        const va = cell.valign || 'mid'
        // valign: top=상단+pad, bot=하단-pad-폰트, mid=세로중앙
        const yy =
          va === 'top'
            ? ay + pad
            : va === 'bot'
              ? ay + rect.h - pad - f
              : ay + Math.round((rect.h - f) / 2)
        out.push(`^FO${ax + pad},${yy}^A0N,${f},${f}^FB${inner},1,0,${cell.halign || 'L'}^FD${cell.text || ''}^FS`)
      } else if (cell.type === 'qr') {
        out.push(`^FO${ax + pad},${ay + pad}^BQN,2,${cell.mag || 4},M^FDLA,${cell.data || ''}^FS`)
      } else if (cell.type === 'barcode') {
        out.push(`^FO${ax + pad},${ay + pad}^BY2^BCN,${rect.h - pad * 2},N,N,N^FD${cell.data || ''}^FS`)
      } else if (cell.type === 'image') {
        out.push(`^FO${ax + pad},${ay + pad}^GFA,...,<1비트 셀 이미지>^FS`)
      }
    }
  }

  return out
}

// GUI 상태 → ZPL 줄 배열. 헤더(^XA/^PW/^LL/^CI28) → 요소들 → 푸터(^XZ).
export function buildZpl(state: ZplState): ZplLine[] {
  const dpi = dpiFor(state.dpmm)
  const PW = toDots(parseFloat(state.w) || 0, state.unit, dpi)
  const LL = toDots(parseFloat(state.h) || 0, state.unit, dpi)

  const lines: ZplLine[] = [header('^XA'), header('^PW' + PW), header('^LL' + LL), header('^CI28')]

  for (const el of state.els) {
    for (const code of elZpl(el)) {
      lines.push({ text: code, elId: el.id, isHeader: false })
    }
  }

  lines.push(header('^XZ'))
  return lines
}
