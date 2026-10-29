import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LandingPage from './components/LandingPage.jsx'
import App from './App.jsx'
import DocChatApp from './DocChatApp.jsx'
import PolicyPage from './components/PolicyPage.jsx'
import LegalNotice from './components/LegalNotice.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MobileNotice from './components/MobileNotice.jsx'
import HowToPage from './components/HowToPage.jsx'
import FeaturesPage from './components/FeaturesPage.jsx'
import CheckPage from './components/CheckPage.jsx'
import PetTraining from './components/PetTraining.jsx'
import Vidi from './components/Vidi.jsx'
import { listen } from './lib/bridge'
import PluginChat from './components/PluginChat.jsx'
import NetStatus from './components/NetStatus.jsx'

listen() // the browser plugin, if installed, talks to the page through this

// the hosted website keeps itself on this computer (opens fast, works offline): public/sw.js
if (import.meta.env.MODE === 'netlify' && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

// Info pages have real addresses (/features, /howto) so search engines can find them.
// Old links like /#/policy, and the app pages the plugin opens (/#/app, /#/pet-training),
// keep working: an address with #/ still uses the hash router.
const Router = location.hash.startsWith('#/') ? HashRouter : BrowserRouter
// on a plain page (like the home page /) a link to /#/app only changes the # part, and the
// browser does not load a new page for that: load it, so the hash router opens the app page
if (Router === BrowserRouter) addEventListener('hashchange', () => { if (location.hash.startsWith('#/')) location.reload() })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MobileNotice />
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<ErrorBoundary name="ShowMeWise"><App /></ErrorBoundary>} />
        <Route path="/docchat" element={<DocChatApp />} />
        <Route path="/policy" element={<PolicyPage />} />
        <Route path="/legal" element={<LegalNotice />} />
        <Route path="/howto" element={<HowToPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/check" element={<CheckPage />} />
        <Route path="/pet-training" element={<PetTraining />} />
      </Routes>
      <ErrorBoundary name="Vidi"><Vidi /></ErrorBoundary>
      <PluginChat />
      <NetStatus />
    </Router>
  </StrictMode>,
)
