// QR 생성기 상태 관리 — 항목 목록 + 비동기 인코딩 큐 + 반응형 상한(cap) 산정.
// README "State Management" / "Interactions & Behavior"의 로직을 React 훅으로 재구현.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { encodeQrToDataUrl } from './qr-encode'

// dataUrl: null = 로딩중, string = 완료(PNG data URL), false = 인코딩 실패
export interface QrEntry {
  id: string
  text: string
  dataUrl: string | null | false
}

// ── 반응형 상한 산정 상수(README _measure) ──
const CELL_W = 160 // 카드 최소 폭
const CELL_H = 236 // 대략적 카드 높이(헤더 + QR + 라벨)
const GAP = 16 // 격자 gap
const PAD_X = 68 // 격자 영역 좌우 padding 34*2
const PAD_Y = 44 // 격자 영역 상하 padding 22*2
const INITIAL_CAP = 12 // 측정 전 초기값

export function useQrGenerator() {
  const [entries, setEntries] = useState<QrEntry[]>([])
  const [single, setSingle] = useState('')
  const [bulk, setBulk] = useState('')
  const [trim, setTrim] = useState(false)
  const [qrCap, setQrCap] = useState(INITIAL_CAP)
  const [lastOverflow, setLastOverflow] = useState(0)

  const seqRef = useRef(1) // id 시퀀스(q1, q2, …)
  const pendingRef = useRef<Set<string>>(new Set()) // 진행 중 인코딩(중복 생성 방지)
  const mountedRef = useRef(true) // 언마운트 후 setState 방지
  const gridElRef = useRef<HTMLDivElement | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  // ── 항목 추가 + 상한 처리 (README _addTexts) ──
  // 남은 자리(room)만큼만 받고, 넘친 개수는 lastOverflow로 기록(경고 배너 문구용).
  // 실제 추가된 개수를 반환한다(호출부가 성공 시에만 입력창을 비우도록).
  const addTexts = useCallback(
    (texts: string[]): number => {
      const room = Math.max(0, qrCap - entries.length)
      const take = texts.slice(0, room)
      // 상한이 꽉 차 아무것도 못 넣으면 no-op: 입력 보존 + 기존 at_cap 안내 유지(overflow 미갱신).
      // (비활성화된 [추가]/[일괄 생성] 버튼과 동일한 결과 — Enter로 우회해도 입력이 사라지지 않게)
      if (take.length === 0) return 0
      const overflow = texts.length - take.length
      const add: QrEntry[] = take.map((text) => ({
        id: 'q' + seqRef.current++,
        text,
        dataUrl: null,
      }))
      setLastOverflow(overflow)
      setEntries((prev) => [...prev, ...add])
      return take.length
    },
    [entries, qrCap],
  )

  // ── 한 줄 추가 (README addSingle) ──
  const addSingle = useCallback(() => {
    let t = single
    if (trim) t = t.trim()
    if (t.length === 0) return // 빈 값 무시
    if (addTexts([t]) > 0) setSingle('') // 실제 추가됐을 때만 입력창 비움
  }, [single, trim, addTexts])

  // ── 일괄 생성 (README addBulk): 줄 분리 → (trim) → 빈 줄 무시 ──
  const addBulk = useCallback(() => {
    const lines = bulk
      .split('\n')
      .map((l) => (trim ? l.trim() : l))
      .filter((l) => l.length > 0)
    if (lines.length === 0) return
    if (addTexts(lines) > 0) setBulk('') // 실제 추가됐을 때만 입력창 비움
  }, [bulk, trim, addTexts])

  // Enter 키 = [추가]와 동일(기본 폼 제출 방지).
  // isComposing 가드: 한글 등 IME 조합 확정용 Enter는 무시한다 — 확정 문자가 아직
  // single state에 반영되기 전이라, 여기서 추가하면 마지막 글자가 누락/절단된다.
  const onSingleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault()
        addSingle()
      }
    },
    [addSingle],
  )

  const toggleTrim = useCallback(() => setTrim((v) => !v), [])

  // 개별 삭제 — 해당 id만 제거, 경고 배너 리셋
  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setLastOverflow(0)
  }, [])

  // 전체 삭제 — 진행 중 집합 비우고 항목/오버플로우 리셋
  const clearAll = useCallback(() => {
    pendingRef.current = new Set()
    setEntries([])
    setLastOverflow(0)
  }, [])

  // 다운로드 — dataUrl(PNG)로 <a download> 클릭을 프로그래매틱 트리거
  const download = useCallback((entry: QrEntry) => {
    if (typeof entry.dataUrl !== 'string') return
    // 파일명 안전화: 유니코드 글자/숫자와 . _ - 는 보존(한글도 그대로 → 파일명이 서로 구분됨),
    // 그 외 문자는 '_'. 코드포인트 단위로 40자 컷(서로게이트 분리 방지), 남는 게 없으면 'qr'.
    const cleaned = (entry.text || 'qr').replace(/[^\p{L}\p{N}._-]+/gu, '_')
    const safe = Array.from(cleaned).slice(0, 40).join('') || 'qr'
    const a = document.createElement('a')
    a.href = entry.dataUrl
    a.download = 'qr_' + safe + '.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [])

  // ── 비동기 인코딩 큐 (README _pump/_genQR) ──
  // dataUrl==null 이고 진행 중이 아닌 항목을 인코딩. setTimeout(0)으로 미뤄
  // 로딩 상태가 먼저 렌더되게 하고, 대량 추가 시 UI 프리즈를 완화한다.
  useEffect(() => {
    entries.forEach((e) => {
      if (e.dataUrl === null && !pendingRef.current.has(e.id)) {
        pendingRef.current.add(e.id)
        window.setTimeout(() => {
          let result: string | false
          try {
            result = encodeQrToDataUrl(e.text)
          } catch {
            result = false // 인코딩 실패 → 에러 카드
          }
          pendingRef.current.delete(e.id)
          if (!mountedRef.current) return
          setEntries((prev) =>
            prev.map((x) => (x.id === e.id ? { ...x, dataUrl: result } : x)),
          )
        }, 0)
      }
    })
  }, [entries])

  // ── 반응형 상한 측정 (README _measure) ──
  const measure = useCallback(() => {
    const el = gridElRef.current
    if (!el) return
    const w = el.clientWidth - PAD_X
    const h = el.clientHeight - PAD_Y
    if (w <= 0 || h <= 0) return
    const cols = Math.max(1, Math.floor((w + GAP) / (CELL_W + GAP)))
    const rows = Math.max(1, Math.floor((h + GAP) / (CELL_H + GAP)))
    const cap = Math.max(1, cols * rows)
    setQrCap((prev) => (prev === cap ? prev : cap))
  }, [])

  // 격자 스크롤 컨테이너 ref 콜백 — ResizeObserver 부착/해제 + 즉시 1회 측정
  const gridRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) {
        if (roRef.current) {
          roRef.current.disconnect()
          roRef.current = null
        }
        gridElRef.current = null
        return
      }
      gridElRef.current = el
      if (!roRef.current && typeof ResizeObserver !== 'undefined') {
        roRef.current = new ResizeObserver(() => measure())
        roRef.current.observe(el)
      }
      measure()
    },
    [measure],
  )

  // 마운트 플래그 + 언마운트 시 ResizeObserver 정리
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (roRef.current) {
        roRef.current.disconnect()
        roRef.current = null
      }
    }
  }, [])

  // ── 파생값 ──
  const atCap = entries.length >= qrCap
  const hasEntries = entries.length > 0
  const capAlertVisible = atCap || lastOverflow > 0

  return {
    // 상태
    entries,
    single,
    bulk,
    trim,
    qrCap,
    lastOverflow,
    // 파생
    atCap,
    hasEntries,
    capAlertVisible,
    // setter/핸들러
    setSingle,
    setBulk,
    onSingleKeyDown,
    addSingle,
    addBulk,
    toggleTrim,
    clearAll,
    removeEntry,
    download,
    gridRef,
  }
}
