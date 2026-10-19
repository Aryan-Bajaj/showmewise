import { useEffect, useState } from 'react'

// A replay of a real run: the app's own nine processing steps with the numbers
// from our one-minute demo recording, then the finished guide and its exports.
const STEPS = [
  ['Extract frames', '29 frames'],
  ['Extract audio', '16 kHz mono'],
  ['Transcribe audio', '16 segments'],
  ['Read the screen (OCR)', 'buttons and popups read'],
  ['Load AI model', 'gemma3 on this computer'],
  ['Write procedure steps', '4 parts, 13 actions'],
  ['Self-verify steps', 'every step checked'],
  ['Consolidate procedure', 'titles tidied'],
  ['Purpose · summary · FAQ · flow', '6 questions answered'],
]
const TICK = 900 // ms per step in the replay

export default function ProductDemo() {
  const [t, setT] = useState(0) // 0..STEPS.length = processing, then done for a while
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x >= STEPS.length + 6 ? 0 : x + 1)), TICK)
    return () => clearInterval(id)
  }, [])
  const done = t > STEPS.length
  const pct = Math.min(100, Math.round((Math.min(t, STEPS.length) / STEPS.length) * 100))

  return (
    <div style={{ width: '100%', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.22)', background: 'rgba(18,12,44,0.92)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
      {/* window bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
        <span style={{ marginLeft: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>demo-how-to.mp4 · 0:57</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: done ? '#6ee7b7' : '#c4b5fd' }}>{done ? 'Complete' : `Processing · step ${Math.min(t + 1, STEPS.length)} of ${STEPS.length}`}</span>
      </div>

      {!done ? (
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
            <span>Everything runs on this computer</span><span style={{ fontWeight: 700, color: '#fff' }}>{pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6d4aff,#3f62ff,#22d3ee)', transition: `width ${TICK}ms linear` }} />
          </div>
          {STEPS.map(([label, detail], i) => {
            const st = i < t ? 'done' : i === t ? 'active' : 'todo'
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 2px', borderTop: i ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: st === 'todo' ? 0.4 : 1, transition: 'opacity .3s' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                  border: st === 'active' ? '2px solid #a78bfa' : st === 'done' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.25)',
                  borderTopColor: st === 'active' ? 'transparent' : undefined, background: st === 'done' ? 'rgba(16,185,129,0.15)' : 'transparent', color: '#6ee7b7',
                  animation: st === 'active' ? 'pd-spin .8s linear infinite' : 'none' }}>{st === 'done' ? '✓' : ''}</span>
                <span style={{ fontSize: 13.5, color: st === 'active' ? '#fff' : 'rgba(255,255,255,0.8)', fontWeight: st === 'active' ? 600 : 400 }}>{label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{st === 'done' ? detail : st === 'active' ? 'working…' : ''}</span>
              </div>
            )
          })}
          <style>{'@keyframes pd-spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : (
        <div style={{ padding: 18, display: 'grid', gap: 12, animation: 'pd-in .5s ease' }}>
          <style>{'@keyframes pd-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div><div style={{ fontWeight: 700, color: '#d1fae5', fontSize: 14 }}>Your guide is ready: 4 parts, 13 actions</div>
              <div style={{ fontSize: 12, color: 'rgba(209,250,229,0.75)' }}>Check it, edit anything, then export</div></div>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: '#fff', background: '#6d4aff', borderRadius: 5, padding: '2px 7px', fontSize: 11.5 }}>Part A</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>Create a new dashboard</span>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#a5f3fc' }}>▶ 00:09</span>
            </div>
            <img src="/landing/marked-dialog.jpg" alt="Part A with numbered markers" loading="lazy" style={{ display: 'block', width: '100%', maxHeight: 230, objectFit: 'cover', objectPosition: 'left center' }} />
          </div>
          <div className="pd-fmt" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {[
              { ic: '🌐', name: 'HTML', img: '/landing/guide-html.jpg', best: 'Best for sharing a link', c: '#22d3ee', items: ['Marked screenshots, click to enlarge', 'Step clips with the same markers', 'Checklist that remembers ticks', 'Jump to any part, FAQ'] },
              { ic: '📄', name: 'PDF', img: '/landing/guide-pdf.jpg', best: 'Best for print and email', c: '#a78bfa', items: ['Cover, contents, page numbers', 'Marked screenshots with captions', 'Tick-box checklist for paper', 'Looks the same everywhere'] },
              { ic: '📝', name: 'DOCX', img: '/landing/guide-word.jpg', best: 'Best for editing', c: '#fbbf24', items: ['The same manual, fully editable', 'Tables and screenshots kept', 'Add your own notes and logo', 'Opens in Word'] },
            ].map((f) => (
              <div key={f.name} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${f.c}40`, background: `linear-gradient(160deg, ${f.c}14, rgba(255,255,255,0.02))` }}>
                {/* a real page of this export */}
                <div style={{ height: 118, overflow: 'hidden', background: '#fff', borderBottom: `1px solid ${f.c}33` }}>
                  <img src={f.img} alt={`A real ${f.name} export`} loading="lazy" style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }} />
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <span style={{ fontSize: 15 }}>{f.ic}</span>
                  <b style={{ color: '#fff', fontSize: 14 }}>{f.name}</b>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: f.c, marginBottom: 7 }}>{f.best}</div>
                {f.items.map((it) => (
                  <div key={it} style={{ display: 'flex', gap: 6, fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.78)', marginBottom: 4 }}>
                    <span style={{ color: f.c, flexShrink: 0 }}>✓</span>{it}
                  </div>
                ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2px 4px' }}>
            <b style={{ color: '#fff' }}>Why three?</b> One guide, three jobs: share it as a link, print or email it, or change it to fit your team.
          </div>
          <style>{'@media (max-width: 640px) { .pd-fmt { grid-template-columns: 1fr !important; } }'}</style>
        </div>
      )}
    </div>
  )
}
