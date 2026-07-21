// 한국어 셸 UI 문자열. 도구/카테고리 이름·설명은 catalog.ts의 언어별 맵에서 별도 관리.
export const ko = {
  // 상단 바
  search_global: '도구 검색…',
  lang_switch: '언어 전환',
  // 사이드바 섹션
  fav: '즐겨찾기',
  recent: '최근 사용',
  collapse: '사이드바 접기',
  expand: '사이드바 펼치기',
  // 런처
  launcher_title: '도구 모음',
  launcher_sub: '필요한 도구를 골라 바로 실행하세요 · 전체 {{count}}개',
  launcher_search: '이 목록에서 검색…',
  all: '전체',
  count: '{{count}}개',
  // 커맨드 팔레트
  palette_ph: '도구 이름으로 검색…',
  palette_nav: '이동',
  palette_sel: '선택',
  palette_close: '닫기',
  palette_empty: '검색 결과가 없습니다',
  // 도구 진입 프레임
  tool_placeholder_title: '도구 콘텐츠 영역',
  tool_placeholder_body: '이 도구의 화면이 여기에 표시됩니다.',
  back: '런처',
  // 즐겨찾기 토글
  fav_add: '즐겨찾기 추가',
  fav_remove: '즐겨찾기 해제',
  // 빈 상태
  empty_title: '아직 도구가 없습니다',
  empty_body: '도구가 추가되면 이곳에 카테고리별로 나타납니다.',
  noresult_title: '검색 결과가 없습니다',
  noresult_body: '“{{query}}”와(과) 일치하는 도구가 없습니다.',
  clear_search: '검색 지우기',
}

export type ShellStrings = typeof ko
