import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { DbProvider } from './components/DbProvider'
import { CaptureProvider } from './context/CaptureContext'
import App from './App.jsx'
import './index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <DbProvider>
        <CaptureProvider>
          <App />
        </CaptureProvider>
      </DbProvider>
    </BrowserRouter>
  </StrictMode>,
)
