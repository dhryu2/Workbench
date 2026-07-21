# Handoff: QR 코드 생성기 (PDA 테스트용 다중 QR 생성 화면)

## Overview
PDA(바코드 스캐너) 테스트 목적의 **다중 QR 코드 생성 화면**입니다. 일반 웹 QR 생성기와 다르게 URL 변환·색상/로고 꾸미기·인쇄 기능이 **없습니다**. 사용자가 입력한 텍스트를 **가공 없이 그대로** QR로 인코딩하여, 한 화면에 격자(grid)로 여러 개를 띄우고 PDA로 순차 스캔하는 용도입니다.

이 화면은 "Workbench"라는 내부 도구 셸(sidebar + 도구 카탈로그 + 커맨드 팔레트로 구성된 단일 앱) 안의 `qr-generator` 도구로 구현되어 있습니다. 셸 자체의 구조는 별도 핸드오프(`design_handoff_workbench_shell`)에 정리돼 있고, **이 문서는 QR 생성기 도구 화면과 그 내부 동작에만 집중**합니다.

## About the Design Files
이 번들에 포함된 파일은 **HTML로 만든 디자인 레퍼런스(프로토타입)**입니다 — 의도한 외형과 동작을 보여주는 참고물이지, 그대로 복사해 프로덕션에 넣는 코드가 아닙니다. 목표는 **대상 코드베이스의 기존 환경(React / Vue / SwiftUI / 네이티브 등)에서 이 화면을 그 코드베이스의 확립된 패턴·라이브러리로 재구현**하는 것입니다. 아직 환경이 없다면, 프로젝트에 가장 적합한 프레임워크를 골라 구현하면 됩니다.

프로토타입은 커스텀 템플릿 런타임(`support.js`)으로 동작하지만, **런타임 자체를 이식할 필요는 없습니다.** 아래 "Interactions & Behavior"와 "State Management"에 서술한 로직만 대상 프레임워크의 상태 관리 방식으로 그대로 옮기면 됩니다. QR 인코딩 규칙(ECC·quiet zone·픽셀 스케일)은 스캔 안정성에 직결되므로 **정확히** 지켜 주세요.

## Fidelity
**High-fidelity (hifi)** — 최종 색상, 타이포, 간격, 인터랙션이 확정된 목업입니다. UI는 대상 코드베이스의 라이브러리로 픽셀 단위까지 동일하게 재현하되, 색·폰트·테두리 스타일은 아래 "Design Tokens"의 값을 그대로 사용하세요. 이 화면은 "Industry"라는 블루프린트(청사진) 풍 디자인 시스템 위에 만들어졌습니다 — 사각 모서리(radius 0), 하이라인(1px) 테두리, 네 모서리 코너 마크, 스틸블루 단일 액센트가 특징입니다.

---

## Screens / Views

도구 하나(전체 화면 세로 스택)로 구성됩니다. 위에서부터 **① 입력 패널(고정)** → **② QR 격자 영역(스크롤)** 순서입니다.

전체 컨테이너: `display:flex; flex-direction:column; flex:1; min-height:0` (셸의 메인 콘텐츠 영역을 꽉 채움).

### ① 입력 패널 (상단 고정 헤더)
- **컨테이너**: `flex:none; padding:20px 34px; border-bottom:1px solid var(--color-divider); display:flex; flex-direction:column; gap:13px`.
- **A. 한 줄 입력 행** — `display:flex; gap:10px; align-items:stretch`
  - **텍스트 입력**(`.input`): `flex:1; height:40px; font-family: 모노스페이스`. placeholder = "한 줄 텍스트 — 입력값 그대로 인코딩" (en: "Single line — encoded exactly as typed"). **Enter 키 = [추가]와 동일**.
  - **[추가] 버튼**(`.btn .btn-secondary`): `height:40px; gap:6px; white-space:nowrap`. 좌측에 plus 아이콘(15px) + 텍스트 "추가"/"Add". **상한 도달 시 `disabled`**.
- **B. 여러 줄 입력 행** — `display:flex; gap:10px; align-items:flex-end`
  - **textarea**(`.input`): `flex:1; min-height:76px; resize:vertical; font-family: 모노스페이스; line-height:1.5`. rows=3. placeholder = "여러 줄 입력 — 각 줄이 QR 하나 (빈 줄 무시)" (en: "One line per QR (blank lines ignored)").
  - **[일괄 생성] 버튼**(`.btn .btn-secondary`): `height:40px; white-space:nowrap`. 텍스트 "일괄 생성"/"Generate all". **상한 도달 시 `disabled`**.
- **C. 옵션/상태 행** — `display:flex; align-items:center; gap:16px; flex-wrap:wrap`
  - **trim 체크박스**(커스텀, `role="checkbox"`): 18×18 사각 박스 + 라벨 "앞뒤 공백 제거(trim)"/"Trim whitespace". `cursor:pointer; user-select:none`. **기본 OFF**. 체크 시 박스 배경 = `--color-accent`, 테두리 = `--color-accent`, 안에 흰색 체크 아이콘(13px). 미체크 시 배경 투명, 테두리 = `color-mix(in srgb, var(--color-text) 35%, transparent)`.
  - **스펙 캡션**(`.text-muted`, 12px): shield-check 아이콘(14px, 액센트색) + "흑백 전용 · 여백 4모듈 · 오류정정 M · 최소 160px" (en: "Pure B/W · 4-module quiet zone · ECC M · min 160px"). — 스캔 안정성 규칙을 사용자에게 상기시키는 정적 텍스트.
  - **스페이서**: `<div style="flex:1">`.
  - **개수 카운터**: Barlow Condensed 600, 13px, 텍스트 65% 불투명. 형식 = `"{현재개수} / {상한}"` (예: `3 / 12`).
  - **[전체 삭제] 버튼**(`.btn .btn-ghost`, 34px, 13px): trash 아이콘(14px) + "전체 삭제"/"Clear all". **항목 0개면 `disabled`**.
- **D. 상한 경고 배너** (조건부 표시) — `display:flex; align-items:center; gap:9px; padding:9px 12px; background:var(--color-accent-100); border:1px solid var(--color-accent); color:var(--color-accent-800); font-size:13px`. 좌측 alert-triangle 아이콘(16px, `--color-accent-700`).
  - **표시 조건**: `상한도달(atCap) || 직전오버플로우 > 0`.
  - **문구**: 직전 일괄 입력에서 넘친 개수가 있으면 → `"공간이 부족해 {n}개는 추가되지 않았습니다."` (en: "{n} not added — not enough room."). 아니면(단순 상한 도달) → "상한에 도달했습니다. 기존 코드를 삭제하면 더 추가할 수 있습니다." (en: "Limit reached. Remove a code to add more.").

### ② QR 격자 영역 (스크롤)
- **컨테이너**: `flex:1; min-height:0; overflow-y:auto; padding:22px 34px`. **이 요소의 clientWidth/Height를 측정해 상한을 산정**합니다(아래 State 참조). ResizeObserver를 붙입니다.
- **격자**(항목이 1개 이상일 때): `display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:16px; align-content:start`.
  - `minmax(160px, 1fr)`가 **최소 표시 크기 160px 보장**의 핵심입니다. 셀 폭이 남으면 `1fr`로 확대만 하고, 160px 밑으로는 절대 축소되지 않습니다.

#### QR 카드 (격자 셀 1개)
`.blueprint` 프레임(네 모서리 코너 마크 `<i class="corner tl/tr/bl/br">`) + `display:flex; flex-direction:column; background:var(--color-bg)`. 세 부분으로 나뉩니다:
1. **헤더 바**: `display:flex; align-items:center; justify-content:space-between; padding:6px 8px 6px 10px; border-bottom:1px solid var(--color-divider)`.
   - 좌측: 인덱스 `#{n}` (모노스페이스 12px, 텍스트 55%). n은 **1부터 시작**하는 순번(스캔 순서 식별용).
   - 우측: **개별 삭제(×) 버튼** 26×26, 투명 배경/보더 없음, 텍스트 55%. hover 시 배경 `--color-accent-100`, 글자 `--color-accent-700`. x 아이콘 15px.
2. **QR 이미지 영역**: `background:#ffffff; padding:14px; display:grid; place-items:center`. — **흰 바탕은 필수**(quiet zone 대비). 상태별로 하나만 표시:
   - **완료**: `<img>` — `width:100%; height:auto; display:block`. src = 생성된 PNG data URL. alt = 원본 텍스트.
   - **로딩 중**: `width:100%; aspect-ratio:1; display:grid; place-items:center` 안에 "…" (검정 35%, 12px).
   - **에러**(인코딩 실패): `aspect-ratio:1` 세로 스택 — alert 아이콘(16px) + "인코딩 실패 (데이터 과대)"/"Encode failed (too much data)". 글자색 `#8a3a3a`, 12px, 가운데 정렬.
3. **라벨 + 다운로드 바**: `display:flex; align-items:flex-start; gap:8px; padding:9px 10px; border-top:1px solid var(--color-divider)`.
   - **원본 텍스트 라벨**: `flex:1; min-width:0; 모노스페이스 12px; line-height:1.45; white-space:pre-wrap; word-break:break-all`. **2줄까지만 보이고 넘치면 말줄임**(`display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; max-height:2.9em`). `title` 속성에 **전체 원본 텍스트**를 넣어 hover 툴팁으로 전문 확인 가능.
   - **PNG 다운로드 버튼**: 28×28, `border:1px solid var(--color-divider)`, 투명 배경, 글자색 `--color-accent`. hover 시 배경 `--color-accent-100`, 글자 `--color-accent-700`. download 아이콘 14px. **아직 생성 안 됐으면(로딩/에러) `disabled`**.

#### 빈 상태 (항목 0개)
`display:flex; flex-direction:column; align-items:center; text-align:center; padding:64px 20px`.
- 72×72 `.blueprint` 프레임(코너 마크 포함) 안에 QR 아이콘(30px, 액센트색). `margin-bottom:20px`.
- h3 20px "아직 생성된 QR이 없습니다"/"No QR codes yet".
- p(`.text-muted`) 14px, `max-width:400px`: "위 입력창에 텍스트를 넣고 추가하세요. 입력한 값은 변형 없이 그대로 인코딩됩니다." (en: "Type text above and add it. Your input is encoded exactly, with no transformation.").

---

## Interactions & Behavior

### 핵심 원칙: 입력 텍스트 절대 변형 금지
- `http://` 자동 첨부·URL 정규화·불필요한 재인코딩을 **하지 않습니다.** 사용자가 친 문자열을 바이트 그대로 QR에 넣습니다.
- **trim은 기본 OFF** (테스트 문자열에 앞뒤 공백이 유의미할 수 있음). trim 토글이 ON일 때만 각 줄에 `.trim()`을 적용합니다.

### 한 줄 추가 (`addSingle`)
1. 입력값을 가져온다. trim이 ON이면 `.trim()` 적용.
2. 길이가 0이면 무시(추가 안 함).
3. 텍스트 1개를 항목 배열에 추가(`_addTexts([t])`) — 아래 상한 로직 통과.
4. 입력창을 비운다.
- **Enter 키**로도 트리거(기본 폼 제출 막고 `addSingle` 호출).

### 일괄 생성 (`addBulk`)
1. textarea 값을 `\n`으로 분리.
2. 각 줄에 대해 trim이 ON이면 `.trim()` 적용.
3. **빈 줄(길이 0) 제거** — 이게 "빈 줄 무시" 규칙.
4. 남은 줄이 없으면 무시.
5. 남은 줄들을 항목 배열에 추가(`_addTexts(lines)`).
6. textarea를 비운다.

### 항목 추가 + 상한 처리 (`_addTexts`)
```
room = max(0, 상한(qrCap) - 현재항목수)
take = 추가하려는 텍스트들 중 앞에서 room개만
overflow = 전체 - take.length   // 상한 때문에 잘려나간 개수
각 take 텍스트 → { id: 고유값, text, dataUrl: null(=로딩중) } 로 만들어 배열 뒤에 append
lastOverflow = overflow 로 기록  // 경고 배너 문구용
그 다음 QR 생성 큐를 돌린다(_pump)
```
- `id`는 단순 증가 시퀀스(`q1`, `q2`, …)면 충분. React key로 사용.

### QR 비동기 생성 큐 (`_pump` + `_genQR`)
- `_pump`: 항목 배열을 훑어 `dataUrl == null`(아직 미생성)이고 아직 진행 중이 아닌 항목에 대해 `_genQR(text)`를 호출, 진행 중 집합(`_pending`)에 id 추가. 완료되면 해당 항목의 `dataUrl`을 결과로 교체(실패면 `false`로 세팅 → 에러 UI).
- **왜 큐/비동기인가**: 렌더링 라이브러리 로드 타이밍과 무관하게 각 QR을 개별적으로 채워 넣기 위함. 대상 프레임워크에선 각 항목 마운트 시 `useEffect`로 생성하거나, 추가 시점에 `Promise.all`로 일괄 생성해도 동일한 결과가 됩니다.

### QR 인코딩 규칙 (`_genQR`) — ⚠ 스캔 안정성 최우선, 정확히 지킬 것
사용 라이브러리: **`qrcode-generator`** (프로토타입은 `qrcode-generator@1.4.4`). 대상 코드베이스에선 검증된 동등 라이브러리를 써도 되지만 아래 파라미터는 동일해야 합니다.

```js
// 1) 멀티바이트(한글 등) 안전: UTF-8 바이트 인코딩 강제
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

// 2) type 0 = 데이터 길이에 맞춰 버전 자동 결정, ECC 레벨 'M'
const qr = qrcode(0, 'M');
qr.addData(text, 'Byte');   // Byte 모드 (임의 문자열 그대로)
qr.make();

// 3) 캔버스에 순수 흑백으로 직접 렌더
const n = qr.getModuleCount();
const quiet = 4;                 // quiet zone = 4 모듈 (사방 여백)
const total = n + quiet * 2;
const scale = Math.max(2, Math.floor(600 / total));  // 목표 ~600px, 모듈당 정수 px (선명도)
const px = total * scale;
// canvas px×px, 흰 배경(#ffffff) 채우고, isDark(r,c)인 모듈만 검정(#000000) 사각형으로 채움
// (col+quiet, r+quiet) 오프셋으로 quiet zone 확보
// 결과: canvas.toDataURL('image/png')
```
규칙 요약:
- **오류 정정 레벨 M** (기본, 고정).
- **quiet zone 최소 4모듈** (사방 여백) — QR 사양 최소치. 절대 줄이지 말 것.
- **순수 검정(#000000)/흰색(#ffffff)만.** 색상·그라데이션·로고 금지.
- **모듈당 정수 픽셀**(`scale`는 정수)로 렌더해 경계 번짐 없이 선명하게. 결과 PNG는 약 500~600px 변.
- 표시 크기는 CSS(`minmax(160px,1fr)` + `img width:100%`)가 담당하고, 원본 PNG는 고해상도라 확대돼도 깨지지 않음.
- 인코딩 실패(데이터가 QR 최대 용량 초과 등) 시 `dataUrl = false` → 카드에 에러 UI.

### 삭제
- **개별 삭제(`removeEntry`)**: 해당 id 항목만 배열에서 제거. `lastOverflow`를 0으로 리셋(경고 배너 갱신).
- **전체 삭제(`clearAll`)**: 진행 중 집합 비우고 항목 배열을 `[]`로. `lastOverflow`도 0.

### 다운로드 (`_download`)
- 항목의 `dataUrl`(PNG)로 `<a download>` 클릭을 프로그래매틱하게 트리거.
- 파일명: `qr_{안전화된텍스트}.png` — 원본 텍스트에서 `[^\w.-]` 문자를 `_`로 치환하고 40자로 자름. 빈 문자열이면 `qr`.

### 상한 자동 산정 (`_measure` + ResizeObserver) — 반응형
격자 스크롤 영역의 실제 크기로 한 화면에 최소 크기(160px)를 지키며 들어갈 수 있는 최대 개수를 계산:
```
cellW = 160, cellH = 236  // 카드 최소 폭 / 대략적 카드 높이(헤더+QR+라벨)
gap = 16
가용폭 w = 컨테이너 clientWidth - 68   // 좌우 padding 34*2
가용높 h = 컨테이너 clientHeight - 44   // 상하 padding 22*2
cols = max(1, floor((w + gap) / (cellW + gap)))
rows = max(1, floor((h + gap) / (cellH + gap)))
상한(qrCap) = max(1, cols * rows)
```
- ResizeObserver로 컨테이너 크기 변화(창 리사이즈, 사이드바 접힘 등)마다 재계산.
- 상한에 도달하면 [추가]/[일괄 생성] 버튼이 `disabled`가 되고 경고 배너가 뜹니다.
- **구현 단순화가 필요하면 상한을 하드코딩(예: 12)해도 됩니다.** 프로토타입 초기값도 12이며, 측정 후 실제 값으로 대체됩니다. 하드코딩하더라도 **"최소 크기 밑으로 축소 금지"는 반드시 유지**(격자의 `minmax(160px,…)`).

### 다국어
- 한국어(`ko`)/영어(`en`) 문자열이 모두 정의돼 있습니다. 각 문자열의 한/영 값은 위 본문과 "Design Tokens" 하단 문자열 표에 있습니다.

---

## State Management
필요한 상태 변수:
- `entries: Array<{ id, text, dataUrl }>` — QR 항목 목록. `dataUrl`: `null`=로딩중, `string`(PNG data URL)=완료, `false`=인코딩 실패. **순서가 곧 표시/스캔 순서.**
- `single: string` — 한 줄 입력창 값.
- `bulk: string` — 여러 줄 textarea 값.
- `trim: boolean` — 앞뒤 공백 제거 토글 (기본 `false`).
- `qrCap: number` — 현재 상한 (초기 12, `_measure`로 갱신).
- `lastOverflow: number` — 직전 일괄 입력에서 상한 때문에 잘린 개수 (경고 배너 문구 결정용, 삭제/추가 시 0으로 리셋).

파생값(렌더 시 계산):
- `atCap = entries.length >= qrCap`
- `capAlertVisible = atCap || lastOverflow > 0`
- `hasEntries = entries.length > 0`, `noEntries = entries.length === 0`

진행 중 QR 생성 추적용 비상태 핸들: `_pending: Set<id>` (중복 생성 방지), `_seq: number` (id 시퀀스).

데이터 페칭 없음 — 전부 클라이언트 로컬. 외부 의존성은 QR 인코딩 라이브러리 하나뿐입니다.

---

## Design Tokens
이 화면이 올라탄 "Industry" 디자인 시스템의 값. `styles.css`(번들에 포함)에서 발췌.

**컬러**
- `--color-bg: #f2f2f3` (그라운드/카드 배경) · `--color-surface: #e9e9ea` · `--color-text: #1d1f20`
- `--color-accent: #5980a6` (스틸블루, 유일한 액센트)
- `--color-divider: color-mix(in srgb, #1d1f20 16%, transparent)` (하이라인 테두리)
- 액센트 램프: `--color-accent-100 #eef6ff` (연한 배경/hover) / `-600 #597ea3` / `-700 #416180` (글자/hover 글자) / `-800 #2c455d` (경고 배너 글자)
- **QR 자체는 토큰과 무관하게 순수 `#000000` / `#ffffff` 고정** (스캔 안정성).
- 에러 텍스트 전용색 `#8a3a3a`.

**타이포**
- `--font-heading: "Barlow Condensed"` (weight 600) — 카운터·버튼·제목.
- `--font-body: "Barlow"` — 본문·라벨 텍스트.
- **모노스페이스**(`ui-monospace, monospace`) — 입력창, QR 라벨, 인덱스 번호. (테스트 문자열의 공백·글자를 정확히 보이게 하려는 의도.)

**형태**
- `border-radius: 0` (모든 컨트롤 사각). `.card/.btn/.input`은 radius 0.
- 테두리: `1px solid var(--color-divider)` (하이라인).
- `.blueprint` 프레임: `position:relative; border:1px solid var(--color-divider)` + 네 모서리 `.corner`(11×11 ㄱ자 마크, `top/left: -6px` 등으로 프레임 밖으로 살짝 빠져나옴, 색 = 텍스트 55%).
- 포커스: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`.
- 비활성 컨트롤: `opacity: 0.45; cursor: not-allowed`.

**간격**: 입력 패널 `padding:20px 34px`, 격자 영역 `padding:22px 34px`, 격자 `gap:16px`, 옵션 행 `gap:16px`, 입력 행 `gap:10px`.

**아이콘**: Lucide 스타일 라인 아이콘(24 viewBox, `stroke-width:1.5`, `stroke:currentColor`, fill none, round cap/join). 사용된 것: `plus`, `x`, `check`, `download`, `trash2`, `alert-triangle`, `shield-check`(스펙 캡션), `qrcode`(빈 상태). 대상 코드베이스의 아이콘 세트로 대체 가능.

**UI 문자열 (ko / en)**
| 키 | 한국어 | English |
|---|---|---|
| single_ph | 한 줄 텍스트 — 입력값 그대로 인코딩 | Single line — encoded exactly as typed |
| add | 추가 | Add |
| bulk_ph | 여러 줄 입력 — 각 줄이 QR 하나 (빈 줄 무시) | One line per QR (blank lines ignored) |
| bulk_add | 일괄 생성 | Generate all |
| trim | 앞뒤 공백 제거(trim) | Trim whitespace |
| clear_all | 전체 삭제 | Clear all |
| count | `{n} / {cap}` | `{n} / {cap}` |
| at_cap | 상한에 도달했습니다. 기존 코드를 삭제하면 더 추가할 수 있습니다. | Limit reached. Remove a code to add more. |
| overflow | 공간이 부족해 {n}개는 추가되지 않았습니다. | {n} not added — not enough room. |
| spec | 흑백 전용 · 여백 4모듈 · 오류정정 M · 최소 160px | Pure B/W · 4-module quiet zone · ECC M · min 160px |
| remove | 삭제 | Remove |
| download | PNG 저장 | Save PNG |
| error | 인코딩 실패 (데이터 과대) | Encode failed (too much data) |
| empty_title | 아직 생성된 QR이 없습니다 | No QR codes yet |
| empty_body | 위 입력창에 텍스트를 넣고 추가하세요. 입력한 값은 변형 없이 그대로 인코딩됩니다. | Type text above and add it. Your input is encoded exactly, with no transformation. |

---

## Assets
- 이미지 자산 없음. QR은 런타임에 캔버스로 생성. 아이콘은 인라인 SVG(코드에 path 데이터로 포함).
- 외부 라이브러리: `qrcode-generator` (QR 모듈 매트릭스 계산). 프로토타입은 unpkg CDN(`https://unpkg.com/qrcode-generator@1.4.4/qrcode.js`)에서 로드 — 프로덕션에선 npm 패키지로 설치 권장(`npm i qrcode-generator`). 설치 전 최신 버전 확인.

## Files
번들에 포함된 참고 파일:
- `Workbench.dc.html` — 전체 셸 프로토타입. QR 생성기 관련 코드 위치:
  - **템플릿(마크업)**: `<!-- QR GENERATOR -->` 주석 아래 `<sc-if value="{{ isQrTool }}">` 블록 (입력 패널 + 격자 + 빈 상태).
  - **로직**: `// ── QR generator ──` 주석 아래 메서드들 — `setQrSingle`, `setQrBulk`, `onSingleKey`, `toggleTrim`, `addSingle`, `addBulk`, `_addTexts`, `_pump`, `_genQR`, `removeEntry`, `clearAll`, `_download`, `gridRef`, `_measure`.
  - **파생값/문자열**: `renderVals()` 내부 QR 섹션, `L`(로케일) 객체의 `qr_*` 키들.
  - **QR 라이브러리 로드**: `<head>`의 `<script src="https://unpkg.com/qrcode-generator@1.4.4/qrcode.js">`.
- `styles.css` — Industry 디자인 시스템 토큰·유틸 클래스(`.blueprint`, `.corner`, `.btn`, `.input`, `.text-muted` 등).
- `qrcode.js` — QR 인코딩 라이브러리 참고 사본.
- `screenshots/` — (있는 경우) 화면 캡처.

> 참고: `Workbench.dc.html`은 커스텀 템플릿 런타임(`{{ }}` 홀, `<sc-if>`/`<sc-for>`)으로 동작하는 프로토타입입니다. 이 문법을 그대로 옮기지 말고, 위 설명대로 **대상 프레임워크의 조건부 렌더링·리스트 렌더링·상태 관리로 재구현**하세요.
