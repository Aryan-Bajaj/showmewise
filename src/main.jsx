import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LandingPage from './components/LandingPage.jsx'
import App from './App.jsx'
import DocChatApp from './DocChatApp.jsx'
import PolicyPage from './components/PolicyPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MobileNotice from './components/MobileNotice.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MobileNotice />
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<ErrorBoundary name="VideoDoc"><App /></ErrorBoundary>} />
        <Route path="/docchat" element={<DocChatApp />} />
        <Route path="/policy" element={<PolicyPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
