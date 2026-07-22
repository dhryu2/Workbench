// 도구 id → 전용 화면 컴포넌트 레지스트리.
// 여기 등록된 도구는 ToolFramePage가 해당 컴포넌트를, 미등록 도구는 공통 placeholder를 렌더한다.
import type { ComponentType } from 'react'
import { QrGeneratorTool } from './qr-generator/QrGeneratorTool'
import { ZplEditorTool } from './zpl-editor/ZplEditorTool'

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  'qr-generator': QrGeneratorTool,
  'zpl-editor': ZplEditorTool,
}
