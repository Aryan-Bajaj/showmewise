import { useEffect } from 'react'
import VideoDocLogo from './VideoDocLogo'
import { MAX_VIDEO_MB, MAX_VIDEO_MIN } from '../lib/limits'

// Privacy, terms and credits in plain English. Everything here describes what
// the app really does (checked against the code): keep it true when the app changes.
const UPDATED = '22 October 2026'
const REPO = 'https://github.com/Aryan-Bajaj/video-docs'

const C = { bg: '#0f0b24', card: 'rgba(28,18,55,0.7)', line: 'rgba(167,139,250,0.18)', ink: '#ece9ff', body: 'rgba(236,233,255,0.78)', dim: 'rgba(236,233,255,0.55)', acc: '#a78bfa' }

function Section({ id, n, title, children }) {
  return (
    <section id={id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '26px 28px', marginBottom: 18, scrollMarginTop: 90 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1.35rem', margin: '0 0 14px', color: C.ink }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#6d4aff,#3f62ff)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>{n}</span>
        {title}
      </h2>
      <div style={{ color: C.body, lineHeight: 1.75, fontSize: '0.98rem' }}>{children}</div>
    </section>
  )
}

const H = ({ children }) => <h3 style={{ fontSize: '1rem', color: C.ink, margin: '18px 0 6px' }}>{children}</h3>
const UL = ({ items }) => <ul style={{ margin: '6px 0', paddingLeft: 20, listStyle: 'disc' }}>{items.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}</ul>
const A = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: C.acc }}>{children}</a>

export default function PolicyPage() {
  useEffect(() => { window.scrollTo(0, 0); document.title = 'VideoDoc · Privacy, terms and credits' }, [])
  const limit = [MAX_VIDEO_MIN ? `${MAX_VIDEO_MIN} minutes` : null, MAX_VIDEO_MB ? `${MAX_VIDEO_MB} MB` : null].filter(Boolean).join(' or ')

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(1200px 600px at 20% -10%, rgba(109,74,255,0.22), transparent), ${C.bg}`, color: C.ink, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(16px)', background: 'rgba(15,11,36,0.8)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/#/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.ink, fontWeight: 700 }}>
            <VideoDocLogo size={26} /> VideoDoc
          </a>
          <span style={{ color: C.dim, fontSize: 13 }}>· Policy</span>
          <a href="/#/" style={{ marginLeft: 'auto', color: C.dim, fontSize: 13, textDecoration: 'none' }}>← Back to home</a>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '44px 22px 70px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.acc, marginBottom: 10 }}>Last updated {UPDATED}</div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Privacy, terms and credits</h1>
        <p style={{ color: C.body, fontSize: '1.05rem', lineHeight: 1.7, margin: '0 0 26px', maxWidth: 720 }}>
          VideoDoc is a free, personal, non-commercial portfolio project by Aryan Bajaj. This page explains in plain words what happens with your data, the rules for using VideoDoc, and who made the parts it is built on.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 26 }}>
          {[
            ['🔒', 'Your video stays with you', 'It is processed in your browser, on your computer. It is never uploaded.'],
            ['🙅', 'Nothing collected', 'No account, no sign-up, no analytics, no ads, no tracking cookies.'],
            ['🧑‍⚖️', 'You stay in charge', 'AI can make mistakes. Check every guide before you share it.'],
          ].map(([ic, t, d], i) => (
            <div key={i} style={{ background: 'rgba(109,74,255,0.1)', border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{ic}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{t}</div>
              <div style={{ color: C.dim, fontSize: '0.9rem', lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {[['#privacy', 'Privacy'], ['#terms', 'Terms of use'], ['#credits', 'Open source and credits'], ['#contact', 'Contact'], ['#changes', 'Changes']].map(([h, l]) => (
            <a key={h} href={h} onClick={(e) => { e.preventDefault(); document.querySelector(h)?.scrollIntoView({ behavior: 'smooth' }) }}
              style={{ fontSize: 13, color: C.ink, textDecoration: 'none', padding: '7px 14px', borderRadius: 100, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.03)' }}>{l}</a>
          ))}
        </div>

        <Section id="privacy" n="1" title="Privacy">
          <H>Your recordings</H>
          <p style={{ margin: 0 }}>Everything VideoDoc does with a recording (frames, speech to text, reading the screen, writing the guide, clips and exports) happens inside your browser on your own computer. Your video, its transcript and the guide are not uploaded to us or to anyone else. We cannot see them.</p>
          <H>What we do not collect</H>
          <UL items={['No account and no sign-up.', 'No analytics, no ads and no tracking cookies.', 'We do not sell or share any data, because we do not collect any.']} />
          <H>What your browser downloads, and from where</H>
          <UL items={[
            <>The website itself comes from <b>Netlify</b>, our host. Like any web host, Netlify may keep standard server logs (for example your IP address and the time of the request) for security and running the service. See <A href="https://www.netlify.com/privacy/">Netlify's privacy policy</A>.</>,
            <>The first time you use a feature, the AI models it needs are downloaded once, mainly from <b>Hugging Face</b>, and then kept in your browser's cache. Those servers see a normal download request. They never receive your video. See <A href="https://huggingface.co/privacy">Hugging Face's privacy policy</A>.</>,
          ]} />
          <H>Optional features</H>
          <UL items={[
            <><b>Ollama</b> runs on your own computer. When you choose it, the page talks to it at <code>localhost</code>, and Chrome may ask you to allow local network access. This traffic stays on your machine.</>,
            <><b>Search the web</b> in Vid Chat only runs when you click it. It opens a new tab on <b>Perplexity</b> with the question you typed, nothing else. Your video and your guide are not sent. Perplexity's own privacy policy applies there.</>,
            <><b>Vidi</b>, the help chat, answers from the help text of this website. It reads error messages shown on the page, and screenshots you paste, on your computer only. For written answers it uses Ollama on your computer or a small AI in your browser (downloaded once), never a server.</>,
          ]} />
          <H>What stays on your device</H>
          <p style={{ margin: 0 }}>Downloaded model files stay in your browser's storage so the next run starts faster. An exported HTML guide can remember your checklist ticks in that browser. Vidi remembers how you want it to answer (Ollama, browser AI or no AI) in this browser. To pick up where a run stopped (a crash, a closed tab, the computer going to sleep), the transcript and the screen text of the last video, and the parts already written, are kept in this browser's storage. The written parts are cleared when the guide is finished; the transcript and screen text stay, so the same video starts faster next time, until you choose another video, which replaces them. While a video is processed, the page asks the browser to keep the screen on, so the computer does not go to sleep halfway; this ends when processing ends or when you leave the tab. You can remove all of this at any time by clearing the site data in your browser settings.</p>
          <H>Your rights</H>
          <p style={{ margin: 0 }}>Under data protection law such as the GDPR you have rights over your personal data. VideoDoc itself holds no personal data about you. For hosting logs, contact Netlify. For any question about this page, see Contact below.</p>
        </Section>

        <Section id="terms" n="2" title="Terms of use">
          <UL items={[
            'VideoDoc is free to use. It is a personal portfolio project, provided as is, without any warranty. It may change, pause or stop at any time.',
            'AI output can be wrong or incomplete. Always check a guide before you share it or rely on it. You are responsible for the documents you create and share.',
            'Only use recordings you are allowed to use, and remove personal or confidential information before you share a guide.',
            'Do not use VideoDoc for anything illegal or to harm others.',
            limit ? `The online version accepts videos up to ${limit}, to protect your browser from running out of memory. The desktop app has no limit.` : 'Very long videos can use a lot of memory in the browser. The desktop app is better for those.',
            'Turning a video into a guide works your computer hard for a long time (memory, processor and, with some models, the graphics card). Keep the laptop plugged in, close programs you do not need and save your other work first.',
            'To the extent the law allows, there is no liability for any loss or damage from using VideoDoc. This does not limit liability that cannot be limited by law.',
          ]} />
        </Section>

        <Section id="credits" n="3" title="Open source and credits">
          <p style={{ margin: '0 0 10px' }}>The VideoDoc code is open source under the <A href={`${REPO}/blob/main/LICENSE`}>MIT license</A>. It is built on the work of these projects, each under its own license:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
            {[
              ['Whisper', 'OpenAI', 'MIT'], ['Transformers.js', 'Hugging Face', 'Apache 2.0'], ['Tesseract.js', 'Tesseract.js contributors', 'Apache 2.0'],
              ['WebLLM', 'MLC AI', 'Apache 2.0'], ['React', 'Meta', 'MIT'], ['Vite', 'Vite contributors', 'MIT'],
              ['jsPDF', 'jsPDF contributors', 'MIT'], ['docx', 'docx contributors', 'MIT'], ['Mermaid', 'Mermaid contributors', 'MIT'],
              ['three.js and Vanta.js', 'their contributors', 'MIT'], ['gifenc', 'Matt DesLauriers', 'MIT'], ['Lucide icons', 'Lucide contributors', 'ISC'],
            ].map(([n, by, l]) => (
              <div key={n} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 12px', fontSize: '0.9rem' }}>
                <b style={{ color: C.ink }}>{n}</b> <span style={{ color: C.dim }}>· {by} · {l}</span>
              </div>
            ))}
          </div>
          <H>AI models</H>
          <p style={{ margin: 0 }}>The AI models you pick are made by their own developers and come with their own licenses and use rules, for example Gemma by Google, Qwen by Alibaba Cloud, Phi by Microsoft and Llama by Meta. By using a model you accept its license.</p>
          <H>Names and trademarks</H>
          <p style={{ margin: 0 }}>All product and company names belong to their owners and are used only to describe compatibility. VideoDoc is not affiliated with, sponsored or endorsed by any of them. Example screens on this website show a demo app made for VideoDoc.</p>
        </Section>

        <Section id="contact" n="4" title="Contact">
          <p style={{ margin: 0 }}>Questions, ideas or a problem? Please open an issue on <A href={`${REPO}/issues`}>GitHub</A>. We usually answer there.</p>
        </Section>

        <Section id="changes" n="5" title="Changes to this page">
          <p style={{ margin: 0 }}>This page may be updated from time to time, for example when VideoDoc gets new features or the law changes. The date at the top always shows the latest version. Changes apply from the moment they are published here, so please check back now and then. If you keep using VideoDoc after a change, the updated page applies.</p>
        </Section>

        <p style={{ textAlign: 'center', color: C.dim, fontSize: '0.85rem', marginTop: 30 }}>
          <a href="/#/" style={{ color: C.acc, textDecoration: 'none' }}>← Back to VideoDoc</a>
        </p>
      </main>
    </div>
  )
}
