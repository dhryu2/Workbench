// 라우팅 — 셸(AppShell)이 레이아웃 라우트, 그 안에서 URL로 런처/도구 프레임이 바뀐다.
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LauncherPage } from './pages/LauncherPage'
import { ToolFramePage } from './pages/ToolFramePage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LauncherPage />} />
        <Route path="/tools/:toolId" element={<ToolFramePage />} />
        {/* 알 수 없는 경로 → 런처 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
