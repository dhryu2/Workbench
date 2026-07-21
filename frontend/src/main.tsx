import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/config' // i18next 초기화(사이드이펙트)
import './index.css'
import App from './App.tsx'
import { WorkbenchProvider } from './lib/workbench-context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WorkbenchProvider>
        <App />
      </WorkbenchProvider>
    </BrowserRouter>
  </StrictMode>,
)
