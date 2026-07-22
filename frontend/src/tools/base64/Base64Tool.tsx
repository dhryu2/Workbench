// Base64 Encoder 도구 화면 — 좌측 입력(텍스트/파일 드롭) · 우측 출력.
// 상단에서 인코딩/디코딩 모드와 URL-safe 변형을 전환한다.
import { AlertTriangle, Check, Copy, Download, FileUp, Trash2, X } from 'lucide-react'
import { useCallback, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../lib/icons'
import { useBase64 } from './useBase64'

const MONO = 'var(--wb-font-mono)'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function Base64Tool() {
  const { t } = useTranslation()
  const b = useBase64()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(b.output).then(() => {
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1200)
    })
  }, [b.output])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      if (b.mode !== 'encode') return
      const file = e.dataTransfer.files?.[0]
      if (file) void b.loadFile(file)
    },
    [b],
  )

  const isFile = b.source.kind === 'file'

  const modeBtn = (m: 'encode' | 'decode', label: string) => {
    const on = b.mode === m
    return (
      <button
        type="button"
        onClick={() => b.setMode(m)}
        style={{
          height: 34,
          padding: '0 16px',
          fontFamily: 'var(--wb-font-body)',
          fontSize: 13,
          cursor: 'pointer',
          border: '1px solid var(--wb-color-accent)',
          background: on ? 'var(--wb-color-accent)' : 'transparent',
          color: on ? 'var(--wb-color-bg)' : 'var(--wb-color-accent)',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* ── 컨트롤 바 ── */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '12px 34px',
          borderBottom: '1px solid var(--wb-color-divider)',
        }}
      >
        {/* 모드 세그먼트 */}
        <div style={{ display: 'flex' }}>
          {modeBtn('encode', t('b64_encode'))}
          {modeBtn('decode', t('b64_decode'))}
        </div>

        {/* URL-safe 토글 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={b.urlSafe} onChange={(e) => b.setUrlSafe(e.target.checked)} />
          <span style={{ fontSize: 13 }}>{t('b64_urlsafe')}</span>
        </label>

        {b.mode === 'encode' && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="wb-btn wb-btn-ghost"
            style={{ height: 32, gap: 6, fontSize: 13 }}
          >
            <Icon icon={FileUp} size={14} />
            {t('b64_load_file')}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void b.loadFile(file)
            e.target.value = '' // 같은 파일 재선택 허용
          }}
        />

        <button
          type="button"
          onClick={b.clear}
          className="wb-btn wb-btn-ghost"
          style={{ height: 32, gap: 6, fontSize: 13 }}
        >
          <Icon icon={Trash2} size={14} />
          {t('b64_clear')}
        </button>

        <div style={{ flex: 1 }} />
        <span className="wb-text-muted" style={{ fontFamily: MONO, fontSize: 12 }}>
          {t('b64_bytes', { n: b.inputBytes })}
        </span>
      </div>

      {/* ── 입력 / 출력 ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: '14px 34px 22px',
        }}
      >
        {/* 입력 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <span className="wb-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
            {t('b64_input')}
          </span>
          {isFile && b.source.kind === 'file' ? (
            // 파일 소스 카드
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                border: '1px solid var(--wb-color-divider)',
                textAlign: 'center',
                padding: 20,
              }}
            >
              <Icon icon={FileUp} size={26} />
              <div style={{ fontFamily: MONO, fontSize: 13, wordBreak: 'break-all' }}>
                {b.source.name}
                <div className="wb-text-muted" style={{ marginTop: 4 }}>
                  {formatBytes(b.source.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={b.clear}
                className="wb-btn wb-btn-ghost"
                style={{ height: 30, gap: 6, fontSize: 12 }}
              >
                <Icon icon={X} size={13} />
                {t('b64_remove_file')}
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                if (b.mode === 'encode') {
                  e.preventDefault()
                  setDragOver(true)
                }
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}
            >
              <textarea
                className="wb-input wb-scroll"
                value={b.source.kind === 'text' ? b.source.text : ''}
                onChange={(e) => b.setText(e.target.value)}
                placeholder={b.mode === 'encode' ? t('b64_encode_ph') : t('b64_decode_ph')}
                spellCheck={false}
                style={{
                  flex: 1,
                  minHeight: 0,
                  resize: 'none',
                  fontFamily: MONO,
                  fontSize: 13,
                  lineHeight: 1.5,
                  outline: dragOver ? '2px dashed var(--wb-color-accent)' : undefined,
                }}
              />
              {dragOver && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--wb-color-accent-100)',
                    color: 'var(--wb-color-accent-800)',
                    fontSize: 14,
                    pointerEvents: 'none',
                  }}
                >
                  {t('b64_drop')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 출력 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <span className="wb-text-muted" style={{ fontSize: 12 }}>
              {t('b64_output')}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {b.canDownload && (
                <button
                  type="button"
                  onClick={b.downloadDecoded}
                  className="wb-btn wb-btn-ghost"
                  style={{ height: 28, gap: 5, fontSize: 12 }}
                >
                  <Icon icon={Download} size={13} />
                  {t('b64_download')}
                </button>
              )}
              <button
                type="button"
                onClick={copy}
                disabled={!b.hasOutput}
                className="wb-btn wb-btn-ghost"
                style={{ height: 28, gap: 5, fontSize: 12 }}
              >
                <Icon icon={copied ? Check : Copy} size={13} />
                {copied ? t('b64_copied') : t('b64_copy')}
              </button>
            </div>
          </div>

          {b.error ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                border: '1px solid var(--wb-color-divider)',
                color: '#b04141',
                fontSize: 14,
                textAlign: 'center',
                padding: 20,
              }}
            >
              <Icon icon={AlertTriangle} size={20} />
              {t('b64_error')}
            </div>
          ) : (
            <textarea
              className="wb-input wb-scroll"
              readOnly
              value={b.output}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                minHeight: 0,
                resize: 'none',
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 1.5,
                background: 'var(--wb-color-bg)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
