// Key Generator 도구 화면 — 좌측 종류 목록 + 우측 옵션/출력.
// 모든 생성은 브라우저(Web Crypto)에서 수행되며 값은 외부로 전송되지 않는다.
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'
import { KEY_GROUPS } from './generators'
import type { KeyOutput, OptionSpec } from './types'
import { useKeyGenerator } from './useKeyGenerator'

const MONO = 'var(--wb-font-mono)'
const MUTED = 'color-mix(in srgb, var(--wb-color-text) 60%, transparent)'

export function KeyGeneratorTool() {
  const { t } = useTranslation()
  const kg = useKeyGenerator()
  const { kind } = kg

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      {/* ── 좌측: 키 종류 목록 ── */}
      <aside
        className="wb-scroll"
        style={{
          flex: 'none',
          width: 244,
          overflowY: 'auto',
          borderRight: '1px solid var(--wb-color-divider)',
          padding: '10px 10px 24px',
        }}
      >
        {KEY_GROUPS.map((group) => (
          <div key={group.id} style={{ marginTop: 12 }}>
            <div
              className="wb-text-muted"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                padding: '0 8px 6px',
              }}
            >
              {t(group.id)}
            </div>
            {group.kinds.map((k) => {
              const on = k.id === kg.selectedId
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => kg.selectKind(k.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    fontFamily: 'var(--wb-font-body)',
                    fontSize: 13.5,
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    background: on ? 'var(--wb-color-accent)' : 'transparent',
                    color: on ? 'var(--wb-color-bg)' : 'var(--wb-color-text)',
                  }}
                >
                  {t(k.nameKey)}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* ── 우측: 옵션 + 출력 ── */}
      <section
        className="wb-scroll"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 28px 60px' }}
      >
        <div style={{ maxWidth: 860 }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
            <span
              style={{
                width: 40,
                height: 40,
                flex: 'none',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid var(--wb-color-divider)',
                color: 'var(--wb-color-accent)',
              }}
            >
              <Icon icon={KeyRound} size={21} />
            </span>
            <div>
              <h2 style={{ fontSize: 20, margin: '0 0 3px', letterSpacing: '-0.01em' }}>
                {t(kind.nameKey)}
              </h2>
              <p className="wb-text-muted" style={{ fontSize: 13, margin: 0 }}>
                {t(kind.descKey)}
              </p>
            </div>
          </div>

          {/* 옵션 행 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: 14,
              marginBottom: 16,
            }}
          >
            {kind.options.map((spec) => (
              <OptionField
                key={spec.key}
                spec={spec}
                value={kg.opts[spec.key] ?? spec.def}
                onChange={(v) => kg.setOpt(spec.key, v)}
                lengthLabel={t(spec.labelKey)}
              />
            ))}

            {/* [생성]/[다시 생성] */}
            <button
              type="button"
              onClick={kg.generate}
              disabled={kg.status === 'loading'}
              className="wb-btn wb-btn-secondary"
              style={{ height: 40, gap: 7, whiteSpace: 'nowrap' }}
            >
              <Icon icon={RefreshCw} size={15} />
              {kg.result ? t('kg_regenerate') : t('kg_generate')}
            </button>
          </div>

          {/* 로컬 생성 안내(정적) */}
          <div
            className="wb-text-muted"
            style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, marginBottom: 18 }}
          >
            <span style={{ display: 'flex', color: 'var(--wb-color-accent)' }}>
              <Icon icon={ShieldCheck} size={14} />
            </span>
            {t('kg_local_note')}
          </div>

          {/* 결과 영역 */}
          {kg.status === 'loading' && (
            <p className="wb-text-muted" style={{ fontSize: 14 }}>
              {t('kg_generating')}
            </p>
          )}

          {kg.status === 'error' && (
            <p style={{ fontSize: 14, color: '#b04141' }}>{t('kg_error')}</p>
          )}

          {kg.status === 'idle' && kg.result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="wb-text-muted" style={{ fontFamily: MONO, fontSize: 12 }}>
                {kg.result.meta}
              </div>
              {kg.result.outputs.map((out, i) => (
                <OutputCard key={i} out={out} label={out.labelKey ? t(out.labelKey) : ''} />
              ))}
            </div>
          )}

          {kg.status === 'idle' && !kg.result && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '54px 20px',
              }}
            >
              <Blueprint
                style={{
                  width: 66,
                  height: 66,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--wb-color-accent)',
                  marginBottom: 18,
                }}
              >
                <Icon icon={KeyRound} size={28} />
              </Blueprint>
              <p className="wb-text-muted" style={{ fontSize: 14, margin: 0, maxWidth: 360 }}>
                {t('kg_empty')}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ── 옵션 컨트롤 1개(select / number / text) ──
interface OptionFieldProps {
  spec: OptionSpec
  value: string
  onChange: (v: string) => void
  lengthLabel: string
}

function OptionField({ spec, value, onChange, lengthLabel }: OptionFieldProps) {
  const label = (
    <span
      className="wb-text-muted"
      style={{ fontSize: 12, display: 'block', marginBottom: 5 }}
    >
      {lengthLabel}
    </span>
  )
  if (spec.type === 'select') {
    return (
      <label style={{ display: 'block' }}>
        {label}
        <select
          className="wb-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ height: 40, minWidth: 120, fontFamily: MONO, cursor: 'pointer' }}
        >
          {spec.choices?.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    )
  }
  if (spec.type === 'number') {
    return (
      <label style={{ display: 'block' }}>
        {label}
        <input
          className="wb-input"
          type="number"
          value={value}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          onChange={(e) => onChange(e.target.value)}
          style={{ height: 40, width: 96, fontFamily: MONO }}
        />
      </label>
    )
  }
  // text
  return (
    <label style={{ display: 'block' }}>
      {label}
      <input
        className="wb-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 40, minWidth: 200, fontFamily: spec.monospace ? MONO : undefined }}
      />
    </label>
  )
}

// ── 출력 카드(라벨 + 복사 + 값) ──
function OutputCard({ out, label }: { out: KeyOutput; label: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(out.value).then(() => {
      setCopied(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1200)
    })
  }, [out.value])

  const lineCount = out.value.split('\n').length
  const rows = Math.min(18, Math.max(3, lineCount))

  return (
    <Blueprint style={{ background: 'var(--wb-color-bg)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px 8px 12px',
          borderBottom: '1px solid var(--wb-color-divider)',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>{label}</span>
        <button
          type="button"
          onClick={copy}
          className="wb-btn wb-btn-ghost"
          style={{ height: 30, gap: 6, fontSize: 12 }}
        >
          <Icon icon={copied ? Check : Copy} size={14} />
          {copied ? t('kg_copied') : t('kg_copy')}
        </button>
      </div>
      <textarea
        readOnly
        value={out.value}
        rows={rows}
        onFocus={(e) => e.currentTarget.select()}
        className="wb-scroll"
        style={{
          display: 'block',
          width: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--wb-color-text)',
          resize: 'vertical',
          padding: '12px',
          fontFamily: MONO,
          fontSize: 12.5,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          outline: 'none',
        }}
      />
    </Blueprint>
  )
}
