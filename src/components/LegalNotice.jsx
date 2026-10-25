import { useEffect } from 'react'
import VideoDocLogo from './VideoDocLogo'

// Legal notice (Impressum): who runs VideoDoc and how to reach them. A free, private, non-commercial
// project, so contact goes through GitHub. Keep it true: if VideoDoc ever sells or advertises
// something, a postal address and an email have to be added here (§ 5 DDG).
const UPDATED = '25 October 2026'
const REPO = 'https://github.com/Aryan-Bajaj/video-docs'
const C = { bg: '#0f0b24', card: 'rgba(28,18,55,0.7)', line: 'rgba(167,139,250,0.18)', ink: '#ece9ff', body: 'rgba(236,233,255,0.78)', dim: 'rgba(236,233,255,0.55)', acc: '#a78bfa' }
const A = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: C.acc }}>{children}</a>
const Box = ({ title, children }) => (
  <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '22px 26px', marginBottom: 16 }}>
    <h2 style={{ fontSize: '1.15rem', margin: '0 0 10px', color: C.ink }}>{title}</h2>
    <div style={{ color: C.body, lineHeight: 1.75, fontSize: '0.98rem' }}>{children}</div>
  </section>
)

export default function LegalNotice() {
  useEffect(() => { window.scrollTo(0, 0); document.title = 'VideoDoc · Legal notice' }, [])
  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(1200px 600px at 20% -10%, rgba(109,74,255,0.22), transparent), ${C.bg}`, color: C.ink, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(16px)', background: 'rgba(15,11,36,0.8)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/#/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.ink, fontWeight: 700 }}><VideoDocLogo size={26} /> VideoDoc</a>
          <span style={{ color: C.dim, fontSize: 13 }}>· Legal notice</span>
          <a href="/#/" style={{ marginLeft: 'auto', color: C.dim, fontSize: 13, textDecoration: 'none' }}>← Back to home</a>
        </div>
      </nav>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '44px 22px 70px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.acc, marginBottom: 10 }}>Last updated {UPDATED}</div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.6rem)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Legal notice <span style={{ color: C.dim, fontSize: '0.55em', fontWeight: 500 }}>(Impressum)</span></h1>
        <p style={{ color: C.body, fontSize: '1.05rem', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 720 }}>Who runs VideoDoc, and how to reach them.</p>

        <Box title="Who runs VideoDoc">
          <p style={{ margin: 0 }}><b style={{ color: C.ink }}>Aryan Bajaj</b>, as a private person, in Germany.</p>
          <p style={{ margin: '8px 0 0' }}>VideoDoc is a free, non-commercial, open-source portfolio project. Nothing is sold here, there are no ads, no payments and no paid plans, and no data is collected (see <a href="/#/policy" style={{ color: C.acc }}>Privacy, terms and credits</a>).</p>
        </Box>
        <Box title="Contact">
          <p style={{ margin: 0 }}>Please write through GitHub: open an issue at <A href={`${REPO}/issues`}>github.com/Aryan-Bajaj/video-docs/issues</A>, or find the author at <A href="https://github.com/Aryan-Bajaj">github.com/Aryan-Bajaj</A>.</p>
        </Box>
        <Box title="Responsible for the content">
          <p style={{ margin: 0 }}>Aryan Bajaj (contact as above).</p>
        </Box>
        <Box title="Not connected to other products">
          <p style={{ margin: 0 }}>VideoDoc is an independent hobby project. It is not connected to, sponsored or endorsed by any other product, company or service with a similar name, for example video consultation services in medicine. All product and company names on this website belong to their owners and are only used to describe what works with VideoDoc.</p>
        </Box>
        <Box title="Copyright">
          <p style={{ margin: 0 }}>The VideoDoc code is open source under the <A href={`${REPO}/blob/main/LICENSE`}>MIT license</A>. The texts, the logo and the pet drawings were made for VideoDoc. The open-source parts VideoDoc is built on keep their own licenses, listed under <a href="/#/policy" style={{ color: C.acc }}>Open source and credits</a>.</p>
        </Box>
        <Box title="Content and links">
          <p style={{ margin: 0 }}>The content of this website is written with care, but it may contain mistakes and is given without guarantee; guides and answers written by the AI must always be checked. Links to other websites lead to content that their owners are responsible for. When a link was added, no breaking of the law was visible there; if one becomes known, the link will be removed.</p>
        </Box>

        <p style={{ textAlign: 'center', color: C.dim, fontSize: '0.85rem', marginTop: 30 }}>
          <a href="/#/policy" style={{ color: C.acc, textDecoration: 'none' }}>Privacy, terms and credits</a> · <a href="/#/" style={{ color: C.acc, textDecoration: 'none' }}>← Back to VideoDoc</a>
        </p>
      </main>
    </div>
  )
}
