// 초기 라벨(시드) — 프로토타입 `_seedEls` 에서 채굴. buildZpl(이 시드) 은
// assets/screenshots/panel-zplcode.png 의 37줄과 바이트 단위로 일치해야 한다.
//
// NOTE(정합성): 프로토타입 HTML 현재본의 표 위치는 (x:52, y:208) 이지만, 벤치마크 스크린샷
// (10행 ^FO54,206…, 27행 ^FO578,220…)은 표 위치 (x:54, y:206) 로 생성돼 있다.
// 벤치마크가 "정합성 기준"이므로 표는 (54,206) 을 사용한다.
//
// 이미지(z3) 의 orig/src 는 프로토타입에서 canvas 로 만든 dataURL 이지만 ZPL 출력엔 쓰이지
// 않으므로(=w/h/dither/threshold 만 사용) 순수 모듈에서는 생략한다.
import type { Element } from './types'

export const SEED_ELEMENTS: Element[] = [
  // 외곽 프레임 박스
  { id: 'z1', type: 'box', x: 24, y: 24, w: 764, h: 1170, t: 3 },
  // 상단 제목(테두리 on)
  {
    id: 'z2',
    type: 'text',
    x: 52,
    y: 50,
    w: 596,
    font: 56,
    fontW: 56,
    text: '부품 라벨 / PART LABEL',
    align: 'C',
    rot: 0,
    maxLines: 1,
    border: { on: true, t: 3, pad: 12 },
  },
  // 우상단 엠블럼 이미지(100×100, 임계값 128)
  {
    id: 'z3',
    type: 'image',
    x: 664,
    y: 56,
    w: 100,
    h: 100,
    threshold: 128,
    dither: false,
    free: false,
    rot: 0,
    border: { on: false, t: 2, pad: 6 },
  },
  // 제목 아래 굵은 구분선
  { id: 'z4', type: 'line', x: 52, y: 176, dir: 'h', len: 712, t: 5 },
  // 4행 × 3열 표: 우측 열은 4행 세로 병합(QR)
  {
    id: 'z5',
    type: 'table',
    x: 54,
    y: 206,
    cols: [210, 300, 202],
    rows: [92, 92, 92, 92],
    t: 3,
    pad: 14,
    merges: [{ r: 0, c: 2, rs: 4, cs: 1 }],
    cells: {
      '0_0': { type: 'text', text: 'PART NO', halign: 'L', valign: 'mid', font: 30 },
      '0_1': { type: 'text', text: 'WB-4061-203', halign: 'L', valign: 'mid', font: 34 },
      '1_0': { type: 'text', text: '품명 / NAME', halign: 'L', valign: 'mid', font: 30 },
      '1_1': { type: 'text', text: '브래킷 ASSY', halign: 'L', valign: 'mid', font: 34 },
      '2_0': { type: 'text', text: '수량 / QTY', halign: 'L', valign: 'mid', font: 30 },
      '2_1': { type: 'text', text: '50 EA', halign: 'L', valign: 'mid', font: 34 },
      '3_0': { type: 'text', text: 'LOT', halign: 'L', valign: 'mid', font: 30 },
      '3_1': { type: 'text', text: 'L-250722', halign: 'L', valign: 'mid', font: 34 },
      '0_2': { type: 'qr', data: 'WB-4061-203', mag: 5, halign: 'C', valign: 'mid' },
    },
  },
  // 공급처 텍스트
  {
    id: 'z6',
    type: 'text',
    x: 52,
    y: 600,
    w: 596,
    font: 28,
    fontW: 28,
    text: 'SUPPLIER   워크벤치 정밀',
    align: 'L',
    rot: 0,
    maxLines: 1,
    border: { on: false, t: 2, pad: 6 },
  },
  // 하단 Code 128 바코드(HRI on)
  {
    id: 'z7',
    type: 'barcode',
    x: 52,
    y: 648,
    bcType: 'code128',
    data: '8829301047',
    module: 3,
    h: 170,
    hri: true,
    rot: 0,
    border: { on: false, t: 2, pad: 8 },
  },
  // 추적번호 텍스트
  {
    id: 'z8',
    type: 'text',
    x: 52,
    y: 858,
    w: 596,
    font: 26,
    fontW: 26,
    text: 'TRACKING   8829301047',
    align: 'L',
    rot: 0,
    maxLines: 1,
    border: { on: false, t: 2, pad: 6 },
  },
]

// 시드 라벨 스펙: 4×6 in @ 8dpmm(203dpi) → 812×1218 dot.
export const SEED_SPEC = { unit: 'in', w: '4', h: '6', dpmm: 8 } as const
