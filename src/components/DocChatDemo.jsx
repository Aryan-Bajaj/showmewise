// Looping animation of Vid Chat, drawn the way the real chat answers: the
// reply, the marked screenshot of the step it came from (with its part and a
// play button for that moment), and a web search for more.
// Pure CSS keyframes on a single ~14s cycle.

const CSS = `
  @keyframes dcd-q    { 0%,4%{opacity:0;transform:translateY(8px)} 9%,90%{opacity:1;transform:none} 96%,100%{opacity:0} }
  @keyframes dcd-think{ 0%,12%{opacity:0} 16%,28%{opacity:1} 32%,100%{opacity:0} }
  @keyframes dcd-a    { 0%,30%{opacity:0;transform:translateY(6px)} 36%,90%{opacity:1;transform:none} 96%,100%{opacity:0} }
  @keyframes dcd-src  { 0%,44%{opacity:0;transform:translateY(8px) scale(.97)} 52%,90%{opacity:1;transform:none} 96%,100%{opacity:0} }
  @keyframes dcd-web  { 0%,60%{opacity:0} 66%,90%{opacity:1} 96%,100%{opacity:0} }
  @keyframes dcd-blink{ 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes dcd-dot  { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-3px);opacity:1} }
`

export default function DocChatDemo() {
  const cycle = '14s'
  return (
    <>
      <style>{CSS}</style>
      <div style={{
        width: '100%', maxWidth: 600, margin: '0 auto',
        background: 'rgba(18,12,44,0.9)', border: '1px solid rgba(167,139,250,0.22)',
        borderRadius: 18, overflow: 'hidden', backdropFilter: 'blur(20px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}>
        {/* header */}
        <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>💬</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Vid Chat</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>· ask anything about this recording</span>
        </div>

        {/* body */}
        <div style={{ padding: '18px', minHeight: 430, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'flex-end', maxWidth: '85%', animation: `dcd-q ${cycle} ease-in-out infinite` }}>
            <div style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.28)', color: '#ecfdf5', fontSize: 13.5, padding: '9px 13px', borderRadius: '12px 12px 3px 12px' }}>
              How do I share the dashboard?
            </div>
          </div>

          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '4px 2px', animation: `dcd-think ${cycle} ease-in-out infinite` }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: `dcd-dot 0.9s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>

          <div style={{ alignSelf: 'flex-start', width: '92%', animation: `dcd-a ${cycle} ease-in-out infinite` }}>
            <div style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.88)', fontSize: 13.5, lineHeight: 1.6, padding: '11px 14px', borderRadius: 12 }}>
              Click <b style={{ color: '#fff' }}>Share</b>, switch on <b style={{ color: '#fff' }}>Anyone with the link can view</b>, then click <b style={{ color: '#fff' }}>Copy link</b>. The link is ready to send.
            </div>

            {/* the step it came from: marked screenshot, part, play this moment */}
            <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.3)', background: '#120c2c', animation: `dcd-src ${cycle} ease-in-out infinite` }}>
              <img src="/landing/marked-share.jpg" alt="The share step with markers on Share, the switch and Copy link" loading="lazy" style={{ display: 'block', width: '100%' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#fff', background: '#6d4aff', borderRadius: 5, padding: '2px 7px' }}>Part D</span>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>Share the dashboard</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#a5f3fc', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 100, padding: '2px 9px' }}>▶ 00:47</span>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 100, padding: '5px 12px', animation: `dcd-web ${cycle} ease-in-out infinite` }}>
              🌐 Search the web for more ↗
            </div>
          </div>
        </div>

        {/* input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, background: '#0f0b24', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 11, padding: '9px 13px', fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center' }}>
            Ask about this recording…<span style={{ width: 1.5, height: 14, background: '#a78bfa', marginLeft: 3, animation: 'dcd-blink 1s step-end infinite' }} />
          </div>
          <div style={{ width: 38, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>➤</div>
        </div>
      </div>
    </>
  )
}
