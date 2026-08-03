// QR 카드 드래그 재정렬 + 휴지통 삭제 — 포인터 이벤트 기반(외부 DnD 라이브러리 없음).
//
// 설계 요점 3가지:
//  1) 격자 셀 기하는 드래그 내내 고정이다(항목 수·열 수·gap 불변). 그래서 드래그 시작 시점에
//     셀 박스를 한 번만 캡처해두고, 이후엔 그 고정 격자에 대해 "중심이 가장 가까운 셀"로
//     삽입 위치를 정한다 → 실시간 미리보기가 카드를 움직여도 히트박스가 흔들리지 않아
//     경계에서 두 위치를 오가는 진동(oscillation)이 원천 차단된다.
//  2) 커밋은 드롭 시점에만 한다. 드래그 중엔 원본 entries를 건드리지 않고 previewOrder만
//     파생시킨다 → Escape 취소가 그냥 "상태 버리기"로 끝난다.
//  3) 포인터 캡처 대신 window 리스너를 쓴다. 미리보기 재정렬로 원본 카드 DOM이 자리표시자로
//     교체될 수 있어 setPointerCapture는 중간에 풀릴 수 있다.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// 마우스/펜: 이 거리만큼 움직여야 드래그 시작(클릭·버튼 조작과 구분)
const POINTER_THRESHOLD = 5
// 터치: 길게 눌러야 시작(스크롤 제스처와 구분). 그 전에 이 거리 이상 움직이면 취소.
const TOUCH_HOLD_MS = 220
const TOUCH_HOLD_SLOP = 8
// FLIP 재배치 애니메이션
const FLIP_MS = 190
const FLIP_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

interface CellBox {
  cx: number // 스크롤 컨테이너 콘텐츠 좌표계 기준 중심
  cy: number
}

export interface QrDragState {
  id: string // 끌고 있는 항목 id
  fromIndex: number // 드래그 시작 시 인덱스
  overIndex: number // 현재 삽입될 인덱스(미리보기 반영)
  overTrash: boolean // 휴지통 조준 여부
  x: number // 현재 포인터 좌표(뷰포트)
  y: number
  offsetX: number // 잡은 지점의 카드 좌상단 기준 오프셋 — 고스트가 손끝에 붙어 있게
  offsetY: number
  width: number // 고스트 크기(드래그 시작 시 카드 크기 고정)
  height: number
}

// 배열에서 from 원소를 빼내 to 위치에 끼워넣는다(shift 방식 재정렬).
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

interface Options {
  ids: readonly string[] // 현재 항목 id 배열(원본 순서)
  onReorder: (from: number, to: number) => void
  onDelete: (id: string) => void
}

export function useQrCardDrag({ ids, onReorder, onDelete }: Options) {
  const [drag, setDrag] = useState<QrDragState | null>(null)

  // ── DOM 참조 ──
  const scrollElRef = useRef<HTMLElement | null>(null) // 격자 스크롤 컨테이너
  const trashElRef = useRef<HTMLElement | null>(null) // 휴지통 영역
  const cardElsRef = useRef<Map<string, HTMLElement>>(new Map()) // id → 카드 DOM

  // ── 드래그 중에만 유효한 가변 값(리렌더 불필요) ──
  const cellsRef = useRef<CellBox[]>([]) // 드래그 시작 시 캡처한 고정 격자 중심들
  const dragRef = useRef<QrDragState | null>(null) // 최신 drag(리스너가 stale closure 없이 읽음)
  const pendingRef = useRef<{
    id: string
    index: number
    pointerId: number
    startX: number
    startY: number
    touch: boolean
    holdTimer: number | null
  } | null>(null)

  const idsRef = useRef(ids)
  idsRef.current = ids

  const setDragState = useCallback((next: QrDragState | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  // id별로 동일한 ref 콜백을 재사용한다 — 매 렌더 새 함수를 넘기면 React가 커밋마다
  // ref를 null→el로 떼었다 붙여, 드래그 중(포인터 이동마다 리렌더) 불필요한 churn이 생긴다.
  const cardRefCbsRef = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map())
  const cardRef = useCallback((id: string) => {
    let fn = cardRefCbsRef.current.get(id)
    if (!fn) {
      fn = (el: HTMLElement | null) => {
        if (el) cardElsRef.current.set(id, el)
        else cardElsRef.current.delete(id)
      }
      cardRefCbsRef.current.set(id, fn)
    }
    return fn
  }, [])

  const scrollRef = useCallback((el: HTMLElement | null) => {
    scrollElRef.current = el
  }, [])

  const trashRef = useCallback((el: HTMLElement | null) => {
    trashElRef.current = el
  }, [])

  // 포인터(뷰포트 좌표) → 삽입 인덱스. 고정 격자에 대해 중심 거리 최소인 셀을 고른다.
  // 셀 사이 gap이나 격자 바깥에서도 항상 하나가 잡히므로 데드존이 없다.
  const indexAtPoint = useCallback((x: number, y: number): number | null => {
    const scrollEl = scrollElRef.current
    const cells = cellsRef.current
    if (!scrollEl || cells.length === 0) return null
    const rect = scrollEl.getBoundingClientRect()
    const px = x - rect.left + scrollEl.scrollLeft
    const py = y - rect.top + scrollEl.scrollTop
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < cells.length; i++) {
      const dx = cells[i].cx - px
      const dy = cells[i].cy - py
      const d = dx * dx + dy * dy
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return best
  }, [])

  const isOverTrash = useCallback((x: number, y: number): boolean => {
    const el = trashElRef.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }, [])

  // ── 드래그 시작 — 현재 레이아웃에서 격자 셀 중심을 캡처하고 고스트 기하를 확정 ──
  const beginDrag = useCallback(
    (id: string, index: number, x: number, y: number) => {
      const scrollEl = scrollElRef.current
      const cardEl = cardElsRef.current.get(id)
      if (!scrollEl || !cardEl) return
      const scrollRect = scrollEl.getBoundingClientRect()
      const cells: CellBox[] = []
      for (const cid of idsRef.current) {
        const el = cardElsRef.current.get(cid)
        if (!el) return // 아직 마운트 안 된 카드가 있으면 격자 캡처가 불완전 → 드래그 포기
        const r = el.getBoundingClientRect()
        cells.push({
          cx: r.left - scrollRect.left + scrollEl.scrollLeft + r.width / 2,
          cy: r.top - scrollRect.top + scrollEl.scrollTop + r.height / 2,
        })
      }
      cellsRef.current = cells
      const cardRect = cardEl.getBoundingClientRect()
      setDragState({
        id,
        fromIndex: index,
        overIndex: index,
        overTrash: false,
        x,
        y,
        offsetX: x - cardRect.left,
        offsetY: y - cardRect.top,
        width: cardRect.width,
        height: cardRect.height,
      })
    },
    [setDragState],
  )

  const clearPending = useCallback(() => {
    const p = pendingRef.current
    if (p?.holdTimer !== null && p?.holdTimer !== undefined) window.clearTimeout(p.holdTimer)
    pendingRef.current = null
  }, [])

  // 카드에서 포인터를 눌렀을 때 — 아직 드래그 시작은 아니고 "후보"만 등록한다.
  const onCardPointerDown = useCallback(
    (id: string, index: number, e: React.PointerEvent) => {
      if (e.button !== 0) return // 좌클릭/터치/펜만
      // 카드 안의 버튼(× 삭제 · PNG 저장)은 원래 동작을 유지한다.
      // 단 그립은 "여기를 잡으라"는 표식이므로 예외 — 여기서도 드래그가 시작돼야 한다.
      const btn = (e.target as HTMLElement | null)?.closest('button')
      if (btn && !btn.classList.contains('wb-qr-grip')) return
      if (dragRef.current) return
      clearPending()
      const touch = e.pointerType === 'touch'
      pendingRef.current = {
        id,
        index,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        touch,
        holdTimer: touch
          ? window.setTimeout(() => {
              const p = pendingRef.current
              if (!p) return
              p.holdTimer = null
              beginDrag(p.id, p.index, p.startX, p.startY)
              pendingRef.current = null
            }, TOUCH_HOLD_MS)
          : null,
      }
    },
    [beginDrag, clearPending],
  )

  // ── 드래그 중 전역 리스너 ──
  // pending(임계값 대기)과 drag(진행 중) 양쪽을 한 세트로 처리한다.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pending = pendingRef.current
      if (pending && pending.pointerId === e.pointerId) {
        const dx = e.clientX - pending.startX
        const dy = e.clientY - pending.startY
        const dist = Math.hypot(dx, dy)
        if (pending.touch) {
          // 터치는 길게 누르기로만 시작 — 홀드 전에 움직이면 스크롤 의도로 보고 취소
          if (dist > TOUCH_HOLD_SLOP) clearPending()
          return
        }
        if (dist < POINTER_THRESHOLD) return
        pendingRef.current = null
        beginDrag(pending.id, pending.index, e.clientX, e.clientY)
        return
      }
      const cur = dragRef.current
      if (!cur) return
      const trash = isOverTrash(e.clientX, e.clientY)
      // 휴지통을 조준 중이면 순서 미리보기는 마지막 위치에 그대로 둔다(두 의도를 섞지 않음).
      const nextIndex = trash ? cur.overIndex : (indexAtPoint(e.clientX, e.clientY) ?? cur.overIndex)
      setDragState({ ...cur, x: e.clientX, y: e.clientY, overTrash: trash, overIndex: nextIndex })
    }

    const onUp = (e: PointerEvent) => {
      const pending = pendingRef.current
      if (pending && pending.pointerId === e.pointerId) {
        clearPending()
        return
      }
      const cur = dragRef.current
      if (!cur) return
      setDragState(null)
      cellsRef.current = []
      if (cur.overTrash) onDelete(cur.id)
      else if (cur.overIndex !== cur.fromIndex) onReorder(cur.fromIndex, cur.overIndex)
    }

    const onCancel = () => {
      clearPending()
      if (dragRef.current) {
        setDragState(null) // 취소 = 원본 순서 유지(커밋 안 함)
        cellsRef.current = []
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current) {
        e.preventDefault()
        onCancel()
      }
    }

    // 터치 드래그 중 브라우저 스크롤 차단(passive:false 필수).
    // 홀드 동안엔 움직임이 없어 스크롤이 아직 시작되지 않았으므로 여기서 막을 수 있다.
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [beginDrag, clearPending, indexAtPoint, isOverTrash, onDelete, onReorder, setDragState])

  // 드래그 중 body에 클래스 부착 — 전역 커서(grabbing) + 텍스트 선택 차단
  useEffect(() => {
    if (!drag) return
    document.body.classList.add('wb-qr-dragging')
    return () => document.body.classList.remove('wb-qr-dragging')
  }, [drag])

  // ── FLIP: 렌더 순서가 바뀐 카드들을 이전 위치에서 새 위치로 미끄러뜨린다 ──
  // 끌고 있는 카드(고스트+자리표시자)는 포인터를 따르므로 대상에서 제외한다.
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map())
  const order = drag ? moveItem(ids, drag.fromIndex, drag.overIndex) : ids
  const orderKey = order.join(' ')
  const draggingId = drag?.id ?? null

  useLayoutEffect(() => {
    const next = new Map<string, DOMRect>()
    cardElsRef.current.forEach((el, id) => next.set(id, el.getBoundingClientRect()))
    if (!prefersReducedMotion()) {
      next.forEach((rect, id) => {
        if (id === draggingId) return
        const prev = prevRectsRef.current.get(id)
        if (!prev) return
        const dx = prev.left - rect.left
        const dy = prev.top - rect.top
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
        const el = cardElsRef.current.get(id)
        if (!el) return
        el.style.transition = 'none'
        el.style.transform = `translate(${dx}px, ${dy}px)`
        requestAnimationFrame(() => {
          el.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`
          el.style.transform = ''
        })
      })
    }
    // 변환 적용 전 좌표(=최종 위치)를 저장한다 — 다음 비교의 기준점.
    prevRectsRef.current = next
  }, [orderKey, draggingId])

  return {
    drag,
    /** 미리보기가 반영된 렌더 순서(드래그 중이 아니면 원본 그대로) */
    order,
    scrollRef,
    trashRef,
    cardRef,
    onCardPointerDown,
  }
}
