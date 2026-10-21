import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// A real screenshot of the app with numbered pins and the matching legend.
// Used by the How to use page and by Vidi, so both show the same picture.
// Click it to see it large (above everything, the Vidi button included);
// click again or press Esc to close.
// x, y: the spot on the picture the mark is about (an edge of the button or
// field). The numbered pin sits beside it, in the direction `dir` (into empty
// space), with a short arrow pointing at the spot, so nothing is covered.
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }
const Pins = ({ marks, size }) => (marks || []).map((m) => {
  const [dx, dy] = DIRS[m.dir || 'left']
  const d = size * 1.45 // pin centre to the spot
  const tip = size * 0.18 // arrow stops just short of the spot
  return (
    <span key={m.n} aria-hidden="true" style={{ position: 'absolute', left: `${m.x}%`, top: `${m.y}%`, width: 0, height: 0 }}>
      <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width="1" height="1">
        <line x1={dx * (d - size / 2)} y1={dy * (d - size / 2)} x2={dx * tip} y2={dy * tip} stroke="#ffffff" strokeWidth={Math.max(2.5, size / 9)} strokeLinecap="round" />
        <polygon points={`${dx * tip},${dy * tip} ${dx * (tip + size * 0.32) - dy * size * 0.2},${dy * (tip + size * 0.32) - dx * size * 0.2} ${dx * (tip + size * 0.32) + dy * size * 0.2},${dy * (tip + size * 0.32) + dx * size * 0.2}`} fill="#ffffff" />
      </svg>
      <span style={{
        position: 'absolute', left: dx * d, top: dy * d, transform: 'translate(-50%,-50%)',
        width: size, height: size, borderRadius: '50%', background: '#6d4aff', color: '#ffffff',
        fontWeight: 800, fontSize: Math.round(size / 2), display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 2.5px #ffffff, 0 2px 8px rgba(0,0,0,0.55)',
      }}>{m.n}</span>
    </span>
  )
})

export default function MarkedShot({ section, compact = false }) {
  const [big, setBig] = useState(false)
  const [ratio, setRatio] = useState(16 / 9) // width / height, read when the picture loads
  useEffect(() => {
    if (!big) return
    const close = (e) => e.key === 'Escape' && setBig(false)
    addEventListener('keydown', close)
    return () => removeEventListener('keydown', close)
  }, [big])
  if (!section?.img) return null
  const src = `/howto/${section.img}.webp`
  return (
    <figure style={{ margin: compact ? '8px 0 0' : '14px 0 0' }}>
      <button type="button" onClick={() => setBig(true)} title="Click to enlarge" aria-label={`Enlarge picture: ${section.title}`}
        style={{ position: 'relative', display: 'block', width: '100%', padding: 0, border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', background: 'none' }}>
        <img src={src} alt={section.title} loading="lazy" onLoad={(e) => setRatio(e.target.naturalWidth / e.target.naturalHeight || 16 / 9)} style={{ display: 'block', width: '100%', height: 'auto' }} />
        <Pins marks={section.marks} size={compact ? 18 : 28} />
      </button>
      {big && createPortal(
        // on <body>, so no layer of the page (or the Vidi button) can sit on top of it
        <div role="dialog" aria-label={section.title} onClick={() => setBig(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(6,4,16,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          {/* as big as the screen allows, same shape, so the pins stay on their spot */}
          <div style={{ position: 'relative', width: `min(94vw, ${(86 * ratio).toFixed(1)}vh)` }}>
            <img src={src} alt={section.title} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 10 }} />
            <Pins marks={section.marks} size={32} />
          </div>
          <span style={{ position: 'fixed', top: 14, right: 18, color: '#fff', fontSize: 13, opacity: 0.85 }}>Click anywhere or press Esc to close</span>
        </div>,
        document.body,
      )}
      {!compact && section.marks?.length > 0 && (
        <ol style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8 }}>
          {[...section.marks].sort((a, b) => a.n - b.n).map((m) => (
            <li key={m.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: '#6d4aff', color: '#ffffff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>{m.n}</span>
              <span>{m.text}</span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  )
}
