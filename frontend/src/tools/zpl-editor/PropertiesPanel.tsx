// 속성 패널(우측 300px) — 선택 요소 타입별 필드/세그/토글 + 표/셀 편집.
import { BoxSelect, ChevronUp, TableCellsMerge, TableCellsSplit, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Blueprint } from '../../components/Blueprint'
import { Icon } from '../../lib/icons'
import {
  AreaField,
  Checkbox,
  NumberField,
  Note,
  Segment,
  SectionLabel,
  SelectField,
  TextField,
  Toggle,
  WarnBox,
  InfoBox,
} from './shared'
import type {
  BarcodeElement,
  BorderableElement,
  ImageElement,
  QrElement,
  TableCell,
  TableElement,
  TextElement,
} from './types'
import type { ZplEditorApi } from './useZplEditor'

const MONO = 'var(--wb-font-mono)'
const DELETE_RED = '#8a3a3a'
const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent || '')

// 얇은 라벨(border 필드용)
function NarrowNumber({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)', marginBottom: 6 }}>{label}</span>
      <input className="wb-input" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 130, height: 34, fontFamily: MONO, fontSize: 13 }} />
    </div>
  )
}

export function PropertiesPanel({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { z, selEl, selCellObj, cellMergeInfo } = api
  const count = z.els.length

  return (
    <div style={{ flex: 'none', width: 300, borderLeft: '1px solid var(--wb-color-divider)', background: 'var(--wb-color-bg)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 헤더 */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--wb-color-divider)' }}>
        <span style={{ fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 14 }}>{t('z_props')}</span>
        <span className="wb-text-muted" style={{ fontSize: 11 }}>{t('z_elements', { count })}</span>
      </div>

      <div className="wb-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!selEl ? (
          <EmptyState />
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 공통 상단 행: 타입 태그 + Delete */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--wb-color-divider)' }}>
              <span className="wb-tag wb-tag-accent">{selCellObj ? t('z_type_cell') : t('z_type_' + selEl.type)}</span>
              <button type="button" onClick={api.deleteSel} className="wb-btn wb-btn-ghost" style={{ gap: 6, fontSize: 13, color: DELETE_RED }}>
                <Icon icon={Trash2} size={14} />
                {t('z_delete')}
              </button>
            </div>

            {selEl.type === 'table' && z.selCell ? (
              <CellPanel api={api} table={selEl} cell={selCellObj as TableCell} info={cellMergeInfo} />
            ) : selEl.type === 'table' ? (
              <TablePanel api={api} table={selEl} />
            ) : (
              <ElementPanel api={api} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '54px 24px' }}>
      <Blueprint style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', color: 'var(--wb-color-accent)', marginBottom: 16 }}>
        <Icon icon={BoxSelect} size={22} />
      </Blueprint>
      <h3 style={{ fontSize: 14, margin: '0 0 6px', fontFamily: 'var(--wb-font-heading)' }}>{t('z_no_sel_title')}</h3>
      <p className="wb-text-muted" style={{ fontSize: 12, margin: 0, maxWidth: 200 }}>{t('z_no_sel')}</p>
    </div>
  )
}

// ── 일반 요소(비-표) 패널 ──
function ElementPanel({ api }: { api: ZplEditorApi }) {
  const { t } = useTranslation()
  const { selEl } = api
  if (!selEl || selEl.type === 'table') return null
  const set = (key: string, numeric?: boolean) => (v: string) => api.setField(key, v, numeric)
  const S = (v: number | string) => String(v)

  const base: ReactNode[] = []
  // 타입별 기본 필드
  if (selEl.type === 'text') {
    const e = selEl as TextElement
    base.push(
      <AreaField key="text" label={t('z_fld_content')} value={S(e.text)} onChange={set('text')} />,
      <Note key="ascii">{t('z_ascii_note')}</Note>,
      <NumberField key="font" label={t('z_fld_font')} value={S(e.font)} onChange={set('font', true)} />,
      <NumberField key="fontW" label={t('z_fontw')} value={S(e.fontW)} onChange={set('fontW', true)} />,
      <Checkbox key="block" label={t('z_text_block')} checked={e.block !== false} onChange={() => api.setField('block', e.block === false)} />,
      ...(e.block === false
        ? []
        : [
            <NumberField key="w" label={t('z_fld_w')} value={S(e.w)} onChange={set('w', true)} />,
            <NumberField key="maxLines" label={t('z_maxlines')} value={S(e.maxLines)} onChange={set('maxLines', true)} />,
          ]),
      <NumberField key="x" label={t('z_fld_x')} value={S(e.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(e.y)} onChange={set('y', true)} />,
    )
  } else if (selEl.type === 'barcode') {
    const e = selEl as BarcodeElement
    base.push(
      <TextField key="data" label={t('z_fld_data')} value={S(e.data)} onChange={set('data')} />,
      <Note key="ascii">{t('z_bc_charset_' + e.bcType)}</Note>,
      <NumberField key="module" label={t('z_module')} value={S(e.module)} onChange={set('module', true)} />,
      <NumberField key="h" label={t('z_fld_h')} value={S(e.h)} onChange={set('h', true)} />,
      <NumberField key="x" label={t('z_fld_x')} value={S(e.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(e.y)} onChange={set('y', true)} />,
    )
  } else if (selEl.type === 'qr') {
    const e = selEl as QrElement
    base.push(
      <TextField key="data" label={t('z_fld_data')} value={S(e.data)} onChange={set('data')} />,
      <Note key="ascii">{t('z_ascii_note')}</Note>,
      <NumberField key="mag" label={t('z_mag_step')} value={S(e.mag)} onChange={set('mag', true)} />,
      <NumberField key="x" label={t('z_fld_x')} value={S(e.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(e.y)} onChange={set('y', true)} />,
    )
  } else if (selEl.type === 'image') {
    const e = selEl as ImageElement
    base.push(
      <NumberField key="w" label={t('z_fld_w')} value={S(e.w)} onChange={set('w', true)} />,
      <NumberField key="h" label={t('z_fld_h')} value={S(e.h)} onChange={set('h', true)} />,
      <NumberField key="x" label={t('z_fld_x')} value={S(e.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(e.y)} onChange={set('y', true)} />,
    )
  } else if (selEl.type === 'box' || selEl.type === 'ellipse') {
    base.push(
      <NumberField key="x" label={t('z_fld_x')} value={S(selEl.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(selEl.y)} onChange={set('y', true)} />,
      <NumberField key="w" label={t('z_fld_w')} value={S(selEl.w)} onChange={set('w', true)} />,
      <NumberField key="h" label={t('z_fld_h')} value={S(selEl.h)} onChange={set('h', true)} />,
      <NumberField key="t" label={t('z_fld_thick')} value={S(selEl.t)} onChange={set('t', true)} />,
    )
  } else if (selEl.type === 'circle') {
    base.push(
      <NumberField key="x" label={t('z_fld_x')} value={S(selEl.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(selEl.y)} onChange={set('y', true)} />,
      <NumberField key="d" label={t('z_diameter')} value={S(selEl.d)} onChange={set('d', true)} />,
      <NumberField key="t" label={t('z_fld_thick')} value={S(selEl.t)} onChange={set('t', true)} />,
    )
  } else if (selEl.type === 'line') {
    base.push(
      <NumberField key="x" label={t('z_fld_x')} value={S(selEl.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(selEl.y)} onChange={set('y', true)} />,
      <NumberField key="len" label={t('z_fld_len')} value={S(selEl.len)} onChange={set('len', true)} />,
      <NumberField key="t" label={t('z_fld_thick')} value={S(selEl.t)} onChange={set('t', true)} />,
    )
  } else if (selEl.type === 'diagonal') {
    base.push(
      <NumberField key="x" label={t('z_fld_x')} value={S(selEl.x)} onChange={set('x', true)} />,
      <NumberField key="y" label={t('z_fld_y')} value={S(selEl.y)} onChange={set('y', true)} />,
      <NumberField key="w" label={t('z_fld_w')} value={S(selEl.w)} onChange={set('w', true)} />,
      <NumberField key="h" label={t('z_fld_h')} value={S(selEl.h)} onChange={set('h', true)} />,
      <NumberField key="t" label={t('z_fld_thick')} value={S(selEl.t)} onChange={set('t', true)} />,
    )
  }

  const rotatable = selEl.type === 'text' || selEl.type === 'barcode' || selEl.type === 'qr' || selEl.type === 'image'
  const verify = selEl.type === 'qr' || selEl.type === 'image'
  const rot = 'rot' in selEl ? selEl.rot : 0

  return (
    <>
      {base}

      {/* 타입별 회전-전 컨트롤 */}
      {selEl.type === 'barcode' && (
        <>
          <SelectField
            label={t('z_bctype')}
            value={selEl.bcType}
            options={[
              { value: 'code128', label: 'Code 128' },
              { value: 'code39', label: 'Code 39' },
              { value: 'ean13', label: 'EAN-13' },
              { value: 'upca', label: 'UPC-A' },
            ]}
            onChange={(v) => api.setField('bcType', v)}
          />
          <Checkbox label={t('z_hri')} checked={selEl.hri} onChange={() => api.toggleField('hri')} />
          <InfoBox>{t('z_bc_fit')}</InfoBox>
          {(selEl.bcType === 'ean13' || selEl.bcType === 'upca') && <WarnBox>{t('z_bc_approx')}</WarnBox>}
        </>
      )}
      {selEl.type === 'qr' && (
        <SelectField label={t('z_ecc')} value={selEl.ecc} options={['L', 'M', 'Q', 'H'].map((o) => ({ value: o, label: o }))} onChange={(v) => api.setField('ecc', v)} />
      )}
      {selEl.type === 'image' && <ImageControls api={api} el={selEl} />}
      {selEl.type === 'line' && (
        <Segment
          label={t('z_dir')}
          options={[
            { key: 'h', label: t('z_dir_h'), on: selEl.dir === 'h', onClick: () => api.setField('dir', 'h') },
            { key: 'v', label: t('z_dir_v'), on: selEl.dir === 'v', onClick: () => api.setField('dir', 'v') },
          ]}
        />
      )}
      {selEl.type === 'diagonal' && (
        <Segment
          label={t('z_dir')}
          options={[
            { key: 'L', label: '＼ L', on: selEl.dir === 'L', onClick: () => api.setField('dir', 'L') },
            { key: 'R', label: '／ R', on: selEl.dir === 'R', onClick: () => api.setField('dir', 'R') },
          ]}
        />
      )}

      {/* 회전(+ qr/image 검증 경고) */}
      {rotatable && (
        <>
          <Segment
            label={t('z_rotation')}
            options={[0, 90, 180, 270].map((r) => ({ key: String(r), label: r + '°', on: rot === r, onClick: () => api.setField('rot', r, true) }))}
          />
          {verify && <WarnBox>{t('z_verify')}</WarnBox>}
        </>
      )}

      {/* 텍스트 수평 정렬(회전 뒤) */}
      {selEl.type === 'text' && selEl.block !== false && (
        <Segment
          label={t('z_align')}
          options={(['L', 'C', 'R', 'J'] as const).map((a) => ({ key: a, label: a, on: (selEl as TextElement).align === a, onClick: () => api.setField('align', a) }))}
        />
      )}

      {/* 합성 테두리 */}
      {(selEl.type === 'text' || selEl.type === 'barcode' || selEl.type === 'qr' || selEl.type === 'image') && (
        <BorderSection api={api} el={selEl} />
      )}
    </>
  )
}

function ImageControls({ api, el }: { api: ZplEditorApi; el: ImageElement }) {
  const { t } = useTranslation()
  return (
    <>
      <label className="wb-zpl-iconbtn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, border: '1px solid var(--wb-color-accent)', color: 'var(--wb-color-accent)', cursor: 'pointer', fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 13 }}>
        <Icon icon={Upload} size={15} />
        {t('z_upload')}
        <input type="file" accept="image/*" onChange={api.imgUpload} style={{ display: 'none' }} />
      </label>
      <div>
        <span style={{ display: 'block', fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)', marginBottom: 6 }}>
          {t('z_threshold')} · {el.threshold}
        </span>
        <input className="wb-zpl-range" type="range" min={0} max={255} value={el.threshold} onChange={(e) => api.setField('threshold', e.target.value, true)} />
      </div>
      <Checkbox label={t('z_dither')} checked={el.dither} onChange={() => api.toggleField('dither')} />
      <Checkbox label={t('z_free')} checked={el.free} onChange={() => api.toggleField('free')} />
    </>
  )
}

function BorderSection({ api, el }: { api: ZplEditorApi; el: BorderableElement }) {
  const { t } = useTranslation()
  const b = el.border
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4, borderTop: '1px solid var(--wb-color-divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 14 }}>{t('z_border')}</span>
        <Toggle checked={b.on} onChange={api.toggleBorder} label={t('z_border')} />
      </div>
      {b.on && (
        <>
          <NarrowNumber label={t('z_bthick')} value={String(b.t)} onChange={(v) => api.setField('border.t', v, true)} />
          <NarrowNumber label={t('z_bpad')} value={String(b.pad)} onChange={(v) => api.setField('border.pad', v, true)} />
          <Note>{t('z_synthetic')}</Note>
        </>
      )}
    </div>
  )
}

// ── 표 전체 패널 ──
function TablePanel({ api, table }: { api: ZplEditorApi; table: TableElement }) {
  const { t } = useTranslation()
  const set = (key: string) => (v: string) => api.setField(key, v, true)
  return (
    <>
      <div style={{ fontFamily: 'var(--wb-font-heading)', fontWeight: 600, fontSize: 14 }}>
        {table.rows.length} × {table.cols.length}
      </div>
      <NumberField label={t('z_fld_x')} value={String(table.x)} onChange={set('x')} />
      <NumberField label={t('z_fld_y')} value={String(table.y)} onChange={set('y')} />
      <NumberField label={t('z_default_pad')} value={String(table.pad)} onChange={set('pad')} />
      <NumberField label={t('z_table_thick')} value={String(table.t)} onChange={set('t')} />

      <SectionLabel>{t('z_cols')}</SectionLabel>
      {table.cols.map((w, i) => (
        <RowField key={'c' + i} label={`${t('z_col_w')} ${i + 1}`} value={String(w)} onChange={(v) => api.setColW(i, v)} />
      ))}

      <SectionLabel>{t('z_rows')}</SectionLabel>
      {table.rows.map((h, i) => (
        <RowField key={'r' + i} label={`${t('z_row_h')} ${i + 1}`} value={String(h)} onChange={(v) => api.setRowH(i, v)} />
      ))}
    </>
  )
}

// 라벨(좌, flex:1) + 96px 입력(우) 한 줄.
function RowField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1, fontSize: 13, color: 'color-mix(in srgb, var(--wb-color-text) 72%, transparent)' }}>{label}</span>
      <input className="wb-input" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 96, height: 34, fontFamily: MONO, fontSize: 13 }} />
    </div>
  )
}

// ── 표 셀 패널 ──
function CellPanel({ api, table, cell, info }: { api: ZplEditorApi; table: TableElement; cell: TableCell; info: { isMerged: boolean; canMerge: boolean; blocked: boolean } }) {
  const { t } = useTranslation()
  const padVal = cell.pad != null ? cell.pad : table.pad
  return (
    <>
      {/* 표 전체 선택 */}
      <button type="button" onClick={api.selectTableWhole} className="wb-btn wb-btn-secondary" style={{ justifyContent: 'flex-start', gap: 8, height: 40, fontSize: 13 }}>
        <Icon icon={ChevronUp} size={15} />
        {t('z_whole_table')}
      </button>

      {/* 콘텐츠 타입 */}
      <SelectField
        label={t('z_cell_type')}
        value={cell.type}
        options={[
          { value: 'text', label: t('z_text') },
          { value: 'qr', label: t('z_qr') },
          { value: 'barcode', label: t('z_barcode') },
          { value: 'empty', label: t('z_cell_empty') },
        ]}
        onChange={(v) => api.setCellType(v as TableCell['type'])}
      />

      {/* 타입별 필드 */}
      {cell.type === 'text' && (
        <>
          <AreaField label={t('z_fld_content')} value={String(cell.text ?? '')} onChange={(v) => api.setCellField('text', v)} />
          <Note>{t('z_ascii_note')}</Note>
          <NumberField label={t('z_fld_font')} value={String(cell.font ?? 30)} onChange={(v) => api.setCellField('font', v, true)} />
        </>
      )}
      {cell.type === 'qr' && (
        <>
          <TextField label={t('z_fld_data')} value={String(cell.data ?? '')} onChange={(v) => api.setCellField('data', v)} />
          <Note>{t('z_ascii_note')}</Note>
          <NumberField label={t('z_mag_step')} value={String(cell.mag ?? 4)} onChange={(v) => api.setCellField('mag', v, true)} />
        </>
      )}
      {cell.type === 'barcode' && (
        <>
          <TextField label={t('z_fld_data')} value={String(cell.data ?? '')} onChange={(v) => api.setCellField('data', v)} />
          <Note>{t('z_ascii_note')}</Note>
        </>
      )}

      {/* 정렬(Empty 제외) */}
      {cell.type !== 'empty' && (
        <>
          <Segment
            label={t('z_align')}
            options={(['L', 'C', 'R'] as const).map((a) => ({ key: a, label: a, on: (cell.halign || 'L') === a, onClick: () => api.setCellField('halign', a) }))}
          />
          <Segment
            label={t('z_valign')}
            options={[
              { key: 'top', label: t('z_valign_top'), on: (cell.valign || 'mid') === 'top', onClick: () => api.setCellField('valign', 'top') },
              { key: 'mid', label: t('z_valign_mid'), on: (cell.valign || 'mid') === 'mid', onClick: () => api.setCellField('valign', 'mid') },
              { key: 'bot', label: t('z_valign_bot'), on: (cell.valign || 'mid') === 'bot', onClick: () => api.setCellField('valign', 'bot') },
            ]}
          />
        </>
      )}

      {/* 셀 패딩 */}
      <NumberField label={t('z_cell_pad')} value={String(padVal)} onChange={(v) => api.setCellField('pad', v, true)} />

      {/* 병합/분할 */}
      {info.isMerged && (
        <button type="button" onClick={api.splitCell} className="wb-btn wb-btn-secondary" style={{ gap: 8, height: 40, fontSize: 13 }}>
          <Icon icon={TableCellsSplit} size={15} />
          {t('z_split')}
        </button>
      )}
      {info.canMerge && (
        <button type="button" onClick={api.mergeCells} className="wb-btn wb-btn-primary" style={{ gap: 8, height: 40, fontSize: 13 }}>
          <Icon icon={TableCellsMerge} size={15} />
          {t('z_merge')}
        </button>
      )}
      {info.blocked && <WarnBox>{t('z_merge_blocked')}</WarnBox>}

      {/* 힌트 */}
      <Note>{t('z_multi_hint', { mod: IS_MAC ? '⌘' : 'Ctrl' })}</Note>
    </>
  )
}
