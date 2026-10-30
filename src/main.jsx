import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { DbProvider } from './components/DbProvider'
import { CaptureProvider } from './context/CaptureContext'
import App from './App.jsx'
import { initInstallPrompt } from './lib/install'
import { applyTextSize } from './lib/textSize'
import { ToastProvider } from './components/Toast'
import RecurringRunner from './components/RecurringRunner'
import './index.css'

// 설정에서 고른 글씨 크기를 첫 화면부터 적용
applyTextSize()

// Windows PC에서는 SUIT가 흐릿하게 보여 또렷한 맑은 고딕으로 (폰은 SUIT 그대로)
if (/Windows/i.test(navigator.userAgent)) document.documentElement.classList.add('os-windows')

initInstallPrompt()

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <DbProvider>
        <CaptureProvider>
          <ToastProvider>
            <App />
            <RecurringRunner />
          </ToastProvider>
        </CaptureProvider>
      </DbProvider>
    </BrowserRouter>
  </StrictMode>,
)
