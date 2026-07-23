---
name: zpl-labelary-verify
description: Verifies ZPL editor WYSIWYG parity by rendering ZPL through the Labelary API and pixel-measuring the PNG. Use when tuning the Workbench ZPL editor canvas (barcode/QR/text/GFA geometry), investigating editor-vs-print differences, or extending parser/generator support.
---

## When to Use
- ZPL 에디터 캔버스와 실제 인쇄 결과의 기하 편차를 정량 측정할 때
- zpl-generate/zpl-parse 수정 후 회귀 확인(라운드트립 + 실렌더)
- EAN/UPC 근사 개선 등 남은 정합 작업 시

## Procedure
1. 라운드트립 회귀: `npx --yes tsx` 스크립트로 `buildZpl(state)` → `parseZpl(zpl)` → 재생성 문자열 비교(IDENTICAL 필수). 예시는 과거 세션의 /tmp/zpl-e2e.mts 패턴(요소별 fixture 구성, GFA는 헥스 직접 주입).
2. Labelary 렌더: `printf '<ZPL>' | curl -s -X POST -H "Accept: image/png" -H "Content-Type: application/x-www-form-urlencoded" --data-binary @- "https://api.labelary.com/v1/printers/8dpmm/labels/{W}x{H}/0/" -o out.png` (W/H는 인치, dot=PW/203).
3. 픽셀 측정: PIL 없이 python3 표준 zlib/struct로 8-bit grayscale PNG를 디코드(필터 0–4 역적용)해 검은 픽셀 bbox를 요소 영역별로 출력 — x/y 시작·폭·높이를 dot 단위로 얻는다.
4. 캔버스 상수와 비교해 편차를 코드에 반영(아래 실측 결과표 기준).

## Verified Facts (2026-07 실측 — 코드에 이미 반영됨)
- ^GFA: FO 위치에 정확히 w×h dot로 찍힘. 헤더 바이트수 = rowBytes×rows, hex와 같은 래스터에서 계산해야 함.
- QR(^BQ): x는 FO 정확, y는 **+10dot 고정 오프셋**(배율 무관). ECC는 ^BQ 4번째 파라미터가 아니라 **^FD 접두 `<ecc>A,`가 실효값**. 인코딩 모드는 자동(숫자→Numeric, QR영숫자셋→Alphanumeric, 그 외→Byte) — 캔버스 인코더도 같은 모드를 골라야 버전/크기 일치.
- Code128/39: 바가 FO x에서 즉시 시작(quiet zone 미인쇄), 폭 = 모듈수×module 정확(C128 = 11×(len+2)+13 모듈). HRI는 바 아래, 폰트 em ≈ 10×module(글리프 ≈7×module), 바코드 폭 기준 중앙정렬.
- EAN-13/UPC-A: Labelary가 자체 배율/가드/HRI 배치를 사용(바 시작이 FO보다 왼쪽, 모듈수도 95와 다름) — 완전 재현 불가, 근사+경고로 처리 중.
- 텍스트(^A0): 캡 상단이 FO y에 위치, 캡높이 ≈ 0.75×h (CG Triumvirate). 캔버스는 fonts.labelTextOffsetY(런타임 측정)로 베이스라인 y+0.75h 정렬.

## Pitfalls
- 이 머신은 NODE_ENV=production이라 빌드 전 `NODE_ENV=development npm run build` (frontend 디렉터리에서).
- Labelary POST에 Content-Type 미지정 시 415.
- QR 테스트 데이터가 영숫자면 Alphanumeric 모드로 압축돼 예상 버전이 달라진다 — 모드별로 데이터를 골라 테스트.
- bbox 측정 시 인접 요소 잉크가 측정 창에 섞이지 않게 x/y 범위를 좁혀라.

## Verification
- 라운드트립 IDENTICAL + 렌더 PNG에서 각 요소 bbox가 캔버스 파생값(norm/bcWidth/qrSize)과 일치하면 통과.
