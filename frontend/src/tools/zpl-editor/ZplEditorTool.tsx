// ZPL 에디터 최상위 뷰 — 툴바 / (캔버스 또는 미리보기 · 코드 패널 · 속성 패널) / 상태바 + 다이얼로그.
import { useTranslation } from 'react-i18next'
import { EditorStage } from './canvas/EditorStage'
import { CodePanel } from './CodePanel'
import { PropertiesPanel } from './PropertiesPanel'
import { StatusBar } from './StatusBar'
import { Toolbar } from './Toolbar'
import { SetupDialog } from './dialogs/SetupDialog'
import { ImportDialog } from './dialogs/ImportDialog'
import { TableInsertDialog } from './dialogs/TableInsertDialog'
import { useZplEditor } from './useZplEditor'

export function ZplEditorTool() {
  const { t } = useTranslation()
  const api = useZplEditor(t)
  const { z } = api

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Toolbar api={api} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <EditorStage api={api} />
        {z.codeOpen && <CodePanel api={api} />}
        <PropertiesPanel api={api} />
      </div>

      <StatusBar api={api} />

      {z.setupOpen && <SetupDialog api={api} />}
      {z.importOpen && <ImportDialog api={api} />}
      {z.tableDialog && <TableInsertDialog api={api} />}
    </div>
  )
}
