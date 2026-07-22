// Key Generator 상태 관리 — 선택된 키 종류 · 종류별 옵션 · 비동기 생성(경쟁 방지).
// 단순 키는 선택/옵션 변경 시 자동 생성, 키쌍(무거운 비동기)은 명시적 [생성]만 실행한다.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ALL_KINDS, kindById, PAIRS_GROUP } from './generators'
import type { GenResult, KeyKind } from './types'

type Status = 'idle' | 'loading' | 'error'

function defaultsFor(kind: KeyKind): Record<string, string> {
  const o: Record<string, string> = {}
  for (const spec of kind.options) o[spec.key] = spec.def
  return o
}

export function useKeyGenerator() {
  const [selectedId, setSelectedId] = useState<string>(ALL_KINDS[0].id)
  const [optsByKind, setOptsByKind] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {}
    for (const k of ALL_KINDS) init[k.id] = defaultsFor(k)
    return init
  })
  const [result, setResult] = useState<GenResult | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  const runRef = useRef(0) // 진행 중 생성 식별(늦게 끝난 이전 요청 무시)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const kind = kindById(selectedId) ?? ALL_KINDS[0]
  const currentOpts = optsByKind[selectedId]

  // 실제 생성 실행(경쟁 조건 가드 포함)
  const runGenerate = useCallback((k: KeyKind, kopts: Record<string, string>) => {
    const runId = ++runRef.current
    setStatus('loading')
    k.generate(kopts)
      .then((r) => {
        if (!mountedRef.current || runId !== runRef.current) return
        setResult(r)
        setStatus('idle')
      })
      .catch(() => {
        if (!mountedRef.current || runId !== runRef.current) return
        setResult(null)
        setStatus('error')
      })
  }, [])

  // 선택/옵션 변경 → 단순 키는 자동 생성, 키쌍은 결과를 비우고 대기
  useEffect(() => {
    const k = kindById(selectedId)
    if (!k) return
    if (k.group === PAIRS_GROUP) {
      runRef.current++ // 진행 중 자동 생성 무효화
      setResult(null)
      setStatus('idle')
      return
    }
    runGenerate(k, currentOpts)
  }, [selectedId, currentOpts, runGenerate])

  // 명시적 [생성]/[다시 생성] — 키쌍 생성 및 단순 키 재추첨에 사용
  const generate = useCallback(() => {
    const k = kindById(selectedId)
    if (!k) return
    runGenerate(k, optsByKind[selectedId])
  }, [selectedId, optsByKind, runGenerate])

  const selectKind = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const setOpt = useCallback((key: string, value: string) => {
    setOptsByKind((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], [key]: value },
    }))
  }, [selectedId])

  return {
    kind,
    selectedId,
    opts: currentOpts,
    result,
    status,
    isPair: kind.group === PAIRS_GROUP,
    selectKind,
    setOpt,
    generate,
  }
}
