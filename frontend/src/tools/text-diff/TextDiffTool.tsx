// Text Diff 도구 화면 — 상단 두 입력(Original/Changed) + 하단 좌우 나란히 diff.
// 줄 단위 정렬 + 변경 줄 내부 문자 단위 강조. 계산은 useTextDiff(jsdiff)에서.
import { ArrowLeftRight, Check, GitCompare, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'
import type { DiffRow, Seg } from './useTextDiff'
import { useTextDiff } from './useTextDiff'

const MONO = 'var(--wb-font-mono)'
// diff 시맨틱 컬러(저채도 오버레이 — 라이트/다크 공통)
const DEL_BG = 'rgba(198,64,64,0.10)'
const DEL_HI = 'rgba(198,64,64,0.30)'
const ADD_BG = 'rgba(52,160,96,0.12)'
const ADD_HI = 'rgba(52,160,96,0.32)'

export function TextDiffTool() {
  const { t } = useTranslation()
  const d = useTextDiff()

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* ── 컨트롤 바 ── */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          padding: '12px 34px',
          borderBottom: '1px solid var(--wb-color-divider)',
        }}
      >
        {/* 공백 무시 토글 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={d.ignoreWs}
            onChange={(e) => d.setIgnoreWs(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>{t('td_ignore_ws')}</span>
        </label>

        <button
          type="button"
          onClick={d.swap}
          disabled={!d.hasInput}
          className="wb-btn wb-btn-ghost"
          style={{ height: 32, gap: 6, fontSize: 13 }}
        >
          <Icon icon={ArrowLeftRight} size={14} />
          {t('td_swap')}
        </button>
        <button
          type="button"
          onClick={d.clear}
          disabled={!d.hasInput}
          className="wb-btn wb-btn-ghost"
          style={{ height: 32, gap: 6, fontSize: 13 }}
        >
          <Icon icon={Trash2} size={14} />
          {t('td_clear')}
        </button>

        <div style={{ flex: 1 }} />

        {/* 통계 */}
        {d.hasInput && (
          <div style={{ display: 'flex', gap: 10, fontFamily: MONO, fontSize: 12.5 }}>
            <span style={{ color: '#2f9a5e' }}>+{d.stats.added}</span>
            <span style={{ color: '#c64040' }}>−{d.stats.removed}</span>
            <span style={{ color: 'var(--wb-color-accent)' }}>~{d.stats.modified}</span>
          </div>
        )}
      </div>

      {/* ── 입력(좌우) ── */}
      <div
        style={{
          flex: 'none',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: '14px 34px',
          height: 220,
          borderBottom: '1px solid var(--wb-color-divider)',
        }}
      >
        {[
          { label: t('td_original'), ph: t('td_original_ph'), value: d.left, set: d.setLeft },
          { label: t('td_changed'), ph: t('td_changed_ph'), value: d.right, set: d.setRight },
        ].map((col, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span className="wb-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              {col.label}
            </span>
            <textarea
              className="wb-input wb-scroll"
              value={col.value}
              onChange={(e) => col.set(e.target.value)}
              placeholder={col.ph}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: 0,
                resize: 'none',
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre',
                overflow: 'auto',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── diff 결과 ── */}
      <div className="wb-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!d.hasInput ? (
          <EmptyState text={t('td_empty')} />
        ) : d.identical ? (
          <IdenticalState text={t('td_identical')} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '46px 1fr 46px 1fr',
              fontFamily: MONO,
              fontSize: 12.5,
              lineHeight: 1.5,
              alignItems: 'stretch',
            }}
          >
            {d.rows.map((r, i) => (
              <Row key={i} r={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// diff 행 1개 = 4개 셀(좌측 줄번호/내용 · 우측 줄번호/내용)을 그리드에 흘려보낸다.
function Row({ r }: { r: DiffRow }) {
  const leftBg = r.type === 'del' || r.type === 'mod' ? DEL_BG : 'transparent'
  const rightBg = r.type === 'add' || r.type === 'mod' ? ADD_BG : 'transparent'
  return (
    <>
      <Gutter no={r.leftNo} bg={leftBg} />
      <Content segs={r.left} bg={leftBg} hiColor={DEL_HI} />
      <Gutter no={r.rightNo} bg={rightBg} divider />
      <Content segs={r.right} bg={rightBg} hiColor={ADD_HI} />
    </>
  )
}

function Gutter({ no, bg, divider }: { no: number | null; bg: string; divider?: boolean }) {
  return (
    <div
      style={{
        background: bg,
        color: 'color-mix(in srgb, var(--wb-color-text) 40%, transparent)',
        textAlign: 'right',
        padding: '1px 8px',
        userSelect: 'none',
        borderLeft: divider ? '1px solid var(--wb-color-divider)' : undefined,
      }}
    >
      {no ?? ''}
    </div>
  )
}

function Content({ segs, bg, hiColor }: { segs: Seg[]; bg: string; hiColor: string }) {
  return (
    <div
      style={{
        background: bg,
        padding: '1px 10px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {segs.map((s, i) =>
        s.hi ? (
          <span key={i} style={{ background: hiColor }}>
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '64px 20px',
      }}
    >
      <Blueprint
        style={{
          width: 68,
          height: 68,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--wb-color-accent)',
          marginBottom: 18,
        }}
      >
        <Icon icon={GitCompare} size={28} />
      </Blueprint>
      <p className="wb-text-muted" style={{ fontSize: 14, margin: 0, maxWidth: 360 }}>
        {text}
      </p>
    </div>
  )
}

function IdenticalState({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        padding: '54px 20px',
        color: '#2f9a5e',
        fontSize: 14,
      }}
    >
      <Icon icon={Check} size={18} />
      {text}
    </div>
  )
}
