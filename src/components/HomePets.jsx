import { useEffect, useState } from 'react'
import { PLUGIN_URL } from '../lib/links'
import "../../extension/pet/pets.js"

// The pets on the home page: a dragon that peeks in at the bottom left and says hello,
// and a strip where the visitor picks a pet and its colour. Both lead to the plugin.
const KINDS = ['dragon', 'wolf', 'cat', 'fox', 'owl']
const NAMES = { dragon: 'Dragon', wolf: 'Wolf', cat: 'Cat', fox: 'Fox', owl: 'Owl' }

const Pet = ({ kind, colour = '', size }) => (
  <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size }}
    dangerouslySetInnerHTML={{ __html: window.VidiPets.svg(kind, colour).replace('<svg ', '<svg width="100%" height="100%" ') }} />
)

const CSS = `
.hp-hop{animation:hp-hop 2.4s ease-in-out infinite}
@keyframes hp-hop{0%,100%{transform:translateY(0)}40%,60%{transform:translateY(-12px)}}
.hp-peek{animation:hp-peek .7s cubic-bezier(.2,1.4,.4,1) both}
@keyframes hp-peek{from{transform:translateY(120%)}to{transform:translateY(0)}}
.hp-pick{transition:transform .2s}
.hp-pick:hover{transform:translateY(-6px) scale(1.06)}
@media (max-width:700px){.hp-hello{display:none!important}}
@media (prefers-reduced-motion:reduce){.hp-hop,.hp-peek{animation:none}}
`

// 1. the dragon peeks in after a few seconds; a click opens its hello, ✕ sends it away for this visit
export function PetHello() {
  const [show, setShow] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try { if (sessionStorage.getItem('hp-hello-off')) return } catch { /* private window */ }
    const t = setTimeout(() => setShow(true), 4000)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  const bye = () => { setShow(false); try { sessionStorage.setItem('hp-hello-off', '1') } catch { /* private window */ } }
  return (
    <div className="hp-hello" style={{ position: 'fixed', left: 18, bottom: 104, zIndex: 49, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <style>{CSS}</style>
      <button type="button" onClick={() => setOpen((o) => !o)} className="hp-peek" aria-label="Vidi the pet says hello"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <span className="hp-hop" style={{ display: 'inline-block' }}><Pet kind="dragon" colour="Ruby" size={70} /></span>
      </button>
      {open && (
        <div role="dialog" aria-label="Hello from Vidi" style={{ position: 'relative', width: 250, marginBottom: 30, padding: '14px 16px', borderRadius: 16, background: '#fff', color: '#1b1340', fontSize: 14, textAlign: 'left', lineHeight: 1.5, boxShadow: '0 16px 40px rgba(0,0,0,.45)' }}>
          <button type="button" onClick={bye} aria-label="Close" style={{ position: 'absolute', right: 8, top: 6, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#6b6385' }}>✕</button>
          <b>Hi! I'm Vidi. 👋</b><br />I can sit on every website, explain the page and show you where to click.
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {PLUGIN_URL && <a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ padding: '7px 12px', borderRadius: 100, background: 'linear-gradient(135deg,#6d4aff,#3f62ff)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>Get me free</a>}
            <a href="/features" style={{ padding: '7px 12px', borderRadius: 100, border: '1px solid #c9bfff', color: '#3b2b8f', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>What I can do</a>
          </div>
        </div>
      )}
    </div>
  )
}

// 2. pick your pet: click a pet to try its colours
export function PickYourPet() {
  const [colour, setColour] = useState({ dragon: 'Ruby' }) // the red dragon first: it stands out on the dark page
  const [picked, setPicked] = useState('dragon')
  const next = (k) => {
    const all = Object.keys(window.VidiPets.colours[k])
    setColour((c) => ({ ...c, [k]: all[(all.indexOf(c[k] || all[0]) + 1) % all.length] }))
    setPicked(k)
  }
  const shown = (k) => colour[k] || Object.keys(window.VidiPets.colours[k])[0]
  return (
    <section className="lp-section" style={{ padding: '70px 24px 90px', maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
      <style>{CSS}</style>
      <p style={{ margin: 0, color: '#ffb547', fontWeight: 700, letterSpacing: '0.12em', fontSize: 12 }}>NEW · THE PLUGIN PET (BETA)</p>
      <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', fontWeight: 750, margin: '8px 0 10px', color: '#fff' }}>Pick your pet</h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', margin: '0 auto 30px', maxWidth: 560, lineHeight: 1.6 }}>
        It sits on every website, explains the page and shows you where to click. Tap a pet to try its colours.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(6px, 2vw, 22px)', flexWrap: 'wrap' }}>
        {KINDS.map((k, i) => (
          <button key={k} type="button" className="hp-pick" onClick={() => next(k)} aria-label={`${NAMES[k]}, ${shown(k)}: tap for another colour`}
            style={{ background: picked === k ? 'rgba(255,181,71,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${picked === k ? 'rgba(255,181,71,0.6)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 22, padding: '14px 10px 10px', cursor: 'pointer', color: '#fff', width: 'clamp(96px, 16vw, 150px)' }}>
            <span style={{ display: 'inline-grid', placeItems: 'center', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0) 68%)' }}><span className="hp-hop" style={{ display: 'inline-block', animationDelay: `${i * 0.3}s` }}><Pet kind={k} colour={shown(k)} size={96} /></span></span>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{NAMES[k]}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>{shown(k)}</div>
          </button>
        ))}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '18px 0 22px' }}>Give it a name too, or use your own picture.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {PLUGIN_URL && <a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ padding: '13px 30px', borderRadius: 100, background: 'linear-gradient(135deg,#ffb547,#ff6b5e)', color: '#1b1340', fontWeight: 800, textDecoration: 'none' }}>Get {NAMES[picked].toLowerCase() === 'owl' ? 'an' : 'a'} {NAMES[picked].toLowerCase()} for your browser</a>}
        <a href="/features" style={{ padding: '13px 26px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>See what it can do</a>
      </div>
    </section>
  )
}
