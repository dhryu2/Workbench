// Text Diff 상태 관리 — 두 입력을 줄 단위로 비교하고, 변경된 줄은 문자 단위로 재대조해
// 좌우 나란히(split) 행 모델을 만든다. 라이브러리: jsdiff(diffLines/diffWordsWithSpace).
import { diffLines, diffWords, diffWordsWithSpace } from 'diff'
import { useMemo, useState } from 'react'

export type RowType = 'equal' | 'add' | 'del' | 'mod'

// 셀 내부 조각 — hi=true 이면 변경 강조.
export interface Seg {
  text: string
  hi: boolean
}

export interface DiffRow {
  type: RowType
  leftNo: number | null
  rightNo: number | null
  left: Seg[]
  right: Seg[]
}

export interface DiffStats {
  added: number
  removed: number
  modified: number
  changed: number // add+del+mod 합(= 변경 행 수)
}

// 블록 문자열을 줄 배열로. 마지막 개행으로 생기는 빈 원소는 제거.
function linesOf(v: string): string[] {
  const parts = v.split('\n')
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()
  return parts
}

// 변경된 한 쌍의 줄을 문자(단어) 단위로 대조해 좌/우 조각으로 분해.
function wordSegs(oldLine: string, newLine: string, ignoreWs: boolean): { left: Seg[]; right: Seg[] } {
  const parts = ignoreWs ? diffWords(oldLine, newLine) : diffWordsWithSpace(oldLine, newLine)
  const left: Seg[] = []
  const right: Seg[] = []
  for (const p of parts) {
    if (p.added) right.push({ text: p.value, hi: true })
    else if (p.removed) left.push({ text: p.value, hi: true })
    else {
      left.push({ text: p.value, hi: false })
      right.push({ text: p.value, hi: false })
    }
  }
  return { left, right }
}

export function buildRows(a: string, b: string, ignoreWs: boolean): DiffRow[] {
  const parts = diffLines(a, b, { ignoreWhitespace: ignoreWs })
  const rows: DiffRow[] = []
  let li = 1
  let ri = 1
  let i = 0
  while (i < parts.length) {
    const part = parts[i]
    if (!part.added && !part.removed) {
      for (const line of linesOf(part.value)) {
        rows.push({
          type: 'equal',
          leftNo: li++,
          rightNo: ri++,
          left: [{ text: line, hi: false }],
          right: [{ text: line, hi: false }],
        })
      }
      i++
    } else if (part.removed) {
      const next = parts[i + 1]
      if (next && next.added) {
        // 삭제 블록 + 추가 블록 → 줄 단위로 짝지어 '변경' 행
        const dels = linesOf(part.value)
        const adds = linesOf(next.value)
        const m = Math.min(dels.length, adds.length)
        for (let k = 0; k < m; k++) {
          const seg = wordSegs(dels[k], adds[k], ignoreWs)
          rows.push({ type: 'mod', leftNo: li++, rightNo: ri++, left: seg.left, right: seg.right })
        }
        for (let k = m; k < dels.length; k++) {
          rows.push({ type: 'del', leftNo: li++, rightNo: null, left: [{ text: dels[k], hi: true }], right: [] })
        }
        for (let k = m; k < adds.length; k++) {
          rows.push({ type: 'add', leftNo: null, rightNo: ri++, left: [], right: [{ text: adds[k], hi: true }] })
        }
        i += 2
      } else {
        for (const line of linesOf(part.value)) {
          rows.push({ type: 'del', leftNo: li++, rightNo: null, left: [{ text: line, hi: true }], right: [] })
        }
        i++
      }
    } else {
      // 추가 블록(선행 삭제 없음)
      for (const line of linesOf(part.value)) {
        rows.push({ type: 'add', leftNo: null, rightNo: ri++, left: [], right: [{ text: line, hi: true }] })
      }
      i++
    }
  }
  return rows
}

export function useTextDiff() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [ignoreWs, setIgnoreWs] = useState(false)

  const hasInput = left.length > 0 || right.length > 0

  const rows = useMemo<DiffRow[]>(() => {
    if (!hasInput) return []
    return buildRows(left, right, ignoreWs)
  }, [left, right, ignoreWs, hasInput])

  const stats = useMemo<DiffStats>(() => {
    let added = 0
    let removed = 0
    let modified = 0
    for (const r of rows) {
      if (r.type === 'add') added++
      else if (r.type === 'del') removed++
      else if (r.type === 'mod') modified++
    }
    return { added, removed, modified, changed: added + removed + modified }
  }, [rows])

  // 양쪽이 비어있지 않고 완전히 동일한지(변경 0)
  const identical = hasInput && left === right

  const swap = () => {
    setLeft(right)
    setRight(left)
  }
  const clear = () => {
    setLeft('')
    setRight('')
  }

  return {
    left,
    right,
    setLeft,
    setRight,
    ignoreWs,
    setIgnoreWs,
    rows,
    stats,
    hasInput,
    identical,
    swap,
    clear,
  }
}
