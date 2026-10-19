import { useEffect, useRef, useState } from 'react'

// Drag to compare: the raw recording (a real frame of our demo how-to) against
// the guide VideoDoc made from it (real export pages). Nothing here is a mock-up.
const OUTPUTS = [
  { id: 'html', label: 'HTML', src: '/landing/guide-html.jpg', note: 'Web guide with step clips' },
  { id: 'pdf', label: 'PDF', src: '/landing/guide-pdf.jpg', note: 'Print-ready manual' },
  { id: 'docx', label: 'DOCX', src: '/landing/guide-word.jpg', note: 'Editable in Word' },
]

export default function BeforeAfter() {
  const [pos, setPos] = useState(46)
  const [tab, setTab] = useState('pdf')
  const [hint, setHint] = useState(true)
  const box = useRef(null)
  const drag = useRef(false)

  const move = (clientX) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100)))
    setHint(false)
  }
  useEffect(() => {
    const mm = (e) => drag.current && move(e.touches ? e.touches[0].clientX : e.clientX)
    const up = () => { drag.current = false }
    window.addEventListener('mousemove', mm); window.addEventListener('touchmove', mm, { passive: true })
    window.addEventListener('mouseup', up); window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', mm); window.removeEventListener('touchmove', mm)
      window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up)
    }
  }, [])
  // gentle nudge until the visitor touches it
  useEffect(() => {
    if (!hint) return
    let t = 0
    const id = setInterval(() => { t += 1; setPos(46 + Math.sin(t / 6) * 6) }, 60)
    return () => clearInterval(id)
  }, [hint])

  const out = OUTPUTS.find((o) => o.id === tab)
  const H = 470

  return (
    <div ref={box}
      onMouseDown={(e) => { drag.current = true; move(e.clientX) }}
      onTouchStart={(e) => { drag.current = true; move(e.touches[0].clientX) }}
      style={{ position: 'relative', height: H, borderRadius: 18, overflow: 'hidden', userSelect: 'none', cursor: 'col-resize', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', background: '#0f0b24' }}>

      {/* AFTER: the real guide */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#1a1240,#0f0b24)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '14px 16px 10px' }}>
          <span style={{ marginRight: 'auto', marginLeft: `calc(${pos}% + 10px)`, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4b5fd', whiteSpace: 'nowrap' }}>After · VideoDoc guide</span>
          {OUTPUTS.map((o) => (
            <button key={o.id} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={() => setTab(o.id)}
              style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${tab === o.id ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.12)'}`, background: tab === o.id ? 'rgba(109,74,255,0.3)' : 'rgba(255,255,255,0.04)', color: '#fff' }}>{o.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, margin: '0 16px 16px', borderRadius: 12, overflow: 'hidden', background: '#fff', position: 'relative' }}>
          <img key={out.src} src={out.src} alt={`${out.label} guide made by VideoDoc`} loading="lazy" draggable={false}
            style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top', height: '100%' }} />
          <span style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(15,11,36,0.82)', padding: '4px 10px', borderRadius: 100 }}>{out.note}</span>
        </div>
      </div>

      {/* BEFORE: the raw recording */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)`, background: '#08061a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Before · raw recording</div>
        <div style={{ flex: 1, margin: '0 16px 16px', borderRadius: 12, overflow: 'hidden', background: '#000', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <img src="/landing/raw-frame.jpg" alt="A frame of the raw screen recording" draggable={false} style={{ width: '100%', flex: 1, objectFit: 'cover', objectPosition: 'top left', filter: 'saturate(0.85)', minHeight: 0 }} />
          {/* player bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: 12 }}>
            <span>▶</span>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.18)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '22%', borderRadius: 4, background: '#fff' }} />
            </div>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.75)' }}>0:12 / 0:57</span>
          </div>
          <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['57 seconds of video', 'No steps written down', 'No screenshots picked'].map((t) => (
              <span key={t} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(15,11,36,0.82)', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 100, width: 'fit-content' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* handle */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2, marginLeft: -1, background: 'linear-gradient(#a78bfa,#22d3ee)', boxShadow: '0 0 16px rgba(167,139,250,0.8)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 42, height: 42, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b2fd1', fontWeight: 900, fontSize: 15, boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>⇆</div>
      </div>
    </div>
  )
}
