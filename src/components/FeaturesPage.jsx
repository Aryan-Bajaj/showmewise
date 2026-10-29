import { useEffect } from 'react'
import ShowMeWiseLogo from './ShowMeWiseLogo'
import { PLUGIN_URL } from '../lib/links'
import { OnlineBadge } from './NetStatus'
import "../../extension/pet/pets.js"

// Everything ShowMeWise does, told as short stories with real screenshots:
// first the website, then the plugin and the pet. Every chip opens its part of
// How to use. Only things that work today go here.
const C = { bg: '#0f0b24', card: 'rgba(22,15,46,0.94)', line: 'rgba(167,139,250,0.22)', ink: '#f1eeff', body: 'rgba(241,238,255,0.8)', dim: 'rgba(236,233,255,0.55)', acc: '#a78bfa', teal: '#4fd8c8' }

const CSS = `
.ft-float{animation:ft-float 5s ease-in-out infinite}
.ft-float2{animation:ft-float 6s ease-in-out -2s infinite}
@keyframes ft-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.ft-hop{animation:ft-hop 2.4s ease-in-out infinite}
@keyframes ft-hop{0%,100%{transform:translateY(0)}40%{transform:translateY(-14px)}60%{transform:translateY(-14px)}}
.ft-spin{animation:ft-spin 26s linear infinite}
.ft-unspin{animation:ft-spin 26s linear infinite reverse}
@keyframes ft-spin{to{transform:rotate(360deg)}}
.ft-chip{transition:background .15s,border-color .15s}
.ft-chip:hover{background:rgba(167,139,250,.16)!important;border-color:rgba(167,139,250,.6)!important}
.ft-shot{border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.08);display:block;max-width:100%}
.ft-row h2,.ft-main h2{font-weight:750}
.ft-row{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.ft-row.flip .ft-art{order:2}
@media (max-width:820px){.ft-row{grid-template-columns:1fr;gap:28px}.ft-row.flip .ft-art{order:0}.ft-hero-art{display:none!important}}
@media (prefers-reduced-motion:reduce){.ft-float,.ft-float2,.ft-hop,.ft-spin,.ft-unspin{animation:none}}
`

const pet = (kind, size, colour = '') => (
  <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size }}
    dangerouslySetInnerHTML={{ __html: window.VidiPets.svg(kind, colour).replace('<svg ', '<svg width="100%" height="100%" ') }} />
)

// a little "it worked" badge, like the ones apps show
const Badge = ({ icon, text, style }) => (
  <div className="ft-float2" style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 16, background: '#fff', color: '#1b1340', fontWeight: 700, fontSize: 15, boxShadow: '0 16px 40px rgba(0,0,0,.45)', whiteSpace: 'nowrap', ...style }}>
    <span style={{ fontSize: 22 }}>{icon}</span>{text}
  </div>
)

const Chips = ({ items }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
    {items.map(([t, link]) => (
      <a key={t} href={`/howto#${link}`} className="ft-chip" style={{ fontSize: 13.5, color: C.ink, textDecoration: 'none', padding: '7px 13px', borderRadius: 100, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.04)' }}>{t}</a>
    ))}
  </div>
)

function Story({ kicker, colour = C.acc, title, text, chips, art, flip }) {
  return (
    <section className={`ft-row${flip ? ' flip' : ''}`} style={{ marginTop: 110 }}>
      <div className="ft-art" style={{ position: 'relative' }}>{art}</div>
      <div>
        <p style={{ margin: 0, color: colour, fontWeight: 700, letterSpacing: '0.12em', fontSize: 12 }}>{kicker}</p>
        <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', margin: '8px 0 14px', lineHeight: 1.15, letterSpacing: '-0.01em' }}>{title}</h2>
        <p style={{ color: C.body, fontSize: '1.08rem', lineHeight: 1.7, margin: 0 }}>{text}</p>
        <Chips items={chips} />
      </div>
    </section>
  )
}

// a soft coloured panel behind a screenshot, like a photo on a table
const Panel = ({ colour, children, pad = 28 }) => (
  <div style={{ position: 'relative', borderRadius: 28, padding: pad, background: colour }}>{children}</div>
)

// what the pet does, each with a real picture of it doing it
const PET = [
  ['Explains any page', 'Ask “explain this page” and get the short version in plain words.', 'pet-explain', 'linear-gradient(135deg,#5b8cff,#a78bfa)'],
  ['Guides you step by step', 'Give it a manual and ask how. It marks one step at a time on the real page. It never clicks for you.', 'pet-guide', '#ff6b5e', 'pet-guide-page'],
  ['Fills forms from your CV', 'Give it your CV once. It fills the form for you to check. Never passwords, never Submit.', 'pet-fill', '#10b981', 'pet-fill-page'],
  ['Timers and reminders', 'Say “timer 10 minutes” or “remind me at 17:00”. It rings with a sound.', 'pet-timer', '#ffd76a'],
  ['Searches the web', 'Ask anything. Get a short answer with links to the sources.', 'pet-search', 'linear-gradient(135deg,#10b981,#22d3ee)'],
  ['Remembers you', 'Tell it your name. Ask what it knows about you, and delete it any time.', 'pet-memory', '#a78bfa'],
  ['Online or offline', 'Uses the free cloud AI when you are online, and the AI on your computer when you are not.', 'pet-switch', 'linear-gradient(135deg,#3f62ff,#22d3ee)'],
]

const VALUES = [
  ['🆓', 'Free', 'No price, no subscription.'],
  ['👤', 'No account', 'Open the website and start.'],
  ['🔒', 'Private', 'Your recording stays on your computer.'],
  ['📖', 'Open code', 'The code is on GitHub for anyone to read.'],
]

const btn = (bg, ink) => ({ display: 'inline-block', padding: '16px 40px', minWidth: 230, borderRadius: 100, background: bg, color: ink, fontWeight: 700, fontSize: '1.08rem', textDecoration: 'none', textAlign: 'center' })

export default function FeaturesPage() {
  useEffect(() => { document.title = 'ShowMeWise · Features'; window.scrollTo(0, 0) }, [])
  const apps = (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      <a href="/#/app" style={btn('linear-gradient(135deg, #3f62ff 0%, #a78bfa 100%)', '#fff')}>🎬 Video → Docs</a>
      <a href="/#/docchat" style={btn('linear-gradient(135deg, #10b981 0%, #22d3ee 100%)', '#06231c')}>💬 Doc → Chat</a>
    </div>
  )
  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: C.bg, color: C.ink, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif", overflowX: 'hidden' }}>
      <style>{CSS}</style>
      <div className="app-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,11,36,0.92)', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a href="/"style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.ink, fontWeight: 700 }}>
              <ShowMeWiseLogo size={26} /> ShowMeWise
            </a>
            <span style={{ color: C.dim, fontSize: 13 }}>· Features</span>
            <OnlineBadge />
            <a href="/howto" style={{ marginLeft: 'auto', color: C.body, fontSize: 13, textDecoration: 'none', padding: '7px 8px' }}>How to use</a>
            <a href="/#/app" style={{ color: '#fff', fontSize: 13, textDecoration: 'none', padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#6d4aff,#3f62ff)' }}>Open the app</a>
          </div>
        </nav>

        <main className="ft-main" style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 22px 100px' }}>
          {/* hero: big words left, a collage of the real app right */}
          <header className="ft-row">
            <div>
              <h1 style={{ fontSize: 'clamp(2.8rem, 8vw, 5rem)', margin: '0 0 18px', lineHeight: 1, letterSpacing: '-0.03em', fontWeight: 800 }}>Our<br /><span style={{ background: 'linear-gradient(90deg,#b49cff,#4fd8c8)', WebkitBackgroundClip: 'text', color: 'transparent' }}>features</span></h1>
              <p style={{ color: C.body, fontSize: '1.15rem', lineHeight: 1.7, margin: '0 0 30px', maxWidth: 520 }}>
                Never written a manual before? No problem. Show your screen once, talk while you do it, and ShowMeWise writes the guide. Stuck on a website? Your pet shows you where to click.
              </p>
              {apps}
            </div>
            <div className="ft-hero-art" style={{ position: 'relative', height: 460 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: '46%', height: 210, borderRadius: 24, background: '#ffd76a', display: 'grid', placeItems: 'center' }}>
                <span className="ft-hop">{pet('dragon', 150)}</span>
              </div>
              <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: 250, borderRadius: 24, background: '#ff6b5e', overflow: 'hidden' }}>
                <img src="/landing/marked-page.webp" alt="A screenshot from a guide with the click marked" style={{ position: 'absolute', left: 18, top: 18, width: 'calc(100% - 18px)', borderRadius: '10px 0 0 0' }} />
              </div>
              <div style={{ position: 'absolute', left: 0, bottom: 0, width: '46%', height: 230, borderRadius: 24, background: '#5b8cff', overflow: 'hidden' }}>
                <img src="/landing/guide-pdf.webp" alt="A page of a finished PDF guide" style={{ position: 'absolute', left: 22, top: 22, width: 'calc(100% - 44px)', borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,.3)' }} />
              </div>
              <div style={{ position: 'absolute', right: 0, bottom: 0, width: '50%', height: 190, borderRadius: 24, background: '#10b981', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 10px 14px' }}>
                {['cat', 'fox', 'owl'].map((k, i) => <span key={k} className="ft-hop" style={{ animationDelay: `${i * 0.4}s` }}>{pet(k, 72)}</span>)}
              </div>
              <Badge icon="✅" text="Your guide is ready!" style={{ right: 24, bottom: 150 }} />
            </div>
          </header>

          <section style={{ marginTop: 110, textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', margin: '0 0 10px' }}>What matters to you, matters to us</h2>
            <p style={{ color: C.body, margin: '0 auto 30px', maxWidth: 620, fontSize: '1.05rem' }}>Your screen recordings show how your work is done. They should stay yours.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, textAlign: 'left' }}>
              {VALUES.map(([i, t, x]) => (
                <div key={t} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '22px 20px' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(167,139,250,.16)', display: 'grid', placeItems: 'center', fontSize: 24 }}>{i}</div>
                  <h3 style={{ margin: '14px 0 6px', fontSize: '1.08rem' }}>{t}</h3>
                  <p style={{ margin: 0, color: C.body, fontSize: 14.5, lineHeight: 1.55 }}>{x}</p>
                </div>
              ))}
            </div>
          </section>

          <div id="website" />
          <Story kicker="THE WEBSITE · RECORD" title="Record once. Get a guide."
            text="Record the whole screen, one window or a tab and explain what you do, or drop a video you already have. ShowMeWise listens, reads the screen and writes numbered steps, with every click marked beside it."
            chips={[['🎬 Record or upload', 'upload'], ['🔤 Your words spelled right', 'upload'], ['⏯️ Picks up where it stopped', 'progress']]}
            art={<Panel colour="linear-gradient(135deg,#3f62ff,#a78bfa)"><img className="ft-shot" src="/howto/done.webp" alt="ShowMeWise has finished: every step ticked" loading="lazy" />
              <Badge icon="🎯" text="Every click marked" style={{ left: -14, bottom: -22 }} /></Panel>} />

          <Story flip kicker="THE WEBSITE · YOUR GUIDE" title="A guide you can fix and share"
            text="Change, add or remove any step. You also get a checklist, questions and answers and a flow chart. Save it as a web page, a PDF or a Word file."
            chips={[['✏️ Fix any step', 'edit'], ['❓ Summary, questions, flow chart', 'faq-flow'], ['📄 HTML, PDF or Word', 'export']]}
            art={<Panel colour="#ffd76a" pad={30}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <img className="ft-shot ft-float" src="/landing/guide-word.webp" alt="A page of the Word guide" loading="lazy" style={{ width: '48%', transform: 'rotate(-4deg)' }} />
                <img className="ft-shot ft-float2" src="/landing/guide-pdf.webp" alt="A page of the PDF guide" loading="lazy" style={{ width: '48%', transform: 'rotate(3deg)' }} />
              </div></Panel>} />

          <Story kicker="THE WEBSITE · ASK" colour={C.teal} title="Ask your video. Ask your document."
            text="Vid Chat answers questions about your recording and jumps to the right moment. Doc Chat answers from a PDF, Word file, web page or text, and shows where each answer comes from."
            chips={[['💬 Vid Chat', 'vidchat'], ['📚 Doc Chat', 'docchat'], ['🙋 Vidi helps', 'vidi']]}
            art={<Panel colour="linear-gradient(135deg,#10b981,#22d3ee)"><img className="ft-shot" src="/howto/chat.webp" alt="Vid Chat answering a question about the recording" loading="lazy" />
              <Badge icon="⏱️" text="Jumps to 00:47" style={{ right: -10, top: -20 }} /></Panel>} />

          <div id="plugin" />
          <Story flip kicker="THE PLUGIN · ON EVERY PAGE" colour={C.teal} title="Lost on a website? Ask."
            text="With the free plugin for Chrome and Edge, Vidi answers from the page you are on. Press Show me, and it marks the right button with a number. It never clicks for you."
            chips={[['🔎 Ask about the page', 'plugin'], ['👉 Show me on the page', 'plugin'], ['⏺️ Record from the bar', 'record'], ['🧭 Guide me (BETA)', 'pet']]}
            art={<Panel colour="#ff6b5e"><img className="ft-shot" src="/features/show-me.webp" alt="A page with the New board button marked by the plugin" loading="lazy" />
              <img className="ft-shot ft-float" src="/features/ask-page.webp" alt="Vidi answering from the page, with its sources" loading="lazy" style={{ position: 'absolute', right: -18, bottom: -40, width: '42%' }} /></Panel>} />

          <Story kicker="THE PLUGIN · YOUR PET (BETA)" colour="#ffb547" title="Meet your pet"
            text="A dragon, wolf, cat, fox or owl, in the colour you like, with the name you give it. Or your own picture. It sits at the edge of your pages and moves out of the way."
            chips={[['🐉 Pick your pet', 'pet'], ['🙈 Hide it on any site', 'pet']]}
            art={<Panel colour="linear-gradient(160deg,#2b1f63,#1a1340)" pad={26}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, textAlign: 'center' }}>
                {['dragon', 'wolf', 'cat', 'fox', 'owl'].map((k, i) => Object.keys(window.VidiPets.colours[k]).map((c, j) => (
                  <span key={k + c} className="ft-hop" style={{ animationDelay: `${(i + j) * 0.3}s`, gridRow: j + 1, gridColumn: i + 1 }}>{pet(k, 78, c)}</span>
                )))}
              </div></Panel>} />

          {PET.map(([title, text, img, colour, extra], i) => (
            <Story key={title} flip={i % 2 === 0} kicker="YOUR PET CAN" colour="#ffb547" title={title} text={text} chips={[]}
              art={<Panel colour={colour} pad={26}>
                {extra ? <>
                  <img className="ft-shot" src={`/features/${extra}.webp`} alt="" loading="lazy" style={{ width: '88%' }} />
                  <img className="ft-shot ft-float" src={`/features/${img}.webp`} alt={title} loading="lazy" style={{ position: 'absolute', right: -16, bottom: -36, width: '46%' }} />
                </> : <div style={{ display: 'flex', justifyContent: 'center' }}><img className="ft-shot" src={`/features/${img}.webp`} alt={title} loading="lazy" style={{ width: '70%' }} /></div>}
              </Panel>} />
          ))}

          {/* your AI: three ways around ShowMeWise, like planets */}
          <section id="ai" className="ft-row flip" style={{ marginTop: 110 }}>
            <div className="ft-art" style={{ position: 'relative', height: 380, display: 'grid', placeItems: 'center' }}>
              <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', border: '2px dashed rgba(255,215,106,.45)' }} />
              <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,#ffd76a33,transparent 70%)' }} />
              <div style={{ width: 128, height: 128, borderRadius: '50%', background: 'linear-gradient(135deg,#ffd76a,#ffb547)', display: 'grid', placeItems: 'center', boxShadow: '0 0 60px rgba(255,200,90,.45)' }}><ShowMeWiseLogo size={64} /></div>
              <div className="ft-spin" style={{ position: 'absolute', width: 340, height: 340 }}>
                {[['💻', 0], ['☁️', 120], ['🌐', 240]].map(([icon, deg]) => (
                  <div key={deg} style={{ position: 'absolute', left: '50%', top: '50%', transform: `rotate(${deg}deg) translateY(-170px)` }}>
                    <div className="ft-unspin" style={{ width: 62, height: 62, marginLeft: -31, marginTop: -31, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, boxShadow: '0 10px 26px rgba(0,0,0,.4)' }}>
                      <span style={{ display: 'inline-block', transform: `rotate(${-deg}deg)` }}>{icon}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{ margin: 0, color: '#ffd76a', fontWeight: 700, letterSpacing: '0.12em', fontSize: 12 }}>YOUR AI, YOUR CHOICE</p>
              <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', margin: '8px 0 18px', lineHeight: 1.15 }}>Three ways to run the AI</h2>
              {[['💻 On your computer', 'Ollama runs it privately and works without internet. Needs 8 GB of memory; 16 GB is better.'],
                ['☁️ Gemma 4 in Ollama’s cloud', 'Fast on any computer. Free with a monthly limit; needs internet. One click to add.'],
                ['🌐 In the browser', 'Nothing to install, for the website’s guides in Chrome or Edge. Smaller and slower. The pet uses Ollama.']].map(([t, x]) => (
                <div key={t} style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.08rem' }}>{t}</h3>
                  <p style={{ margin: 0, color: C.body, lineHeight: 1.6 }}>{x}</p>
                </div>
              ))}
              <p style={{ color: C.body, lineHeight: 1.6, margin: '4px 0 0' }}>No internet, or the free cloud limit used up? The AI on your computer takes over by itself.</p>
              <Chips items={[['🧪 Test my computer', 'check'], ['🔌 Connect Ollama in one click', 'set-ollama-missing']]} />
            </div>
          </section>

          <section style={{ marginTop: 110, textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', margin: '0 0 10px' }}>Works where you work</h2>
            <p style={{ color: C.body, margin: '0 auto 26px', maxWidth: 640, lineHeight: 1.6 }}>The website works in Chrome, Edge and Firefox on Windows and Mac; the plugin in Chrome and Edge. Phones are not supported: the AI needs a computer.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
              {[['🪟', 'Windows', '#5b8cff'], ['🍎', 'Mac', '#ff6b5e'], ['🧩', 'Plugin', '#10b981'], ['📴', 'Offline', '#ffd76a'], ['🌍', 'Many spoken languages', '#a78bfa']].map(([i, t, c]) => (
                <div key={t} style={{ width: 132, padding: '20px 10px', borderRadius: 20, background: c, color: '#14102b', fontWeight: 700, fontSize: 14 }}>
                  <div style={{ fontSize: 34, marginBottom: 6 }}>{i}</div>{t}
                </div>
              ))}
            </div>
            {PLUGIN_URL && <p style={{ marginTop: 26 }}><a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ color: C.teal, fontWeight: 600 }}>＋ Get the plugin on the Chrome Web Store</a></p>}
          </section>

          <section style={{ marginTop: 120, textAlign: 'center' }}>
            <span className="ft-hop" style={{ display: 'inline-block' }}>{pet('dragon', 96)}</span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', margin: '8px auto 26px', maxWidth: 720, lineHeight: 1.2 }}>Every screen recording can become a guide. Try it now, it is free.</h2>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{apps}</div>
          </section>
        </main>
      </div>
    </div>
  )
}
