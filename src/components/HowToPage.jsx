import { useEffect } from 'react'
import ShowMeWiseLogo from './ShowMeWiseLogo'
import MarkedShot from './MarkedShot'
import { HOWTO } from '../lib/howto'
import { OnlineBadge } from './NetStatus'

// How to use ShowMeWise, step by step, with real screenshots of the app and
// numbered pins. The text comes from lib/howto.js, which Vidi answers from too.
const C = { bg: '#0f0b24', card: 'rgba(22,15,46,0.94)', line: 'rgba(167,139,250,0.22)', ink: '#f1eeff', body: 'rgba(241,238,255,0.88)', dim: 'rgba(236,233,255,0.55)', acc: '#a78bfa' }

export default function HowToPage() {
  useEffect(() => {
    document.title = 'ShowMeWise · How to use'
    // /howto#export (and the old /#/howto#export) opens that part
    const id = window.location.hash.split('#').filter((p) => p && !p.startsWith('/'))[0]
    if (!id) { window.scrollTo(0, 0); return }
    // pictures above the part load late and push it down, so scroll again until they are in
    // (stops as soon as the reader scrolls by hand)
    let stop = false
    const halt = () => { stop = true }
    addEventListener('wheel', halt, { once: true }); addEventListener('touchstart', halt, { once: true }); addEventListener('keydown', halt, { once: true })
    const go = (behavior) => { if (!stop) document.getElementById(id)?.scrollIntoView({ behavior }) }
    const timers = [setTimeout(() => go('smooth'), 300), ...[1500, 3000, 5000].map((ms) => setTimeout(() => go('auto'), ms))]
    return () => { timers.forEach(clearTimeout); removeEventListener('wheel', halt); removeEventListener('touchstart', halt); removeEventListener('keydown', halt) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: C.bg, color: C.ink, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" }}>
      <div className="app-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,11,36,0.92)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.ink, fontWeight: 700 }}>
            <ShowMeWiseLogo size={26} /> ShowMeWise
          </a>
          <span style={{ color: C.dim, fontSize: 13 }}>· How to use</span>
          <OnlineBadge />
          <a href="/#/app" style={{ marginLeft: 'auto', color: '#fff', fontSize: 13, textDecoration: 'none', padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#6d4aff,#3f62ff)' }}>Open the app</a>
        </div>
      </nav>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 22px 80px' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>How to use ShowMeWise</h1>
        <p style={{ color: C.body, fontSize: '1.05rem', lineHeight: 1.7, margin: '0 0 22px', maxWidth: 760 }}>
          From a screen recording to a finished guide in eight steps. The pictures are the real app; the numbers on each picture match the list below it. Questions? Ask Vidi, the helper at the bottom right.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
          {HOWTO.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }) }}
              style={{ fontSize: 13, color: C.ink, textDecoration: 'none', padding: '7px 14px', borderRadius: 100, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.03)' }}>{s.title.replace(/^\d+\.\s*/, '')}</a>
          ))}
        </div>

        {HOWTO.map((s) => (
          <section key={s.id} id={s.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '24px 26px', marginBottom: 18, scrollMarginTop: 80 }}>
            <h2 style={{ fontSize: '1.3rem', margin: '0 0 10px' }}>{s.title}</h2>
            <ul style={{ margin: 0, paddingLeft: 20, color: C.body, lineHeight: 1.7, listStyle: 'disc' }}>
              {s.body.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
            </ul>
            <div style={{ color: C.body, lineHeight: 1.6 }}><MarkedShot section={s} /></div>
          </section>
        ))}

        <p style={{ color: C.dim, fontSize: 13, marginTop: 28 }}>
          See also <a href="/policy" style={{ color: C.acc }}>Privacy, terms and credits</a>.
        </p>
      </main>
      </div>
    </div>
  )
}
