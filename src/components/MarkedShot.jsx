// A real screenshot of the app with numbered pins and the matching legend.
// Used by the How to use page and by Vidi, so both show the same picture.
export default function MarkedShot({ section, compact = false }) {
  if (!section?.img) return null
  return (
    <figure style={{ margin: compact ? '8px 0 0' : '14px 0 0' }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.25)' }}>
        <img src={`/howto/${section.img}.webp`} alt={section.title} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
        {(section.marks || []).map((m) => (
          <span key={m.n} aria-hidden="true" style={{
            position: 'absolute', left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%,-50%)',
            width: compact ? 18 : 28, height: compact ? 18 : 28, borderRadius: '50%', background: '#6d4aff', color: '#ffffff',
            fontWeight: 800, fontSize: compact ? 11 : 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 3px rgba(255,255,255,0.85), 0 2px 8px rgba(0,0,0,0.5)',
          }}>{m.n}</span>
        ))}
      </div>
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
