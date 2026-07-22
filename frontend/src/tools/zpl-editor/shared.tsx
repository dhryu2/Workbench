// ZPL 에디터 속성/다이얼로그 공용 입력 프리미티브 — 색·간격은 var(--wb-*) 토큰만 사용.
import type { ChangeEvent, ReactNode } from 'react'
import { Icon } from '../../lib/icons'
import { AlertCircle, Check } from 'lucide-react'

const MONO = 'var(--wb-font-mono)'
const HEADING = 'var(--wb-font-heading)'
const LABEL_COLOR = 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)'

const labelStyle = { display: 'block', fontSize: 13, color: LABEL_COLOR, marginBottom: 6 } as const

// 라벨 + 임의 입력 컨테이너
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

// 숫자/문자 입력(모노, 34px). blur/입력 시 파싱은 상위 핸들러가 담당.
export function TextField({ label, value, onChange, mono = true }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <Field label={label}>
      <input
        className="wb-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 34, fontFamily: mono ? MONO : 'inherit', fontSize: 13 }}
      />
    </Field>
  )
}

export function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <input
        className="wb-input"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 34, fontFamily: MONO, fontSize: 13 }}
      />
    </Field>
  )
}

export function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <textarea
        className="wb-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{ minHeight: 76, resize: 'vertical', fontFamily: MONO, fontSize: 13, lineHeight: 1.4 }}
      />
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
}
export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: SelectOption[]; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <select className="wb-input wb-zpl-select" value={value} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)} style={{ height: 34, fontSize: 13 }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export interface SegOption {
  key: string
  label: string
  on: boolean
  onClick: () => void
}
// 세그먼트(정렬/방향/회전/단위/모드). 컨테이너 border + 옵션 flex:1.
export function Segment({ label, options }: { label?: string; options: SegOption[] }) {
  return (
    <div>
      {label && <span style={labelStyle}>{label}</span>}
      <div style={{ display: 'flex', border: '1px solid var(--wb-color-divider)' }}>
        {options.map((o, i) => (
          <button
            key={o.key}
            type="button"
            onClick={o.onClick}
            className={'wb-zpl-seg-opt' + (o.on ? ' on' : '')}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 4px',
              fontFamily: HEADING,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              border: 'none',
              borderLeft: i > 0 ? '1px solid var(--wb-color-divider)' : 'none',
              background: o.on ? 'var(--wb-color-accent)' : 'transparent',
              color: o.on ? 'var(--wb-color-bg)' : 'var(--wb-color-text)',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// 18×18 체크박스(HRI/Dither/Free).
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'var(--wb-color-text)',
        fontSize: 13,
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          border: '1px solid ' + (checked ? 'var(--wb-color-accent)' : 'color-mix(in srgb, var(--wb-color-text) 35%, transparent)'),
          background: checked ? 'var(--wb-color-accent)' : 'transparent',
          color: 'var(--wb-color-bg)',
        }}
      >
        {checked && <Icon icon={Check} size={13} />}
      </span>
      {label}
    </button>
  )
}

// 36×20 토글 스위치(Border on/off).
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        position: 'relative',
        width: 36,
        height: 20,
        flex: 'none',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        background: checked ? 'var(--wb-color-accent)' : 'color-mix(in srgb, var(--wb-color-text) 22%, transparent)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--wb-color-bg)',
          boxShadow: 'var(--wb-shadow-sm)',
          transition: 'left .15s',
        }}
      />
    </button>
  )
}

// 액센트 정보 박스(예: 바코드 폭 자동 안내).
export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        background: 'color-mix(in srgb, var(--wb-color-text) 5%, transparent)',
        border: '1px solid var(--wb-color-divider)',
        fontSize: 13,
        color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)',
      }}
    >
      <span style={{ display: 'flex', flex: 'none', color: 'var(--wb-color-accent-700)' }}>
        <Icon icon={AlertCircle} size={16} />
      </span>
      <span>{children}</span>
    </div>
  )
}

// 경고(노랑) 박스 — qr/image 회전 등 펌웨어 편차 안내.
export function WarnBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        background: 'color-mix(in srgb, #caa14a 20%, transparent)',
        border: '1px solid color-mix(in srgb, #caa14a 55%, transparent)',
        fontSize: 13,
        color: '#8a6d3a',
      }}
    >
      <span style={{ display: 'flex', flex: 'none' }}>
        <Icon icon={AlertCircle} size={16} />
      </span>
      <span>{children}</span>
    </div>
  )
}

// 작은 안내 문구(합성 border 등).
export function Note({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 12, color: 'color-mix(in srgb, var(--wb-color-text) 50%, transparent)' }}>{children}</p>
}

// 소제목(COLUMNS/ROWS) — 10px uppercase muted.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--wb-color-text) 45%, transparent)', marginTop: 4 }}>
      {children}
    </div>
  )
}
