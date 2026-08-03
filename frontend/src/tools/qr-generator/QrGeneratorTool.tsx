// QR 코드 생성기 도구 화면 — PDA 스캔 테스트용 다중 QR 생성.
// ① 상단 고정 입력 패널 + ② 스크롤 QR 격자. 측정값/색은 design_handoff_qr_generator/README.md 기준.
// 격자의 카드는 드래그로 순서를 바꾸거나(끼워넣기) 하단 삭제 영역에 놓아 지울 수 있다.
import {
  AlertTriangle,
  Check,
  Download,
  GripVertical,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useState, type CSSProperties, type PointerEvent, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'
import { QrTrashZone } from './QrTrashZone'
import { useQrCardDrag } from './useQrCardDrag'
import { useQrGenerator, type QrEntry } from './useQrGenerator'

const MONO = 'var(--wb-font-mono)'
const MUTED_55 = 'color-mix(in srgb, var(--wb-color-text) 55%, transparent)'
// [추가]/[일괄 생성] 버튼 폭을 동일하게 고정 → 좌측 입력(input)/입력영역(textarea) 폭이 서로 일치.
const BTN_W = 108
// 삭제 영역이 떠 있는 동안 마지막 줄 카드가 가려지지 않도록 확보하는 스크롤 여유
const TRASH_CLEARANCE = 108

// 스크린리더 전용 — 순서 변경 결과를 소리로만 알린다.
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export function QrGeneratorTool() {
  const { t } = useTranslation()
  const qr = useQrGenerator()
  const [announcement, setAnnouncement] = useState('')

  const ids = useMemo(() => qr.entries.map((e) => e.id), [qr.entries])
  const byId = useMemo(() => new Map(qr.entries.map((e) => [e.id, e])), [qr.entries])

  const handleReorder = useCallback(
    (from: number, to: number) => {
      qr.moveEntry(from, to)
      setAnnouncement(t('qr_moved', { n: to + 1 }))
    },
    [qr, t],
  )

  const handleDropDelete = useCallback(
    (id: string) => {
      qr.removeEntry(id)
      setAnnouncement(t('qr_deleted'))
    },
    [qr, t],
  )

  const dnd = useQrCardDrag({ ids, onReorder: handleReorder, onDelete: handleDropDelete })
  const dragging = dnd.drag !== null

  // 격자 컨테이너 ref — 상한 측정(ResizeObserver)과 드래그 좌표 기준을 겸한다.
  // 두 콜백 모두 안정적이므로 따로 꺼내 의존성으로 쓴다(매 렌더 재부착 방지).
  const { gridRef } = qr
  const { scrollRef } = dnd
  const gridScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      gridRef(el)
      scrollRef(el)
    },
    [gridRef, scrollRef],
  )

  // 키보드 순서 변경 — 스캔 순서는 선형(#1…#N)이므로 좌/우 한 칸 이동이면 충분하다.
  const moveByKeyboard = useCallback(
    (index: number, delta: number) => {
      const to = index + delta
      if (to < 0 || to >= ids.length) return
      handleReorder(index, to)
    },
    [ids.length, handleReorder],
  )

  const draggedEntry = dnd.drag ? byId.get(dnd.drag.id) : undefined

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
            style={{ height: 40, width: BTN_W, justifyContent: 'center', gap: 6, whiteSpace: 'nowrap' }}
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
            style={{ height: 40, width: BTN_W, justifyContent: 'center', whiteSpace: 'nowrap' }}
          >
            {t('qr_bulk_add')}
          </button>
        </div>

        {/* C. 옵션/상태 행 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* trim 커스텀 체크박스(기본 ON) */}
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

      {/* ② QR 격자 영역(스크롤) — ref로 크기 측정(상한 산정) + 드래그 좌표 기준 */}
      <div
        ref={gridScrollRef}
        className="wb-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '22px 34px',
          // 삭제 영역이 떠 있는 동안엔 스크롤 여유만 늘린다(카드 위치는 그대로).
          paddingBottom: dragging ? 22 + TRASH_CLEARANCE : 22,
        }}
      >
        {qr.hasEntries ? (
          // minmax(160px,1fr): 최소 160px 보장, 남는 폭은 1fr로 확대(축소 금지)
          <div
            role="list"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 32,
              alignContent: 'start',
            }}
          >
            {dnd.order.map((id, i) => {
              const entry = byId.get(id)
              if (!entry) return null
              // 끌고 있는 카드는 격자에서 빈 등록 슬롯으로 남고, 실제 카드는 고스트로 뜬다.
              const isDragged = dnd.drag?.id === id
              return (
                <div
                  key={id}
                  role="listitem"
                  ref={dnd.cardRef(id)}
                  style={{ minWidth: 0 }}
                >
                  {isDragged ? (
                    <Blueprint className="wb-qr-slot" style={{ height: dnd.drag?.height }} aria-hidden={true} />
                  ) : (
                    <QrCard
                      entry={entry}
                      idx={i + 1}
                      total={dnd.order.length}
                      onPointerDown={(e) => dnd.onCardPointerDown(id, i, e)}
                      onMove={(delta) => moveByKeyboard(i, delta)}
                      onRemove={() => qr.removeEntry(entry.id)}
                      onDownload={() => qr.download(entry)}
                      gripLabel={t('qr_reorder')}
                      removeLabel={t('qr_remove')}
                      downloadLabel={t('qr_download')}
                      errorLabel={t('qr_error')}
                    />
                  )}
                </div>
              )
            })}
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

      {/* ③ 삭제 영역 — 드래그 중에만 격자 위에 떠오른다 */}
      {dragging && (
        <QrTrashZone
          ref={dnd.trashRef as Ref<HTMLDivElement>}
          armed={dnd.drag?.overTrash === true}
          idleLabel={t('qr_trash_idle')}
          armedLabel={t('qr_trash_armed')}
        />
      )}

      {/* ④ 손끝을 따라다니는 고스트 카드 */}
      {dnd.drag && draggedEntry && (
        <div
          className={dnd.drag.overTrash ? 'wb-qr-ghost is-doomed' : 'wb-qr-ghost'}
          style={{
            left: dnd.drag.x - dnd.drag.offsetX,
            top: dnd.drag.y - dnd.drag.offsetY,
            width: dnd.drag.width,
          }}
          aria-hidden={true}
        >
          <QrCard
            entry={draggedEntry}
            idx={dnd.drag.overIndex + 1}
            total={dnd.order.length}
            gripLabel={t('qr_reorder')}
            removeLabel={t('qr_remove')}
            downloadLabel={t('qr_download')}
            errorLabel={t('qr_error')}
          />
        </div>
      )}

      {/* 순서 변경/삭제 결과 알림(스크린리더 전용) */}
      <span role="status" aria-live="polite" style={SR_ONLY}>
        {announcement}
      </span>
    </div>
  )
}

interface QrCardProps {
  entry: QrEntry
  idx: number // 1부터 시작하는 순번(스캔 순서 식별)
  total: number
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void
  onMove?: (delta: -1 | 1) => void
  onRemove?: () => void
  onDownload?: () => void
  gripLabel: string
  removeLabel: string
  downloadLabel: string
  errorLabel: string
}

// 격자 셀 1개 — 그립 + 헤더 바 / 흰 바탕 QR 이미지 영역 / 라벨 + 다운로드 바.
function QrCard({
  entry,
  idx,
  total,
  onPointerDown,
  onMove,
  onRemove,
  onDownload,
  gripLabel,
  removeLabel,
  downloadLabel,
  errorLabel,
}: QrCardProps) {
  const url = typeof entry.dataUrl === 'string' ? entry.dataUrl : null // 완료 시 PNG data URL
  const loading = entry.dataUrl === null
  const error = entry.dataUrl === false
  const done = url !== null

  return (
    <Blueprint
      className="wb-qr-card"
      onPointerDown={onPointerDown}
      style={{ display: 'flex', flexDirection: 'column', background: 'var(--wb-color-bg)' }}
    >
      {/* 헤더 바: 그립 + #순번 + 개별 삭제(×) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px 6px 5px',
          borderBottom: '1px solid var(--wb-color-divider)',
        }}
      >
        {/* 그립 — 드래그 가능함을 알리는 표식이자 키보드 순서 변경의 진입점(←/→ 한 칸) */}
        <button
          type="button"
          className="wb-qr-grip"
          title={gripLabel}
          aria-label={`${gripLabel} — ${idx}/${total}`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              onMove?.(-1)
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              onMove?.(1)
            }
          }}
          style={{
            width: 20,
            height: 26,
            flex: 'none',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'grab',
          }}
        >
          <Icon icon={GripVertical} size={14} />
        </button>
        <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED_55 }}>#{idx}</span>
        <div style={{ flex: 1 }} />
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
        {done && (
          <img
            src={url}
            alt={entry.text}
            draggable={false} // 네이티브 이미지 드래그가 포인터 드래그를 가로채지 않게
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        )}
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
              color: 'var(--wb-color-danger)',
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
