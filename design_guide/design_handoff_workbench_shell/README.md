# Handoff: Workbench — 앱 셸 & 루트 런처

---

## ⚠️ Claude Code에게 (먼저 읽으세요)

이 폴더는 **디자인 레퍼런스**입니다. 목표는 "이 HTML을 그대로 배포"가 아니라,
**여기에 담긴 화면·동작·값을 대상 앱의 기존 스택에서 재구현**하는 것입니다.

**하지 말 것**
- `support.js`를 이식/복사하지 마세요. 이것은 이 프로토타입을 브라우저에서 렌더하기 위한
  **디자인 툴 런타임**일 뿐이며, 대상 앱과 무관합니다. (구조 확인 용도로만 존재)
- `.dc.html`의 `<x-dc>`, `<sc-if>`, `<sc-for>`, `{{ ... }}` 문법을 실제 코드에 옮기지 마세요.
  이것은 프로토타입 프레임워크 문법입니다. **의미만 읽고** React(또는 대상 프레임워크)로 옮기세요.
  - `<sc-if value=X>` → 조건부 렌더링, `<sc-if>` → `{cond && <.../>}`
  - `<sc-for list=X as=item>` → `list.map(item => ...)`
  - `{{ foo }}` → `foo` 값 바인딩. `onClick="{{ fn }}"` → `onClick={fn}`
  - 로직 클래스의 `state` → `useState`, `renderVals()`의 파생값 → `useMemo`/렌더 중 계산.
- 인라인 스타일 문자열을 그대로 붙여넣지 마세요. **컬러/간격/폰트는 반드시
  `styles.css`의 CSS 변수(`var(--color-*)` 등) 또는 그에 대응하는 대상 앱의 토큰**으로 옮기세요.

**할 것**
- 아래 "Screens / Views"의 측정값·색·타이포를 **픽셀 단위로 정확히** 재현 (hifi).
- `Workbench.dc.html`을 브라우저로 열어 실제 동작(팔레트, 사이드바 접기, 즐겨찾기, 필터)을 확인.
  단, 스타일이 안 보이면 파일 상단 `<link href="_ds/industry-…/styles.css">`를
  **동봉된 `./styles.css`로 경로 수정** 후 다시 여세요. (`support.js`는 같은 폴더에 함께 있음.)
- Industry 디자인 시스템 규칙(블루프린트 프레임, 사각 모서리, 단일 스틸 액센트, Lucide 1.5) 준수.
- 라우팅/유저 없음 전제: `/` = 런처, `/tools/:toolId` = 도구. 콘텐츠 영역은 **빈 placeholder**로.

**이 폴더의 파일 역할**
| 파일 | 역할 |
|---|---|
| `README.md` | 이 문서 — **구현의 단일 진실 원천**. 이것만 보고도 구현 가능해야 함 |
| `Workbench.dc.html` | 셸 전체 인터랙티브 프로토타입 (동작 확인용 레퍼런스) |
| `Workbench Icon.dc.html` | 앱 아이콘 크기별 시연 |
| `styles.css` | Industry 디자인 시스템 토큰/클래스 — **색·간격·폰트 값의 원천** |
| `support.js` | 프로토타입 런타임 (렌더 전용, **이식 대상 아님**) |
| `assets/*.svg` | 앱 아이콘 / 파비콘 |

---

## Overview
"Workbench"는 업무/일상의 자잘한 불편을 해결하는 **단일 목적 웹 도구 모음(toolbox) 앱**입니다.
시간이 지나며 도구가 수십 개로 늘어나는 것을 전제로 하며, 로그인/유저 구분은 없습니다(누구나 같은 화면).

이 핸드오프는 **앱 셸(프레임)과 루트 런처 페이지**만 다룹니다. 개별 도구 화면은 범위 밖이며,
각 도구는 이후 이 셸의 라우트/사이드바에 하나씩 끼워넣습니다. 따라서 도구 진입 시
**콘텐츠 영역은 빈 placeholder** 상태로 둡니다.

**기술 맥락**
- React SPA + react-router (`/` = 런처, `/tools/:toolId` = 각 도구)
- 프론트 전용 셸. 백엔드(Spring Boot)는 각 도구 API 용이라 셸과 무관.

---

## About the Design Files
이 번들의 파일들은 **HTML로 만든 디자인 레퍼런스(프로토타입)**입니다 — 의도한 룩앤필과 동작을
보여줄 뿐, 그대로 복사해 쓰는 프로덕션 코드가 아닙니다.

작업의 목표는 이 HTML 디자인을 **대상 코드베이스의 기존 환경(React + react-router)에서
그 프로젝트의 확립된 패턴/라이브러리로 재구현**하는 것입니다.

- `.dc.html` 파일은 스트리밍 렌더 프레임워크(Design Component) 위에 작성되어 있습니다.
  이 프레임워크 자체를 이식할 필요는 없습니다 — **마크업 구조, 인라인 스타일 값, 상태 로직만
  참고**해서 일반 React 컴포넌트로 옮기면 됩니다.
- 로직 클래스(`class Component extends DCLogic`)의 `state`/`renderVals()`는 React 컴포넌트의
  `useState` + 파생 값(useMemo) 으로 1:1 대응됩니다.

## Fidelity
**High-fidelity (hifi)**. 최종 컬러·타이포·간격·인터랙션이 확정된 목업입니다.
아래 디자인 토큰과 측정값을 그대로 재현하세요. 스타일 근원은 **Industry 디자인 시스템**이며,
`styles.css`(동봉)의 CSS 변수를 진실의 원천으로 삼습니다.

### Industry 디자인 시스템 핵심 규칙 (반드시 유지)
- **와이어프레임/블루프린트 미학**: 카드·버튼·주요 프레임은 사각 모서리(radius 0), 얇은 헤어라인
  보더, 네 모서리에 "+" 등록 마크(registration mark)를 답니다.
- 카드/피규어는 **투명(배경 채움 없음) 라인 드로잉**. 유일한 예외는 solid로 채운 **primary 버튼**(액센트 채움).
- 컬러는 **라이트 그라운드 + 단일 스틸 액센트** 하나만. 장식용 추가 컬러 금지.
- 타이포: 제목 **Barlow Condensed**, 본문 **Barlow**.
- 아이콘: **Lucide, stroke-width 1.5** (얇은 테크니컬 스트로크).

---

## Screens / Views

앱은 하나의 셸(상단 바 + 사이드바 + 메인) 안에서 라우트/상태에 따라 메인 영역이 바뀝니다.
상단 바와 사이드바는 항상 렌더되는 chrome입니다.

### 0. 앱 셸 (App Shell) — 공통 프레임
- **레이아웃**: `height:100vh` 세로 flex 컬럼. 위에서부터
  1. 상단 바 `height:56px` (flex:none)
  2. 본문 행 `flex:1` (가로 flex) = 사이드바 + 메인
- 상단 바 하단, 사이드바 우측에 `1px solid var(--color-divider)` 구분선.

### 1. 상단 바 (Top Bar)
- **높이** 56px, `padding: 0 18px`, 배경 `--color-bg`, 하단 `1px` divider. `z-index:20`.
- **좌: 브랜드 락업** (클릭 시 `/` 런처로 이동)
  - 26×26 사각 타일, 배경 `--color-accent`, 흰색 렌치 아이콘(15px).
  - 이름 "Workbench" — Barlow Condensed 600, 19px, letter-spacing -0.01em.
- **중앙: 전역 검색 트리거** (클릭 시 커맨드 팔레트 오픈 — Raycast 방식)
  - `flex:1; max-width:520px; margin:0 auto`, 높이 36px.
  - 배경 `--color-surface`, 보더 `1px --color-divider`, 사각 모서리, `cursor:text`.
  - 내부: 검색 아이콘(17) + placeholder 텍스트(14px, 55% 텍스트색) + 우측 단축키 뱃지 `⌘K`(mac) / `Ctrl K`(그외) — 11px, 1px 보더.
  - hover: 보더색 `color-mix(--color-text 45%)`.
- **우: 언어 토글 버튼** — `.btn.btn-secondary`, 높이 34px. globe 아이콘(16) + 현재 언어 라벨("KO"/"EN"). 클릭 시 ko↔en 토글. **계정/유저 메뉴는 없음.**

### 2. 사이드바 (Sidebar) — 펼침 상태
- **너비 246px**, 세로 flex 컬럼, 우측 divider, 배경 `--color-bg`. `width` transition 0.16s.
- 상단 스크롤 영역(`padding:12px 10px`)에 섹션들이 순서대로:
  1. **즐겨찾기** (항목 있을 때만) — localStorage 기반
  2. **최근 사용** (항목 있을 때만) — localStorage 기반, 최대 6개
  3. **카테고리별 전체 도구** — 카테고리마다 헤더 + 도구 목록
- **섹션 헤더**: 10px, letter-spacing 0.1em, uppercase, 텍스트 45%, `padding:0 9px`, `margin:0 0 6px`.
- **네비 행(도구 항목)**: `display:flex; gap:10px; padding:7px 9px`. 아이콘(18) + 이름(13px, 말줄임).
  - **활성 상태**(현재 열린 도구): 텍스트 `--color-accent-700`, 배경 `--color-accent-100`, 좌측 `2px solid --color-accent` 보더.
  - 비활성: 텍스트 `--color-text`, 투명 배경, 좌측 투명 2px 보더(정렬 유지).
- **하단 접기 버튼**: 상단 `1px` divider, `padding:11px 12px`. panel-left 아이콘(18) + "사이드바 접기". hover 시 배경 `color-mix(--color-text 6%)`.

### 3. 사이드바 — 접힘 상태
- **너비 60px**. 라벨/섹션 헤더 `display:none`. 아이콘만 중앙 정렬(`justify-content:center`, `padding:9px 0`).
- 행은 `title` 속성으로 네이티브 툴팁 제공.
- 하단 버튼의 panel-left 아이콘은 `transform:rotate(180deg)`로 방향 전환, 라벨 "사이드바 펼치기".

### 4. 루트 런처 (`/`)
- 메인은 스크롤 영역. 콘텐츠 컨테이너 `max-width:1120px; margin:0 auto; padding:30px 34px 90px`.
- **페이지 헤더**: h1 "도구 모음"(34px, letter-spacing -0.02em) + 서브텍스트("필요한 도구를 골라 바로 실행하세요 · 전체 N개", 14px muted).
- **컨트롤 행** (`margin-bottom:26px`, flex, wrap):
  - **인라인 검색 입력** `.input` — `flex:1; min-width:240px; max-width:380px`, 높이 38px, 좌측 검색 아이콘(padding-left 34px). 입력 시 그리드를 실시간 필터.
  - **카테고리 칩**: "전체" + 각 카테고리. `.tag` 형태, 1px 액센트 보더. 선택됨: 배경 `--color-accent`, 글자 `--color-bg`. 미선택: 투명 배경, 글자 `--color-accent`.
- **카테고리 섹션** (반복, `margin-bottom:34px`):
  - 헤더: h2 카테고리명(18px) + 개수 라벨(12px muted).
  - **도구 카드 그리드**: `display:grid; grid-template-columns:repeat(auto-fill, minmax(268px,1fr)); gap:16px`.

#### 도구 카드 (Tool Card)
- `.card.blueprint.elev-sm` — 사각, 투명(배경 `--color-bg`), 1px divider 보더, 네 모서리 "+" 마크, elev-sm 그림자.
- `padding:16px; min-height:138px; gap:11px`, `cursor:pointer`. 클릭 → 해당 도구로 이동.
- hover: 보더 `--color-accent`, `transform:translateY(-2px)` (transition 0.14s).
- 구성(세로):
  1. 상단 행: **아이콘 박스** 42×42, 1px divider 보더, 액센트색 아이콘(22). / 우측 **즐겨찾기 버튼** 30×30 — 별 아이콘(16). 즐겨찾기됨: 채움+`--color-accent`; 아님: 40% 텍스트색 아웃라인. 클릭 시 `stopPropagation` 후 토글. hover 배경 `color-mix(--color-text 7%)`.
  2. 제목(`.card-title`, 17px)
  3. 설명(`.card-body`, 13px, opacity 0.8, 한 줄 요약)
  4. 메타: 카테고리 `.tag.tag-neutral`.

### 5. 도구 진입 셸 (`/tools/:toolId`)
- 메인이 세로 flex 컬럼(`height:100%`).
- **도구 헤더** (flex:none, `padding:22px 34px`, 하단 divider):
  - 브레드크럼 행: "← 런처"(`.btn.btn-ghost`, arrow-left 아이콘) + "/" + 카테고리명(12px muted).
  - 타이틀 행: 48×48 아이콘 박스(1px 보더, 액센트) + [h1 도구명 28px, letter-spacing -0.02em / 설명 14px muted] + 우측 **즐겨찾기 토글 버튼**(`.btn.btn-secondary`, 별 아이콘 + "즐겨찾기 추가/해제").
- **콘텐츠 placeholder** (flex:1, `padding:26px 34px`):
  - `.blueprint` 프레임 `height:100%; min-height:280px`, 네 모서리 마크.
  - 배경: 45° 대각 해칭 패턴 `repeating-linear-gradient(-45deg, transparent 0 11px, color-mix(--color-text 3%) 11px 12px)`.
  - 중앙 정렬: layout 아이콘(30) + "도구 콘텐츠 영역"(Barlow Condensed 18px) + "이 도구의 화면이 여기에 표시됩니다."(14px) + 라우트 뱃지 `<code>/tools/{id}</code>`(12px, surface 배경, 1px 보더, `--color-accent-700`).
  - **여기가 각 도구 컴포넌트가 마운트될 자리.**

### 6. 커맨드 팔레트 (Cmd/Ctrl + K)
- 전체 오버레이 `position:fixed; inset:0; z-index:60`, 배경 `color-mix(--color-neutral-900 45%)`, 상단 정렬(`padding-top:12vh`), fade-in 0.12s. 배경 클릭 시 닫힘.
- 패널: `.blueprint.elev-lg`, `width:min(600px,92vw); max-height:70vh`, 배경 `--color-bg`, 모서리 마크, pop-in 0.16s. 내부 클릭은 stopPropagation.
- **입력 행**: 검색 아이콘 + 텍스트 입력(border 없음, 16px) + `esc` 뱃지. 하단 divider.
- **결과 리스트**(스크롤, `padding:7px`): 각 행 = 30×30 아이콘 박스 + [도구명 14px / 카테고리 12px] + 우측 enter 아이콘(선택 행에서만 표시).
  - **선택 행 하이라이트**: 배경 `--color-accent-100`, 글자 `--color-accent-800`.
  - 마우스 hover 시 그 행이 선택됨.
- **결과 없음**: "검색 결과가 없습니다" 중앙 텍스트(34px 패딩, 50% 텍스트색).
- **하단 힌트 바**: "↑↓ 이동 · ↵ 선택 · esc 닫기"(11px, 상단 divider).

### 7. 빈 상태 (Empty States)
- **빈 카탈로그(도구 0개)**: 런처 중앙에 `.blueprint` 72×72 프레임 + inbox 아이콘(액센트, 30) + h3 "아직 도구가 없습니다" + "도구가 추가되면 이곳에 카테고리별로 나타납니다."
- **검색 결과 없음**: `.blueprint` 64×64 프레임 + search 아이콘(45% 텍스트색, 26) + h3 "검색 결과가 없습니다" + "'{쿼리}'와(과) 일치하는 도구가 없습니다." + `.btn.btn-secondary` "검색 지우기".

> **참고 — 리뷰용 상태 스위처**: 프로토타입 우하단 고정 pill("미리보기: 기본/빈 카탈로그/결과 없음")은
> 디자인 리뷰에서 두 빈 상태를 강제로 보기 위한 **스캐폴딩**입니다. **프로덕션에는 포함하지 마세요.**
> 실제 앱에서 "검색 결과 없음"은 검색 필터 결과가 0일 때, "빈 카탈로그"는 도구 목록이 비었을 때 자연히 나타납니다.

---

## Interactions & Behavior
- **네비게이션**: 카드 클릭 / 사이드바 항목 클릭 / 팔레트 항목 선택 → `navigate('/tools/:toolId')`. 브랜드·"← 런처" → `navigate('/')`.
- **커맨드 팔레트 키보드**:
  - `⌘K` / `Ctrl+K`: 토글 (열 때 쿼리·선택 초기화). `preventDefault` 필요.
  - 열린 상태에서 `Esc` 닫기, `↑`/`↓` 선택 이동(순환), `Enter` 현재 선택 항목 열기.
  - 필터: 도구명(ko+en) · 설명 · 카테고리명에 대소문자 무시 부분일치.
- **즐겨찾기 토글**: 카드/도구 헤더의 별 버튼. 카드에서는 `stopPropagation`으로 카드 클릭과 분리.
- **인라인 검색**: 런처 입력값으로 그리드 필터(카테고리 칩과 AND 결합). 결과 0 → "검색 결과 없음".
- **애니메이션**: 팔레트 오버레이 fade 0.12s / 패널 pop(translateY -8→0) 0.16s. 카드 hover lift 0.14s. 사이드바 너비 0.16s.
- **포커스 링**: `:focus-visible` = `2px solid var(--color-accent)`, offset 2px (디자인 시스템 기본).

## State Management
React 컴포넌트 상태로 매핑 (프로토타입 `state` 기준):
| 상태 | 타입 | 설명 |
|---|---|---|
| `lang` | `'ko' \| 'en'` | UI 언어. 상단 바 토글로 변경 |
| `collapsed` | `boolean` | 사이드바 접힘 |
| `paletteOpen` | `boolean` | 커맨드 팔레트 표시 |
| `query` | `string` | 런처 인라인 검색어 |
| `paletteQuery` | `string` | 팔레트 검색어 |
| `paletteSel` | `number` | 팔레트 선택 인덱스(키보드 네비) |
| `catFilter` | `string` | 런처 카테고리 필터(`'all'` 또는 카테고리 id) |
| `favorites` | `string[]` | 즐겨찾기 도구 id — **localStorage `wb_favorites`** |
| `recents` | `string[]` | 최근 사용 도구 id(최대 6, 최신 순) — **localStorage `wb_recents`** |

- 라우팅 상태(현재 도구/뷰)는 프로토타입에서 `view`/`activeToolId`로 다뤘지만, **실제 앱에서는 react-router의 URL(`/` vs `/tools/:toolId`)이 진실의 원천**이어야 합니다.
- `favorites`/`recents`는 마운트 시 localStorage에서 읽고(없으면 시드값), 변경 시 즉시 저장.
  - 시드 기본값(스토리지 비었을 때): `favorites = ['qr-generator']`, `recents = ['zpl-editor','qr-generator']`.
- 도구 열 때: `recents`를 `[id, ...기존.filter(≠id)].slice(0,6)`로 갱신.

## i18n
- **모든 라벨은 다국어 대응**. 프로토타입은 `{ ko, en }` 사전 구조를 사용 — 실제 앱에서는 i18next 등 기존 i18n 라이브러리로 옮기세요.
- 번역 대상: 셸 UI 문자열 전부 + **도구 이름/설명 + 카테고리명**.
- 도구/카테고리 데이터는 이름·설명을 언어별 맵으로 보관하거나 번역 키로 참조.

## Design Tokens
Industry 디자인 시스템(`styles.css`)의 CSS 변수. **하드코딩 금지, 변수 사용.**

**컬러**
- `--color-bg: #f2f2f3` (그라운드) · `--color-surface: #e9e9ea` · `--color-text: #1d1f20`
- `--color-accent: #5980a6` (스틸, 유일한 액센트)
- `--color-divider: color-mix(#1d1f20 16%, transparent)`
- 액센트 램프: `--color-accent-100 #eef6ff` / `-700 #416180` / `-800 #2c455d` / `-900 #1d2d3d` (텍스트·활성 배경에 사용)
- 뉴트럴 램프: `--color-neutral-100 … -900` (`#f5f5f8 … #2b2b2d`)

**타이포**
- `--font-heading: "Barlow Condensed"` (weight 600) · `--font-body: "Barlow"`
- 스케일: h1 42 / h2 32 / h3 25 / h4 20 / body 15px, line-height 1.55.

**간격** (0.85× density): `--space-1 3.4` / `-2 6.8` / `-3 10.2` / `-4 13.6` / `-6 20.4` / `-8 27.2px`

**모서리**: `--radius-sm 2` / `--radius-md 4` / `--radius-lg 7px`
> 단, Industry 컴포넌트 규칙상 카드·버튼·인풋·태그·팔레트는 **radius 0(사각)**로 오버라이드됨.

**그림자**: `--shadow-sm` / `--shadow-md` / `--shadow-lg` (그라운드에 맞춰 튜닝된 잉크톤).

**블루프린트 프레임**: `.blueprint` + 자식 4개 `<i class="corner tl|tr|bl|br">` → 모서리 "+" 등록 마크.

## Assets
- `assets/workbench-icon.svg` — 앱 마스터 아이콘 512px. 스틸 스퀘어 + 흰 렌치(Lucide wrench) + 블루프린트 그리드 + 코너 등록 마크.
- `assets/workbench-favicon.svg` — 소형/파비콘용 단순화 버전(그리드·마크 제거, 렌치만). 상단 바 브랜드·브라우저 탭 등 소형 컨텍스트용.
- **아이콘 세트**: [Lucide](https://lucide.dev), stroke-width 1.5. 프로토타입에서 사용한 도구 아이콘 — qr-code, tag, braces, regex, git-compare(diff), binary, clock, palette. UI 아이콘 — wrench, search, languages, panel-left, star, arrow-left, corner-down-left(enter), layout-grid, inbox. 실제 앱은 `lucide-react` 등 사용 권장.
- 폰트: Barlow / Barlow Condensed (Google Fonts).

## 시드 데이터 (예시 도구)
카테고리 3개 · 도구 8개. (바코드 & 라벨의 2개는 원 요청 시드, 나머지는 그룹/그리드 시연용 예시 — 필요 없으면 제거)
- **바코드 & 라벨**: `qr-generator` "QR 코드 생성기"(한 화면에 여러 QR 동시 출력, PDA 스캔 테스트용), `zpl-editor` "ZPL 에디터"(GUI로 라벨 구성 후 ZPL 코드 생성)
- **텍스트 & 포맷**: `json-format` "JSON 포매터", `regex-test` "정규식 테스터", `text-diff` "텍스트 비교"
- **변환 & 인코딩**: `base64` "Base64 인코더", `timestamp` "타임스탬프 변환", `color-convert` "컬러 변환기"

## Responsive
데스크톱 우선(업무용). 태블릿까지 자연스럽게(그리드 `auto-fill`이 열 수 조정, 사이드바 접기로 폭 확보). 모바일은 필수 아님.

## Files
- `Workbench.dc.html` — 앱 셸 + 런처 + 도구 셸 + 팔레트 + 빈 상태 전체 인터랙티브 프로토타입 (**주 레퍼런스**).
- `Workbench Icon.dc.html` — 아이콘 크기별 렌더/사용 예시 프레젠테이션.
- `assets/workbench-icon.svg`, `assets/workbench-favicon.svg` — 아이콘 에셋.
- `styles.css` — Industry 디자인 시스템 토큰 + 컴포넌트 클래스(진실의 원천). 컬러/타이포/간격 값은 여기서.

> `.dc.html`은 브라우저에서 바로 열려 동작합니다(구조·동작 확인용). 단, `styles.css`는 원본 프로젝트에서
> `_ds/industry-…/styles.css` 경로로 참조됩니다 — 로컬에서 열 때 스타일이 안 보이면 `.dc.html` 상단
> `<link href>`의 경로를 동봉한 `styles.css`에 맞게 조정하세요.
