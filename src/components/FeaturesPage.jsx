import { useEffect } from 'react'
import ShowMeWiseLogo from './ShowMeWiseLogo'
import { PLUGIN_URL } from '../lib/links'

// Everything ShowMeWise does, in small cards: first the website, then the plugin.
// Each card links to its part of How to use. Only things that work today go here.
const C = { bg: '#0f0b24', card: 'rgba(22,15,46,0.94)', line: 'rgba(167,139,250,0.22)', ink: '#f1eeff', body: 'rgba(241,238,255,0.82)', dim: 'rgba(236,233,255,0.55)', acc: '#a78bfa', teal: '#4fd8c8' }

const SITE = [
  { group: 'Record and guide', items: [
    ['🎬', 'Record or upload', 'Record the whole screen, one window or a tab with your voice, or drop a video you already have.', 'upload'],
    ['📝', 'A guide by itself', 'Numbered steps written from what you say and what is on the screen.', 'writing'],
    ['🎯', 'Clicks marked', 'Every step gets a screenshot with the click marked beside it, plus a short clip.', 'guide'],
    ['🔤', 'Your words spelled right', 'Type the names and codes of your app first, and the guide spells them exactly.', 'upload'],
    ['❓', 'Summary, questions, flow chart', 'A checklist, questions and answers and a flow chart of the process.', 'faq-flow'],
    ['✏️', 'Fix any step', 'Change, add or remove a step before you share it.', 'edit'],
    ['📄', 'HTML, PDF or Word', 'Save the guide in the format your team uses.', 'export'],
    ['⏯️', 'Picks up where it stopped', 'If the page closes, the next try keeps what was already written.', 'progress'],
  ] },
  { group: 'Ask questions', items: [
    ['💬', 'Vid Chat', 'Ask about your recording. Answers point to the moment in the video.', 'vidchat'],
    ['📚', 'Doc Chat', 'Ask about a PDF, Word file, web page or text, with the source of each answer.', 'docchat'],
    ['🙋', 'Vidi helps', 'Questions about ShowMeWise itself are answered at the bottom right of every page.', 'vidi'],
  ] },
  { group: 'Your AI, your choice', items: [
    ['💻', 'On your computer', 'Ollama runs the AI privately on your computer and works without internet.', 'set-ollama'],
    ['☁️', 'Gemma 4 in the cloud', 'Ollama’s free cloud model: fast, with a monthly limit. One click to add.', 'set-ollama'],
    ['🔁', 'Switches by itself', 'No internet, or the free limit used up? The AI on your computer takes over.', 'set-ollama'],
    ['🧪', 'Test my computer', 'Finds the AI size that runs well on your computer in about 2 minutes.', 'check'],
  ] },
]

const PLUGIN = [
  { group: 'On every page', items: [
    ['⏺️', 'Record from the bar', 'Press Record in the plugin; the guide starts by itself when you stop.', 'record'],
    ['🔎', 'Ask about the page', 'Vidi answers from the page you are on, and reads matching links when needed.', 'plugin'],
    ['👉', 'Show me on the page', 'Vidi marks the right button with a numbered tag. It never clicks for you.', 'plugin'],
    ['🧭', 'Guide me (BETA)', 'Give it a manual, ask how to do something, and it shows one step at a time.', 'pet'],
  ] },
  { group: 'Your pet (BETA)', items: [
    ['🐉', 'Five pets', 'A dragon, wolf, cat, fox or owl in the colour you pick, or your own picture.', 'pet'],
    ['🏷️', 'It knows you', 'Give it a name; it remembers yours. Ask what it knows about you and see all of it.', 'pet'],
    ['🧾', 'Fills forms from your CV', 'It says which CV it uses, never touches passwords and never presses Submit.', 'pet'],
    ['⏰', 'Timers and search', 'Timers, alarms and reminders, and web search with links to the sources.', 'pet'],
    ['🙈', 'Out of your way', 'It moves away from buttons and text, and hides on any site with one click.', 'pet'],
    ['🔌', 'Connect in one click', 'Connect Ollama with one click and Chrome’s Allow. No terminal.', 'pet'],
  ] },
]

const VALUES = [
  ['🆓', 'Free', 'No price, no subscription.'],
  ['👤', 'No account', 'Open the website and start.'],
  ['🔒', 'Private', 'Your recording stays on your computer.'],
  ['📖', 'Open code', 'The code is on GitHub for anyone to read.'],
]

const AIS = [
  ['💻', 'Ollama on your computer', 'Private, works offline. Needs 8 GB of memory; 16 GB is better.'],
  ['☁️', 'Gemma 4 in Ollama’s cloud', 'Fast on any computer. Free with a monthly limit; needs internet.'],
  ['🌐', 'AI in the browser', 'Nothing to install, for the website’s guides, in Chrome or Edge. Smaller and slower. The pet uses Ollama.'],
]

function Card({ icon, title, text, link }) {
  const inner = <>
    <div style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">{icon}</div>
    <h3 style={{ fontSize: '1.02rem', margin: '12px 0 6px', color: C.ink }}>{title}</h3>
    <p style={{ margin: 0, color: C.body, fontSize: 14, lineHeight: 1.55 }}>{text}</p>
  </>
  const box = { display: 'block', background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 18px 20px', textDecoration: 'none' }
  return link ? <a href={`/#/howto#${link}`} className="ft-card" style={box}>{inner}</a> : <div style={box}>{inner}</div>
}

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }

function Part({ id, kicker, title, intro, groups, colour }) {
  return (
    <section id={id} style={{ marginTop: 64, scrollMarginTop: 80 }}>
      <p style={{ margin: 0, color: colour, fontWeight: 700, letterSpacing: '0.12em', fontSize: 12 }}>{kicker}</p>
      <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', margin: '6px 0 8px' }}>{title}</h2>
      <p style={{ color: C.body, margin: '0 0 8px', maxWidth: 700, lineHeight: 1.6 }}>{intro}</p>
      {groups.map((g) => (
        <div key={g.group}>
          <h3 style={{ color: C.dim, fontSize: 14, fontWeight: 600, margin: '26px 0 12px' }}>{g.group}</h3>
          <div style={grid}>{g.items.map(([icon, t, x, l]) => <Card key={t} icon={icon} title={t} text={x} link={l} />)}</div>
        </div>
      ))}
    </section>
  )
}

const btn = (bg, ink) => ({ display: 'inline-block', padding: '16px 40px', minWidth: 230, borderRadius: 100, background: bg, color: ink, fontWeight: 700, fontSize: '1.08rem', textDecoration: 'none', textAlign: 'center' })

export default function FeaturesPage() {
  useEffect(() => { document.title = 'ShowMeWise · Features'; window.scrollTo(0, 0) }, [])
  const apps = (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      <a href="/#/app" style={btn('linear-gradient(135deg, #3f62ff 0%, #a78bfa 100%)', '#fff')}>🎬 Video → Docs</a>
      <a href="/#/docchat" style={btn('linear-gradient(135deg, #10b981 0%, #22d3ee 100%)', '#06231c')}>💬 Doc → Chat</a>
    </div>
  )
  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: C.bg, color: C.ink, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" }}>
      <style>{'.ft-card{transition:transform .15s,border-color .15s}.ft-card:hover{transform:translateY(-3px);border-color:rgba(167,139,250,.6)!important}'}</style>
      <div className="app-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,11,36,0.92)', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a href="/#/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.ink, fontWeight: 700 }}>
              <ShowMeWiseLogo size={26} /> ShowMeWise
            </a>
            <span style={{ color: C.dim, fontSize: 13 }}>· Features</span>
            <a href="/#/howto" style={{ marginLeft: 'auto', color: C.body, fontSize: 13, textDecoration: 'none', padding: '7px 8px' }}>How to use</a>
            <a href="/#/app" style={{ color: '#fff', fontSize: 13, textDecoration: 'none', padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#6d4aff,#3f62ff)' }}>Open the app</a>
          </div>
        </nav>

        <main style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 22px 90px' }}>
          <header style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 3.4rem)', margin: '0 0 14px', letterSpacing: '-0.02em' }}>Everything ShowMeWise does</h1>
            <p style={{ color: C.body, fontSize: '1.1rem', lineHeight: 1.7, margin: '0 auto 30px', maxWidth: 680 }}>
              Turn a screen recording into a step-by-step guide, ask questions about videos and documents, and get help on any web page with the plugin.
            </p>
            {apps}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
              {[['#website', 'The website'], ['#plugin', 'The plugin'], ['#ai', 'Which AI']].map(([h, t]) => (
                <a key={h} href={h} onClick={(e) => { e.preventDefault(); document.getElementById(h.slice(1))?.scrollIntoView({ behavior: 'smooth' }) }}
                  style={{ fontSize: 13, color: C.ink, textDecoration: 'none', padding: '7px 14px', borderRadius: 100, border: `1px solid ${C.line}` }}>{t}</a>
              ))}
            </div>
          </header>

          <section style={{ marginTop: 60 }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3.4vw, 1.8rem)', margin: '0 0 16px', textAlign: 'center' }}>What matters to you, matters to us</h2>
            <div style={grid}>{VALUES.map(([i, t, x]) => <Card key={t} icon={i} title={t} text={x} />)}</div>
          </section>

          <Part id="website" kicker="THE WEBSITE" colour={C.acc} title="From a recording to a finished guide"
            intro="Everything runs in your browser at showmewise.netlify.app. No install needed to start." groups={SITE} />

          <Part id="plugin" kicker="THE BROWSER PLUGIN" colour={C.teal} title="Help on every web page"
            intro="The free plugin for Chrome and Edge brings Vidi to the pages you work on, as a small window or as a pet." groups={PLUGIN} />
          {PLUGIN_URL && <p style={{ marginTop: 18 }}><a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ color: C.teal, fontWeight: 600 }}>＋ Get the plugin on the Chrome Web Store</a></p>}

          <section id="ai" style={{ marginTop: 64, scrollMarginTop: 80 }}>
            <p style={{ margin: 0, color: C.acc, fontWeight: 700, letterSpacing: '0.12em', fontSize: 12 }}>WHERE IT WORKS</p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', margin: '6px 0 8px' }}>Three ways to run the AI</h2>
            <p style={{ color: C.body, margin: '0 0 18px', maxWidth: 700, lineHeight: 1.6 }}>
              The website works in Chrome, Edge and Firefox on Windows and Mac; the plugin in Chrome and Edge. Phones are not supported: the AI needs a computer.
            </p>
            <div style={{ ...grid, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>{AIS.map(([i, t, x]) => <Card key={t} icon={i} title={t} text={x} />)}</div>
          </section>

          <section style={{ marginTop: 72, textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0 0 22px' }}>Try it now. It is free.</h2>
            {apps}
          </section>
        </main>
      </div>
    </div>
  )
}
