// "Everything stays on your computer": how the browser AI and Ollama work,
// as a simple picture for people who are not technical. Boxes stack on phones.
const ink = '#f1eeff', dim = 'rgba(241,238,255,0.68)'
const box = (accent) => ({ background: 'rgba(23,17,58,0.92)', border: `1px solid ${accent}`, borderRadius: 16, padding: '14px 16px', minWidth: 0 })
const Title = ({ icon, children }) => <div style={{ fontWeight: 700, fontSize: '0.98rem', color: ink, marginBottom: 6 }}><span style={{ marginRight: 8 }}>{icon}</span>{children}</div>
const Text = ({ children }) => <div style={{ fontSize: '0.86rem', lineHeight: 1.55, color: dim }}>{children}</div>
// an arrow between steps: down on phones, right on wide screens
const Arrow = () => <div className="hir-arrow" aria-hidden="true">➜</div>

export default function HowItRuns() {
  return (
    <section id="lp-runs" className="lp-section" style={{ padding: '40px 24px 60px', maxWidth: 1040, margin: '0 auto' }}>
      <style>{`
        .hir-flow{display:flex;align-items:stretch;gap:10px}
        .hir-flow>.hir-step{flex:1}
        .hir-flow>.hir-wide{flex:2.4}
        .hir-arrow{display:flex;align-items:center;justify-content:center;color:#7c5cff;font-size:22px;flex:none}
        .hir-ai{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media (max-width: 820px){
          .hir-flow{flex-direction:column}
          .hir-arrow{transform:rotate(90deg);height:26px}
          .hir-ai{grid-template-columns:1fr}
        }
      `}</style>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#34d399', marginBottom: 12 }}>How it works</div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4.2vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.025em', margin: 0 }}>Everything stays on your computer</h2>
        <p style={{ maxWidth: 620, margin: '14px auto 0', fontSize: '0.98rem', lineHeight: 1.7, color: dim }}>
          Your video is never uploaded. VideoDoc works inside your browser, and the AI runs on your own computer: in the browser, or in the free Ollama app.
        </p>
      </div>

      {/* the internet: one way only, models come in, nothing goes out */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ ...box('rgba(255,255,255,0.18)'), maxWidth: 460, textAlign: 'center' }}>
          <Title icon="🌐">The internet</Title>
          <Text>Only downloads the AI once, the first time (from Hugging Face or Ollama). After that it can even work offline.</Text>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, color: dim, fontSize: '0.82rem', marginBottom: 10 }}>
        <span><span style={{ color: '#34d399', fontSize: 18 }}>⬇</span> the AI, once</span>
        <span><span style={{ color: '#f87171', fontSize: 16, fontWeight: 700 }}>✖</span> your video: never uploaded</span>
      </div>

      {/* your computer */}
      <div style={{ border: '2px dashed rgba(52,211,153,0.55)', borderRadius: 22, padding: '28px 16px 18px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -13, left: 20, background: '#0d0d2b', padding: '0 10px', color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>🔒 Your computer</div>
        <div className="hir-flow">
          <div className="hir-step" style={box('rgba(124,92,255,0.45)')}>
            <Title icon="🎬">Your video</Title>
            <Text>A screen recording you upload or record here. It is opened by your browser, not sent anywhere.</Text>
          </div>
          <Arrow />
          <div className="hir-step" style={box('rgba(124,92,255,0.45)')}>
            <Title icon="👀">Your browser looks and listens</Title>
            <Text>Takes pictures of the screen, writes down what you say and reads the words on the screen.</Text>
          </div>
          <Arrow />
          <div className="hir-step hir-wide">
            <div style={{ color: dim, fontSize: '0.8rem', marginBottom: 6, textAlign: 'center' }}>The AI writes the steps: you pick one</div>
            <div className="hir-ai">
              <div style={box('rgba(34,211,238,0.5)')}>
                <Title icon="🧠">Browser AI</Title>
                <Text>Runs inside your browser, nothing to install. Quick first drafts. <a href="/#/check" style={{ color: '#a5f3fc' }}>Test my computer</a> picks the size.</Text>
              </div>
              <div style={box('rgba(52,211,153,0.5)')}>
                <Title icon="🦙">Ollama</Title>
                <Text>A free app on your computer. A bigger AI: more exact guides. Works with the page on your computer only.</Text>
              </div>
            </div>
          </div>
          <Arrow />
          <div className="hir-step" style={box('rgba(124,92,255,0.45)')}>
            <Title icon="📘">Your guide</Title>
            <Text>Steps with marked pictures, saved as HTML, PDF or Word, in your Downloads folder.</Text>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', marginTop: 16, color: dim, fontSize: '0.85rem' }}>No account. No cloud. The chats (Vid Chat, Doc Chat, Vidi) work the same way.</p>
    </section>
  )
}
