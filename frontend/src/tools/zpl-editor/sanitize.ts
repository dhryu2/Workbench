// ZPL 입력 제약(순수 모듈) — GUI 가 받은 문자열을 프린터가 실제로 출력 가능한 부분집합으로 강제한다.
//
// 근거(ZPL II 규격):
// - ^A0(스케일러블 내장 폰트)는 CJK 글리프가 없다 → 한글 등 비ASCII 는 실기/Labelary 에서
//   깨지거나 탈락한다. 인쇄 가능한 ASCII(0x20–0x7E)만 허용.
// - ^FD 필드 데이터에서 `^`(캐럿)·`~`(틸드)는 제어 접두라 raw 로 넣을 수 없고(^FH 미사용),
//   `\` 는 ^FB 이스케이프(\&)와 충돌 → 세 문자 모두 입력 단계에서 제거.
// - 심볼로지 문자셋: Code 39 는 0-9 A-Z - . 공백 $ / + %, EAN-13 은 숫자 12자리(체크 자동),
//   UPC-A 는 숫자 11자리(체크 자동), Code 128(B)은 인쇄 ASCII 전역.
import type { BarcodeType } from './types'

// 인쇄 가능한 ASCII + 개행만 남기고, ZPL 제어문자(^ ~ \)를 제거한다. (멀티라인 텍스트용)
export function sanitizeZplText(s: string): string {
  return String(s ?? '')
    .replace(/[\^~\\]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '')
}

// 단일 라인 필드 데이터(QR 등) — 개행도 불허.
export function sanitizeFieldData(s: string): string {
  return String(s ?? '')
    .replace(/[\^~\\]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
}

// EAN-13 데이터 12자리(13번째 체크 디지트는 프린터/인코더가 계산).
export const EAN13_DIGITS = 12
// UPC-A 데이터 11자리(12번째 체크 디지트는 프린터/인코더가 계산).
export const UPCA_DIGITS = 11

// 심볼로지별 데이터 정제 — 타입 전환 시에도 기존 데이터에 다시 적용한다.
export function sanitizeBarcodeData(bcType: BarcodeType, s: string): string {
  const base = sanitizeFieldData(s)
  if (bcType === 'code39') return base.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '')
  if (bcType === 'ean13') return base.replace(/\D/g, '').slice(0, EAN13_DIGITS)
  if (bcType === 'upca') return base.replace(/\D/g, '').slice(0, UPCA_DIGITS)
  return base // code128(B): 인쇄 ASCII 전역
}
