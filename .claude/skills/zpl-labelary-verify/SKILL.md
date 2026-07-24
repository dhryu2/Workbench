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
- 텍스트(^A0): 캡 상단이 정확히 FO y, 캡높이 = **0.75×h**(H 실측 45/60; C·A 등 라운드 글리프는 ±2% 오버슈트+AA로 커 보임 — 큰 h에서 C 기준 측정 금지). em 박스 = [y, y+h]. 캔버스(Roboto cap 0.711)는 fonts.labelTextOffsetY로 캡 상단=FO y 정렬; 캡 ~5% 작고 폭 ~7% 넓은 건 대체 폰트 근사 한계.
- ^FB 줄간격(^A0) = 정확히 **h + gap(3번째 파라미터)** — 1.18h 아님. ^FB 중앙정렬(C)은 트레일링 스페이스 1개 포함 센터링 → 정확 중앙보다 **0.1625×h 왼쪽**(폰트 A 팬텀 +1셀과 동일 패턴, 텍스트 길이 무관). R 정렬은 팬텀 없음(박스 우변 정렬 정확).
- **\\&는 ^FB 안에서만 개행** — 비-FB 필드에선 문자 그대로 한 줄에 인쇄된다.
- ^A 크기 생략(`^A0N`만) 시 직전 **^CF 크기를 상속**(실측 CF0,60→캡45). bare ^FD도 ^CF 적용.
- **회전 앵커 규칙(실측)**: FO = **회전된 결과 박스의 좌상단**. 원점 피벗 회전만 하면 90°는 FO 왼쪽, 270°는 FO 위에 그려져 오답 — 회전 후 평행이동(90: +x=잉크박스높이, 180: +w+h, 270: +y=잉크박스폭) 필요. 바코드는 바 박스 기준이고 HRI는 밖으로 돈다(BCR: HRI가 FO 왼쪽 x[-10m..]에 위치). 회전 바코드 인코딩/폭은 비회전과 동일.
- **^GD 파라미터**: 방향은 5번째(`^GDw,h,t,색,방향`) — 4번째(색상)에 L/R을 쓰면 무시되고 기본 **R("/")**로 인쇄. R="/"(좌하→우상), L="\\". 기본값 R.
- ^GB 5번째 파라미터 = 코너 라운딩(0–8): 외곽 반경 ≈ r/8 × min(w,h)/2 (r2·r8 실측 부합, ±3dot). 4번째 = 색 — **W는 흰색 잉크(흰 배경에선 무인쇄)**. 폰트 A ^FB 피치 = 9×vMag + gap. QR 회전도 동일 앵커 규칙(앵커 박스 = s+10 오프셋 포함 — BQR 잉크가 FO 정확히 좌상단, +10 갭은 회전축으로 돎). ^GE/^GC는 외곽 bbox = 지정 w×h/d 정확(두께 안쪽, GC 지름 8배수 반올림 없음).
- **^BY 2번째 = wide:narrow ratio**로 Code39 폭이 변한다(실측 m4 ABC: r2→256, r3→316dot; 폭 = (3r+6)m×chars + (chars-1)m). Code128은 ratio 무관.
- 비트맵 폰트 기본 셀(파라미터 생략, 대문자 잉크 h/문자 advance 실측): B=12/8.8, C·D=15/11.6, E(OCR-B)=21/18.8, F=22/15.6, G=49/44.8, H(OCR-A)=22/18.0. 에디터는 B~H를 Roboto로 근사(미정합).
- **[중대 함정] Konva 10은 legacyTextRendering=false 기본** — Text를 middle 베이스라인이 아니라 **alphabetic 베이스라인 + (fontBoundingBoxAscent−Descent)/2 + lineHeight/2 앵커**로 그린다(lib/shapes/Text.js _sceneFunc). middle 가정으로 offsetY를 계산하면 텍스트가 ~0.05h 아래로 밀린다(h=190에서 ~10dot; 작은 h에선 안 보임). offsetY 보정은 Konva measureSize('M')과 동일 메트릭(fontBoundingBox*, 없으면 actualBoundingBox 폴백)을 런타임 실측해야 한다.
- **[중대 함정] Labelary 텍스트는 안티앨리어싱된 아웃라인 렌더**(PNG에 회색 전 범위) — threshold(<128) 이진화로 글리프를 추출하면 저커버리지 픽셀이 떨어져 글리프가 깨진다('n'→'r', '(' 구멍). 측정·비교는 반드시 **alpha=255-gray 바이트 단위**로 하라. 도형(^GB)은 크리스프라 threshold 무방.
- 폰트 A: advance=6×hMag/자, 잉크 top≈FO y(글리프별 bearing·AA 오버슈트로 ±1 가능), 행간 정확히 9×vMag(1.18 아님). 배율은 **round**(floor 아님): vMag=round(h/9)(h13→1x,h14→2x,h22→2x,h23→3x), hMag=round(w/5)(w7→1x,w8→2x). ^CF/^A w 생략 시 round(h*5/9). 배율별로 독립 래스터(1x를 NN확대하면 안 됨) — canvas/font-a-atlas.ts에 배율 1~5 알파 아틀라스 내장, fontAAlphaGrid(text,v,hz,block)가 순수 함수(node 테스트 가능). 문자열 = 글리프 셀을 pen=FO+i×6hz에 스탬프한 정확한 합성(위치·^FH 무관 결정적, max 블렌드). 아틀라스 ground truth: /tmp/zpl-diag/fontA-atlas.json(소실 시 배율별 ^AAN,9m,5m 그리드를 Labelary 렌더 후 알파 추출로 재생성). '\'는 ¢로 렌더(Zebra 코드페이지).
- ^FB 정렬(폰트 A 실측): C = round((blockW-(n+1)×advance)/2) — 팬텀 +1셀, 후행 공백 제외한 n. R = blockW-n×advance(팬텀 없음). 줄바꿈은 공백 후 분리, maxChars=floor(blockW/advance).
- 픽셀 검증 스크립트 패턴: /tmp/zpl-diag/verify.mts — Labelary PNG의 필드별 잉크를 FO상대 JSON으로 추출(python) 후 tsx로 fontAInkGrid와 도트 집합 전수 비교.
- 배포 주의: 수정이 "안 보인다" 신고 시 먼저 배포 번들 grep으로 수정 포함 여부 확인(과거: 수정이 uncommitted 로컬에만 있고 유저는 배포 사이트를 테스트해 "여전히 동일" 오인).

## Pitfalls
- 이 머신은 NODE_ENV=production이라 빌드 전 `NODE_ENV=development npm run build` (frontend 디렉터리에서).
- Labelary POST에 Content-Type 미지정 시 415.
- QR 테스트 데이터가 영숫자면 Alphanumeric 모드로 압축돼 예상 버전이 달라진다 — 모드별로 데이터를 골라 테스트.
- bbox 측정 시 인접 요소 잉크가 측정 창에 섞이지 않게 x/y 범위를 좁혀라.

## Verification
- 라운드트립 IDENTICAL + 렌더 PNG에서 각 요소 bbox가 캔버스 파생값(norm/bcWidth/qrSize)과 일치하면 통과.
