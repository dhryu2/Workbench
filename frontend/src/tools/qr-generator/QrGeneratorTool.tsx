// QR 코드 생성기 도구 화면 — PDA 스캔 테스트용 다중 QR 생성.
// ① 상단 고정 입력 패널 + ② 스크롤 QR 격자. 측정값/색은 design_handoff_qr_generator/README.md 기준.
import {
  AlertTriangle,
  Check,
  Download,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'
import { useQrGenerator, type QrEntry } from './useQrGenerator'

const MONO = 'var(--wb-font-mono)'
const MUTED_55 = 'color-mix(in srgb, var(--wb-color-text) 55%, transparent)'

export function QrGeneratorTool() {
  const { t } = useTranslation()
  const qr = useQrGenerator()

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* ① 입력 패널(상단 고정) */}
      <div
        style={{
          flex: 'none',
          padding: '20px 34px',
          borderBottom: '1px solid var(--wb-color-divider)',
          display: 'flex',
          flexDirection: 'column',
          gap: 13,
        }}
      >
        {/* A. 한 줄 입력 행 — Enter = [추가] */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <input
            className="wb-input"
            value={qr.single}
            onChange={(e) => qr.setSingle(e.target.value)}
            onKeyDown={qr.onSingleKeyDown}
            placeholder={t('qr_single_ph')}
            style={{ flex: 1, height: 40, fontFamily: MONO }}
          />
          <button
            type="button"
            onClick={qr.addSingle}
            disabled={qr.atCap}
            className="wb-btn wb-btn-secondary"
            style={{ height: 40, gap: 6, whiteSpace: 'nowrap' }}
          >
            <Icon icon={Plus} size={15} />
            {t('qr_add')}
          </button>
        </div>

        {/* B. 여러 줄 입력 행 — 각 줄이 QR 하나(빈 줄 무시) */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            className="wb-input"
            value={qr.bulk}
            onChange={(e) => qr.setBulk(e.target.value)}
            placeholder={t('qr_bulk_ph')}
            rows={3}
            style={{ flex: 1, minHeight: 76, resize: 'vertical', fontFamily: MONO, lineHeight: 1.5 }}
          />
          <button
            type="button"
            onClick={qr.addBulk}
            disabled={qr.atCap}
            className="wb-btn wb-btn-secondary"
            style={{ height: 40, whiteSpace: 'nowrap' }}
          >
            {t('qr_bulk_add')}
          </button>
        </div>

        {/* C. 옵션/상태 행 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* trim 커스텀 체크박스(기본 OFF) */}
          <div
            role="checkbox"
            aria-checked={qr.trim}
            tabIndex={0}
            onClick={qr.toggleTrim}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                qr.toggleTrim()
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                flex: 'none',
                display: 'grid',
                placeItems: 'center',
                border:
                  '1px solid ' +
                  (qr.trim
                    ? 'var(--wb-color-accent)'
                    : 'color-mix(in srgb, var(--wb-color-text) 35%, transparent)'),
                background: qr.trim ? 'var(--wb-color-accent)' : 'transparent',
                color: 'var(--wb-color-bg)',
              }}
            >
              {qr.trim && <Icon icon={Check} size={13} />}
            </span>
            <span style={{ fontSize: 13 }}>{t('qr_trim')}</span>
          </div>

          {/* 스펙 캡션 — 스캔 안정성 규칙 상기(정적) */}
          <span className="wb-text-muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'flex', color: 'var(--wb-color-accent)' }}>
              <Icon icon={ShieldCheck} size={14} />
            </span>
            {t('qr_spec')}
          </span>

          {/* 스페이서 */}
          <div style={{ flex: 1 }} />

          {/* 개수 카운터 */}
          <span
            style={{
              fontFamily: 'var(--wb-font-heading)',
              fontWeight: 600,
              fontSize: 13,
              color: 'color-mix(in srgb, var(--wb-color-text) 65%, transparent)',
            }}
          >
            {t('qr_count', { n: qr.entries.length, cap: qr.qrCap })}
          </span>

          {/* 전체 삭제(항목 0개면 비활성) */}
          <button
            type="button"
            onClick={qr.clearAll}
            disabled={!qr.hasEntries}
            className="wb-btn wb-btn-ghost"
            style={{ height: 34, gap: 6, fontSize: 13 }}
          >
            <Icon icon={Trash2} size={14} />
            {t('qr_clear_all')}
          </button>
        </div>

        {/* D. 상한 경고 배너(조건부) */}
        {qr.capAlertVisible && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 12px',
              background: 'var(--wb-color-accent-100)',
              border: '1px solid var(--wb-color-accent)',
              color: 'var(--wb-color-accent-800)',
              fontSize: 13,
            }}
          >
            <span style={{ display: 'flex', flex: 'none', color: 'var(--wb-color-accent-700)' }}>
              <Icon icon={AlertTriangle} size={16} />
            </span>
            <span>{qr.lastOverflow > 0 ? t('qr_overflow', { n: qr.lastOverflow }) : t('qr_at_cap')}</span>
          </div>
        )}
      </div>

      {/* ② QR 격자 영역(스크롤) — ref로 크기 측정(상한 산정) */}
      <div
        ref={qr.gridRef}
        className="wb-scroll"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 34px' }}
      >
        {qr.hasEntries ? (
          // minmax(160px,1fr): 최소 160px 보장, 남는 폭은 1fr로 확대(축소 금지)
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 16,
              alignContent: 'start',
            }}
          >
            {qr.entries.map((entry, i) => (
              <QrCard
                key={entry.id}
                entry={entry}
                idx={i + 1}
                onRemove={() => qr.removeEntry(entry.id)}
                onDownload={() => qr.download(entry)}
                removeLabel={t('qr_remove')}
                downloadLabel={t('qr_download')}
                errorLabel={t('qr_error')}
              />
            ))}
          </div>
        ) : (
          // 빈 상태(항목 0개)
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
                width: 72,
                height: 72,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--wb-color-accent)',
                marginBottom: 20,
              }}
            >
              <Icon icon={QrCode} size={30} />
            </Blueprint>
            <h3 style={{ fontSize: 20, margin: '0 0 6px' }}>{t('qr_empty_title')}</h3>
            <p className="wb-text-muted" style={{ fontSize: 14, margin: 0, maxWidth: 400 }}>
              {t('qr_empty_body')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface QrCardProps {
  entry: QrEntry
  idx: number // 1부터 시작하는 순번(스캔 순서 식별)
  onRemove: () => void
  onDownload: () => void
  removeLabel: string
  downloadLabel: string
  errorLabel: string
}

// 격자 셀 1개 — 헤더 바 / 흰 바탕 QR 이미지 영역 / 라벨 + 다운로드 바.
function QrCard({ entry, idx, onRemove, onDownload, removeLabel, downloadLabel, errorLabel }: QrCardProps) {
  const url = typeof entry.dataUrl === 'string' ? entry.dataUrl : null // 완료 시 PNG data URL
  const loading = entry.dataUrl === null
  const error = entry.dataUrl === false
  const done = url !== null

  return (
    <Blueprint style={{ display: 'flex', flexDirection: 'column', background: 'var(--wb-color-bg)' }}>
      {/* 헤더 바: #순번 + 개별 삭제(×) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px 6px 10px',
          borderBottom: '1px solid var(--wb-color-divider)',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED_55 }}>#{idx}</span>
        <button
          type="button"
          onClick={onRemove}
          title={removeLabel}
          aria-label={removeLabel}
          className="wb-qr-iconbtn"
          style={{
            width: 26,
            height: 26,
            flex: 'none',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: MUTED_55,
          }}
        >
          <Icon icon={X} size={15} />
        </button>
      </div>

      {/* QR 이미지 영역 — 흰 바탕은 quiet zone 대비 필수 */}
      <div style={{ background: '#ffffff', padding: 14, display: 'grid', placeItems: 'center' }}>
        {done && <img src={url} alt={entry.text} style={{ width: '100%', height: 'auto', display: 'block' }} />}
        {loading && (
          <div
            aria-hidden={true} // 로딩 '…'은 장식 — SR에는 숨김(완료/실패만 인식되게)
            style={{
              width: '100%',
              aspectRatio: '1',
              display: 'grid',
              placeItems: 'center',
              color: 'color-mix(in srgb, #000000 35%, transparent)',
              fontSize: 12,
              fontFamily: 'var(--wb-font-body)',
            }}
          >
            …
          </div>
        )}
        {error && (
          <div
            role="img"
            aria-label={errorLabel} // 실패 카드를 라벨된 이미지로 인식(SR이 실패 사유를 읽음)
            style={{
              width: '100%',
              aspectRatio: '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 10,
              textAlign: 'center',
              color: '#8a3a3a',
              fontSize: 12,
              fontFamily: 'var(--wb-font-body)',
            }}
          >
            <span style={{ display: 'flex' }}>
              <Icon icon={AlertTriangle} size={16} />
            </span>
            {errorLabel}
          </div>
        )}
      </div>

      {/* 라벨 + 다운로드 바 — 원본 텍스트 2줄 클램프(전문은 title 툴팁) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '9px 10px',
          borderTop: '1px solid var(--wb-color-divider)',
        }}
      >
        <span
          title={entry.text}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: MONO,
            fontSize: 12,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '2.9em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {entry.text}
        </span>
        <button
          type="button"
          onClick={onDownload}
          disabled={!done}
          title={downloadLabel}
          aria-label={downloadLabel}
          className="wb-qr-iconbtn"
          style={{
            width: 28,
            height: 28,
            flex: 'none',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: '1px solid var(--wb-color-divider)',
            background: 'transparent',
            cursor: done ? 'pointer' : 'not-allowed',
            color: 'var(--wb-color-accent)',
            opacity: done ? 1 : 0.45,
          }}
        >
          <Icon icon={Download} size={14} />
        </button>
      </div>
    </Blueprint>
  )
}
