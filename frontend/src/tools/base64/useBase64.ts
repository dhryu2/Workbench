// Base64 Encoder 상태 관리 — 텍스트/파일 → Base64 인코딩, Base64 → 텍스트 디코딩.
// 표준·URL-safe 변형 지원. 모든 처리는 브라우저에서 수행된다.
import { useCallback, useMemo, useState } from 'react'

export type Mode = 'encode' | 'decode'

// 입력 소스 — 텍스트 또는 업로드된 파일(디코드는 텍스트만).
export type Source =
  | { kind: 'text'; text: string }
  | { kind: 'file'; name: string; size: number; bytes: Uint8Array }

// ── base64 헬퍼(도구 국소) ──
function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// 표준/URL-safe · 패딩 유무 모두 허용. 유효하지 않으면 throw.
function decodeB64(s: string): Uint8Array {
  const t = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (t.length % 4 === 1) throw new Error('invalid base64 length')
  const padded = t + '='.repeat((4 - (t.length % 4)) % 4)
  const bin = atob(padded) // 유효하지 않은 문자 → 예외
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

interface Computed {
  output: string
  error: boolean
  outputBytes: number
  inputBytes: number
  decoded: Uint8Array | null // 디코드 결과 바이트(파일 저장용)
}

function compute(mode: Mode, source: Source, urlSafe: boolean): Computed {
  if (mode === 'encode') {
    const bytes =
      source.kind === 'file' ? source.bytes : new TextEncoder().encode(source.text)
    return {
      output: urlSafe ? toBase64Url(bytes) : toBase64(bytes),
      error: false,
      inputBytes: bytes.length,
      outputBytes: 0,
      decoded: null,
    }
  }
  // decode — 소스는 항상 텍스트(base64 문자열)
  const text = source.kind === 'text' ? source.text : ''
  if (text.trim().length === 0) {
    return { output: '', error: false, inputBytes: 0, outputBytes: 0, decoded: null }
  }
  try {
    const bytes = decodeB64(text)
    return {
      output: new TextDecoder().decode(bytes),
      error: false,
      inputBytes: text.length,
      outputBytes: bytes.length,
      decoded: bytes,
    }
  } catch {
    return { output: '', error: true, inputBytes: text.length, outputBytes: 0, decoded: null }
  }
}

export function useBase64() {
  const [mode, setModeRaw] = useState<Mode>('encode')
  const [urlSafe, setUrlSafe] = useState(false)
  const [source, setSource] = useState<Source>({ kind: 'text', text: '' })

  const { output, error, inputBytes, outputBytes, decoded } = useMemo(
    () => compute(mode, source, urlSafe),
    [mode, source, urlSafe],
  )

  const setText = useCallback((text: string) => setSource({ kind: 'text', text }), [])

  const setMode = useCallback((m: Mode) => {
    setModeRaw(m)
    // 디코드는 파일 소스를 지원하지 않음 → 텍스트로 리셋
    if (m === 'decode') setSource((s) => (s.kind === 'file' ? { kind: 'text', text: '' } : s))
  }, [])

  const loadFile = useCallback(async (file: File) => {
    const buf = await file.arrayBuffer()
    setSource({ kind: 'file', name: file.name, size: file.size, bytes: new Uint8Array(buf) })
  }, [])

  const clear = useCallback(() => setSource({ kind: 'text', text: '' }), [])

  // 디코드 결과를 파일로 저장
  const downloadDecoded = useCallback(() => {
    if (!decoded) return
    const blob = new Blob([decoded as BlobPart], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'decoded.bin'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [decoded])

  return {
    mode,
    setMode,
    urlSafe,
    setUrlSafe,
    source,
    setText,
    loadFile,
    clear,
    output,
    error,
    inputBytes,
    outputBytes,
    hasOutput: output.length > 0,
    canDownload: mode === 'decode' && decoded !== null && decoded.length > 0,
    downloadDecoded,
  }
}
