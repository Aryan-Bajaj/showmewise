import { useEffect, useRef, useState } from 'react'
import ShowMeWiseLogo from './ShowMeWiseLogo'
import { MAX_VIDEO_MB, MAX_VIDEO_MIN } from '../lib/limits'
import ProductDemo from './ProductDemo'
import LimitBanner from './LimitBanner'
import { PLUGIN_URL } from '../lib/links'
import HowItRuns from './HowItRuns'
import BeforeAfter from './BeforeAfter'
import DocChatDemo from './DocChatDemo'

// Primary: #3f62ff (electric blue)  Secondary: #a78bfa (violet)
// Accent:  #06b6d4 (cyan)           Warm:      #fbbf24 (amber)

const CSS = `
  @keyframes lp-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-18px) rotate(0.7deg); }
    66%       { transform: translateY(9px) rotate(-0.4deg); }
  }
  @keyframes lp-floatB {
    0%, 100% { transform: translateY(0px) translateX(0px); }
    50%       { transform: translateY(-24px) translateX(10px); }
  }
  @keyframes lp-pulse {
    0%, 100% { box-shadow: 0 0 24px rgba(63,98,255,0.4), 0 0 48px rgba(63,98,255,0.14); }
    50%       { box-shadow: 0 0 52px rgba(63,98,255,0.7), 0 0 96px rgba(63,98,255,0.28); }
  }
  @keyframes lp-pulse-green {
    0%, 100% { box-shadow: 0 0 24px rgba(52,211,153,0.4), 0 0 48px rgba(52,211,153,0.14); }
    50%       { box-shadow: 0 0 52px rgba(52,211,153,0.72), 0 0 96px rgba(52,211,153,0.28); }
  }
  @keyframes lp-shimmer {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
  @keyframes lp-leave {
    to { opacity: 0; transform: scale(1.03); }
  }
  @keyframes lp-dot-blink {
    0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
  }
  @keyframes lp-badge-glow {
    0%, 100% { box-shadow: 0 0 12px rgba(63,98,255,0.3); }
    50%       { box-shadow: 0 0 24px rgba(63,98,255,0.6), 0 0 48px rgba(63,98,255,0.18); }
  }

  .lp-card {
    transition: transform 0.35s cubic-bezier(.22,1,.36,1),
                border-color 0.3s ease, box-shadow 0.3s ease;
  }
  .lp-card:hover {
    transform: translateY(-6px) !important;
    border-color: rgba(63,98,255,0.4) !important;
    box-shadow: 0 28px 64px rgba(63,98,255,0.14),
                0 0 0 1px rgba(63,98,255,0.1),
                inset 0 1px 0 rgba(255,255,255,0.06) !important;
  }
  .lp-cta {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .lp-cta:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 60px rgba(63,98,255,0.65), 0 0 120px rgba(63,98,255,0.25) !important;
  }
  .lp-cta-g { transition: transform 0.25s ease, box-shadow 0.25s ease; }
  .lp-cta-g:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 60px rgba(52,211,153,0.6), 0 0 120px rgba(52,211,153,0.22) !important;
  }
  .lp-ghost {
    transition: border-color 0.25s, color 0.25s, background 0.25s;
  }
  .lp-ghost:hover {
    border-color: rgba(63,98,255,0.5) !important;
    color: #7b96ff !important;
    background: rgba(63,98,255,0.08) !important;
  }
  .lp-nav-btn {
    transition: background 0.2s, box-shadow 0.2s, color 0.2s;
  }
  .lp-nav-btn:hover {
    background: rgba(63,98,255,0.14) !important;
    box-shadow: 0 0 18px rgba(63,98,255,0.32) !important;
    color: #7b96ff !important;
  }

  html { scroll-behavior: smooth; }
  .lp-section { opacity: 0; transform: translateY(28px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
  .lp-section.lp-in { opacity: 1; transform: none; }
  .lp-shot { transition: transform .5s cubic-bezier(.22,1,.36,1), box-shadow .5s ease; }
  .lp-shot:hover { transform: translateY(-4px); box-shadow: 0 30px 80px rgba(20,10,60,.55), 0 0 0 1px rgba(167,139,250,.35) !important; }
  .lp-page { transition: transform .6s cubic-bezier(.22,1,.36,1); }
  .lp-page:hover { transform: rotate(0deg) translateY(-6px) !important; z-index: 2; }
  .lp-out-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 28px; align-items: center; }
  @media (prefers-reduced-motion: reduce) { .lp-section { opacity: 1; transform: none; transition: none; } * { animation: none !important; } }

  /* ── Mobile ──────────────────────────────────────────── */
  @media (max-width: 640px) {
    .lp-nav        { padding: 14px 20px !important; }
    .lp-nav-btn    { padding: 8px 12px !important; white-space: nowrap; font-size: 12.5px !important; }
    .lp-satellite  { display: none !important; }
    .lp-steps-line { display: none !important; }
    .lp-section    { padding: 64px 20px !important; }
    .lp-footer     { padding: 22px 20px 96px !important; }
    .lp-nav-howto  { display: none !important; }
    .lb-long       { display: none !important; }
    .lb-short      { display: inline !important; }
    .lp-mockup     { margin-top: 40px !important; }
    .lp-cta        { padding: 14px 28px !important; font-size: 0.95rem !important; }
    .lp-ghost      { padding: 14px 28px !important; font-size: 0.95rem !important; }
    .lp-fork-grid   { grid-template-columns: 1fr !important; }
    .lp-export-grid { grid-template-columns: 1fr !important; }
    .lp-v-split     { grid-template-columns: 1fr !important; }
    .lp-pipe-grid   { grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
    .lp-out-grid    { grid-template-columns: 1fr !important; }
  }
`

const PERSONAS = [
  {
    icon: '👨‍💻',
    role: 'Developers',
    hook: 'Stop re-explaining your codebase.',
    desc: 'Record a walkthrough once. ShowMeWise turns it into onboarding docs your whole team can follow. You only check and fix it.',
    color: '#3f62ff',
  },
  {
    icon: '👩‍🏫',
    role: 'Educators & Trainers',
    hook: 'Your tutorials deserve a second life.',
    desc: 'Every video lesson becomes a searchable, exportable step-by-step guide. Perfect for students who prefer reading over rewatching.',
    color: '#a78bfa',
  },
  {
    icon: '📋',
    role: 'Operations & PMs',
    hook: "Document before it lives only in your head.",
    desc: 'Screen-record any workflow. ShowMeWise produces an SOP your team can follow: formatted, visual, and ready to share.',
    color: '#06b6d4',
  },
  {
    icon: '🎨',
    role: 'Designers & Creators',
    hook: 'Show your process, not just your output.',
    desc: 'Turn design walkthroughs and process recordings into polished case studies or client handoffs. No writing from scratch.',
    color: '#fbbf24',
  },
]

const FEATURES = [
  {
    icon: '🎙',
    title: 'Accurate Transcription',
    desc: 'Whisper Small runs via WebAssembly right in your tab, good for clear speech. For names, codes and mixed languages, choose Accurate (Whisper large v3 turbo). No API key, no rate limits, no cost per minute.',
    color: '#3f62ff',
  },
  {
    icon: '👁',
    title: 'Sees Your Screen (Vision)',
    desc: 'The AI looks at the actual screenshots, not just OCR text, so it names the exact buttons, menus and tabs, and works out "click here" by seeing where you clicked.',
    color: '#22d3ee',
  },
  {
    icon: '🎬',
    title: 'Marked Screenshots and Clips',
    desc: 'Each action is pinned to its exact button with a numbered marker, on the screenshot and in a short clip of the real action. Built in your browser, embedded in the guide.',
    color: '#f472b6',
  },
  {
    icon: '📋',
    title: 'A Real Desktop Procedure',
    desc: 'Not loose notes, but a real process manual: cover, contents, purpose, what you need, the process at a glance, Part A, B, C with numbered actions, a checklist, quick reference and FAQ.',
    color: '#a78bfa',
  },
  {
    icon: '💬',
    title: 'Vid Chat',
    desc: 'Ask your recording anything. It finds the right step and answers, with the matching frame and a jump-to-moment link. Not in the doc? Get the AI model’s own answer, or search the web in one click.',
    color: '#34d399',
  },
  {
    icon: '🔒',
    title: 'Runs Fully in Your Browser',
    desc: 'Speech, OCR, the AI model, embeddings and clips all run on your computer. Use the browser model, or Ollama for the strongest results. Your video never leaves your machine.',
    color: '#fbbf24',
  },
]

export default function LandingPage() {
  const vantaRef = useRef(null)
  const vantaEffect = useRef(null)
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Ramps to full dim after 60% of one viewport scroll
  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(window.scrollY / (window.innerHeight * 0.6), 1)
      setOverlayOpacity(progress * 0.92)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Sections fade up as they scroll into view
  useEffect(() => {
    const els = document.querySelectorAll('.lp-section')
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('lp-in')); return }
    const io = new IntersectionObserver((en) => en.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('lp-in'); io.unobserve(e.target) }
    }), { threshold: 0.08 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!vantaRef.current || !window.VANTA?.NET) return
    // Decorative only — never let a WebGL failure crash the landing page.
    try {
      vantaEffect.current = window.VANTA.NET({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0x3f62ff,
        backgroundColor: 0x23153c,
        // a phone shows the same net in a narrow column, right behind the
        // hero text: thinner there so the words stay easy to read
        points: innerWidth < 640 ? 6 : 10,
        maxDistance: innerWidth < 640 ? 15 : 20,
        spacing: innerWidth < 640 ? 20 : 15,
        showDots: true,
      })
    } catch (e) {
      console.warn('Vanta background disabled (no WebGL):', e?.message)
    }
    return () => { try { vantaEffect.current?.destroy() } catch {} }
  }, [])

  const handleEnter = () => {
    setLeaving(true)
    setTimeout(() => { window.location.href = '/#/app' }, 550)
  }
  const handleDocChat = () => {
    setLeaving(true)
    setTimeout(() => { window.location.href = '/#/docchat' }, 550)
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Vanta fixed background */}
      <div ref={vantaRef} style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0,
      }} />

      {/* Scroll-linked dimmer */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'rgba(20,12,45,0.95)',
        opacity: overlayOpacity,
        transition: 'opacity 0.08s linear',
      }} />

      {/* Scanline texture */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
      }} />

      {/* Scrollable content */}
      <div style={{
        position: 'relative', zIndex: 3,
        minHeight: '100vh',
        color: '#fff',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        overflowX: 'hidden',
        opacity: ready ? 1 : 0,
        transition: leaving ? 'none' : 'opacity 0.9s ease',
        animation: leaving ? 'lp-leave 0.55s ease forwards' : 'none',
      }}>

        {/* ── Nav ─────────────────────────────────────────────── */}
        <nav className="lp-nav" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: '18px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(35,21,60,0.75)',
          backdropFilter: 'blur(22px)',
          borderBottom: '1px solid rgba(63,98,255,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShowMeWiseLogo size={30} />
            <span style={{
              fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #7b96ff, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>ShowMeWise</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href="/#/howto" className="lp-nav-howto" style={{ color: 'rgba(236,233,255,0.75)', fontSize: 13, textDecoration: 'none', padding: '9px 8px' }}>How to use</a>
            <a href="/#/pet-training" className="lp-nav-howto" style={{ color: 'rgba(236,233,255,0.75)', fontSize: 13, textDecoration: 'none', padding: '9px 8px' }}>Pet training</a>
            <button onClick={handleDocChat} className="lp-nav-btn" style={{
              padding: '9px 18px', borderRadius: 100,
              background: 'transparent', border: '1px solid rgba(52,211,153,0.4)',
              color: 'rgba(110,231,183,0.95)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              Doc Chat
            </button>
            <button onClick={handleEnter} className="lp-nav-btn" style={{
              padding: '9px 18px', borderRadius: 100,
              background: 'transparent', border: '1px solid rgba(63,98,255,0.4)',
              color: 'rgba(123,150,255,0.95)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              Video → Docs
            </button>
          </div>
          <LimitBanner />
        </nav>

        {/* ── Hero ────────────────────────────────────────────── */}
        <section style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          padding: '170px 24px 70px', // room for the fixed bar and the limits strip under it
        }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 100,
            background: 'rgba(63,98,255,0.1)',
            border: '1px solid rgba(63,98,255,0.28)',
            fontSize: 11, color: '#7b96ff',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 36,
            animation: 'lp-badge-glow 3.5s ease-in-out infinite',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#3f62ff',
              display: 'inline-block',
              animation: 'lp-dot-blink 1.8s ease-in-out infinite',
            }} />
            Free · Private · No sign-up required
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(3.8rem, 11vw, 9rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            marginBottom: 28,
            background: 'linear-gradient(135deg, #ffffff 0%, #7b96ff 30%, #a78bfa 60%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundSize: '200% auto',
            animation: 'lp-shimmer 4.5s linear infinite',
          }}>
            ShowMeWise
          </h1>

          <p style={{
            fontSize: 'clamp(1.1rem, 2.8vw, 1.65rem)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.75)',
            maxWidth: 600, lineHeight: 1.5, marginBottom: 16,
          }}>
            If you recorded it, we'll document it.
          </p>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.68)',
            maxWidth: 540, lineHeight: 1.75, marginBottom: 52,
          }}>
            Record your screen once. ShowMeWise listens, reads and looks at every step, then hands you a
            finished guide with the clicks marked on the screen. Your video never leaves your computer.
            No account, no subscription.
          </p>

          {/* Flow chips: Record → Document → Ask */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}>
            {[
              { icon: '🎬', label: 'Record', c: '#3f62ff' },
              { icon: '📄', label: 'Document', c: '#a78bfa' },
              { icon: '💬', label: 'Vid Chat', c: '#34d399' },
            ].map((s, i) => (
              <span key={i} style={{ display: 'contents' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: 100, background: `${s.c}14`, border: `1px solid ${s.c}3a`, color: s.c, fontSize: '0.85rem', fontWeight: 600 }}>
                  <span style={{ fontSize: 15 }}>{s.icon}</span>{s.label}
                </span>
                {i < 2 && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>→</span>}
              </span>
            ))}
          </div>

          {/* CTAs — pick an app */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handleEnter} className="lp-cta" style={{
              padding: '15px 38px', borderRadius: 100,
              background: 'linear-gradient(135deg, #3f62ff 0%, #a78bfa 100%)',
              border: 'none', color: '#fff',
              cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow: '0 0 32px rgba(63,98,255,0.42), 0 0 64px rgba(63,98,255,0.14)',
              animation: 'lp-pulse 3.5s ease-in-out infinite',
            }}>
              🎬 Video → Docs
            </button>

            <button onClick={handleDocChat} className="lp-cta-g" style={{
              padding: '15px 38px', borderRadius: 100,
              background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
              border: 'none', color: '#06231c',
              cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow: '0 0 32px rgba(52,211,153,0.35)',
              animation: 'lp-pulse-green 3.5s ease-in-out infinite',
            }}>
              💬 Doc → Chat
            </button>

            <button
              onClick={() => document.getElementById('lp-how')?.scrollIntoView({ behavior: 'smooth' })}
              className="lp-ghost"
              style={{
                padding: '15px 32px', borderRadius: 100,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.62)',
                cursor: 'pointer', fontSize: '1rem', fontWeight: 500,
              }}>
              See how it works ↓
            </button>

            {/* a finished guide, made by ShowMeWise from our public demo video: see the result before waiting for a run */}
            <a href="/example/" target="_blank" rel="noopener" className="lp-ghost"
              style={{
                padding: '15px 32px', borderRadius: 100,
                background: 'transparent',
                border: '1px solid rgba(167,139,250,0.45)',
                color: '#e4dcff', textDecoration: 'none',
                cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
              }}>
              📄 See an example guide
            </a>
          </div>
          <a href="/#/check" style={{ display: 'inline-block', marginTop: 14, color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem' }}>
            No Ollama? Test my computer first (about 2 minutes)
          </a>
          {PLUGIN_URL && (
            <a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 50, padding: '9px 14px', borderRadius: 100, background: '#1b1342', border: '1px solid rgba(124,92,255,0.6)', color: '#fff', textDecoration: 'none', fontSize: 13.5, fontWeight: 600, boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
              ＋ Get the browser plugin
            </a>
          )}


          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
            marginTop: 52, marginBottom: 56,
          }}>
            {[
              { value: '0 uploads', label: 'your video stays on your device', color: '#3f62ff' },
              { value: 'Free',      label: 'no account, no API key', color: '#a78bfa' },
              { value: 'Any app',   label: 'web or desktop recordings', color: '#06b6d4' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800,
                  color: s.color, letterSpacing: '-0.02em',
                  textShadow: `0 0 30px ${s.color}55`,
                }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.56)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {(MAX_VIDEO_MIN || MAX_VIDEO_MB) ? (
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.66)', marginTop: -30, marginBottom: 10 }}>
              Videos up to {MAX_VIDEO_MIN ? `${MAX_VIDEO_MIN} minutes` : ''}{MAX_VIDEO_MIN && MAX_VIDEO_MB ? ' or ' : ''}{MAX_VIDEO_MB ? `${MAX_VIDEO_MB} MB` : ''} · MP4, MOV or WEBM
            </p>
          ) : null}

        </section>

        {/* ── Real output: marked screenshots + document pages ─── */}
        <section id="lp-output" className="lp-section" style={{ padding: '30px 24px 110px', maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 42 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 12 }}>New · Marked screenshots</div>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.3rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 14 }}>
              Where to click,{' '}
              <span style={{ background: 'linear-gradient(90deg, #a78bfa, #3f62ff, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>marked on the screen</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.06rem', maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
              ShowMeWise finds the exact button for each action and marks it with a number. No more hunting for "which button?".
              The same marks appear in the step clips, the PDF and the Word file. And when a button can't be read on screen,
              ShowMeWise leaves that action unmarked instead of guessing.
            </p>
          </div>
          <div className="lp-out-grid">
            <figure className="lp-shot" style={{ margin: 0, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.28)', boxShadow: '0 24px 70px rgba(20,10,60,0.5)', background: '#0f0b24' }}>
              <img src="/landing/marked-dialog.jpg" alt="A screenshot with numbered markers on the name field, the template and the Create button" loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
              <figcaption style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.72)', background: 'rgba(28,18,55,0.9)' }}>
                One popup, three actions, three markers: type the name, pick the template, click Create.
              </figcaption>
            </figure>
            <div style={{ position: 'relative', minHeight: 380, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img className="lp-page" src="/landing/guide-word.jpg" alt="A page of the Word guide" loading="lazy" style={{ position: 'absolute', width: '62%', transform: 'rotate(-5deg) translateX(-26%)', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }} />
              <img className="lp-page" src="/landing/guide-pdf.jpg" alt="A page of the PDF guide" loading="lazy" style={{ position: 'relative', width: '62%', transform: 'rotate(4deg) translateX(18%)', borderRadius: 8, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 34 }}>
            {['Cover and contents', 'Before you start', 'Process at a glance', 'Part A, B, C with numbered actions', 'Marked screenshots', 'Checklist', 'Quick reference', 'Questions and answers'].map((t, i) => (
              <span key={i} style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)', padding: '7px 14px', borderRadius: 100, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>{t}</span>
            ))}
          </div>
        </section>

        {/* ── Before / After ──────────────────────────────────── */}
        <section style={{ padding: '0 24px 80px', maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12,
          }}>
            Raw video{' '}
            <span style={{ background: 'linear-gradient(90deg, #3f62ff, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              vs
            </span>
            {' '}ShowMeWise output
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: 28 }}>
            Drag to compare. Left: the raw one-minute recording. Right: the guide ShowMeWise made from it.
          </p>
          <BeforeAfter />
        </section>

        {/* ── How it actually happens (live demo) ─────────────── */}
        <section style={{
          padding: '0 24px 80px', maxWidth: 900, margin: '0 auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            How it actually happens
          </div>
          <ProductDemo />
        </section>

        {/* ── Story beat ──────────────────────────────────────── */}
        <section style={{ padding: '0 24px 80px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            padding: '32px 40px',
            borderRadius: 18,
            background: 'rgba(63,98,255,0.06)',
            border: '1px solid rgba(63,98,255,0.15)',
            backdropFilter: 'blur(12px)',
          }}>
            <p style={{
              fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.8,
              margin: 0,
              fontStyle: 'italic',
              fontWeight: 300,
            }}>
              "Documentation is the one thing everyone agrees must be done, and the first thing no one actually wants to do.
              Training done. Process notes pending. Motivation missing.
              ShowMeWise gets it done before you even think twice."
            </p>
          </div>
        </section>

        {/* ── Who it's for ────────────────────────────────────── */}
        <section className="lp-section" style={{ padding: '60px 24px 100px', maxWidth: 1080, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(2rem, 5vw, 3.4rem)',
            fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 14,
          }}>
            Made for anyone who{' '}
            <span style={{
              background: 'linear-gradient(90deg, #7b96ff, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              records to explain
            </span>
          </h2>
          <p style={{
            textAlign: 'center', color: 'rgba(255,255,255,0.64)',
            fontSize: '1.05rem', marginBottom: 52,
          }}>
            If you've ever recorded something and thought "I should write this up",
            ShowMeWise is for you.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 18,
          }}>
            {PERSONAS.map((p, i) => (
              <div key={i} className="lp-card" style={{
                padding: '28px 24px', borderRadius: 16,
                background: 'rgba(28,18,55,0.65)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
                cursor: 'default',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{p.icon}</div>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: p.color, marginBottom: 8,
                }}>
                  {p.role}
                </div>
                <p style={{
                  fontSize: '0.975rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.88)', lineHeight: 1.4, marginBottom: 10,
                }}>
                  {p.hook}
                </p>
                <p style={{
                  fontSize: '0.85rem', color: 'rgba(255,255,255,0.64)',
                  lineHeight: 1.65, margin: 0,
                }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────── */}
        <section className="lp-section" style={{ padding: '100px 24px', maxWidth: 1080, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(2rem, 5vw, 3.4rem)',
            fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 14,
          }}>
            The tools that make it{' '}
            <span style={{
              background: 'linear-gradient(90deg, #7b96ff, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              actually happen
            </span>
          </h2>
          <p style={{
            textAlign: 'center', color: 'rgba(255,255,255,0.64)',
            fontSize: '1.05rem', marginBottom: 56,
          }}>
            A complete pipeline that runs in your browser, no installs, no cloud, no compromises on privacy.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 18,
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-card" style={{
                padding: '28px 22px', borderRadius: 16,
                background: 'rgba(28,18,55,0.65)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                cursor: 'default',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                <div style={{ fontSize: 34, marginBottom: 16, filter: `drop-shadow(0 0 9px ${f.color})` }}>
                  {f.icon}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: f.color, marginBottom: 10,
                }}>
                  {f.title}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Talk to your documentation (RAG) ────────────────── */}
        <section className="lp-section" style={{ padding: '90px 24px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#34d399', marginBottom: 12 }}>
              New · Vid Chat
            </div>
            <h2 style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 14 }}>
              Don't just read it.{' '}
              <span style={{ background: 'linear-gradient(90deg, #34d399, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vid Chat it.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.66)', fontSize: '1.05rem', maxWidth: 640, margin: '0 auto', lineHeight: 1.7 }}>
              Once your guide is built, ask it anything. It finds the exact step, answers in plain language, and shows you the matching frame with a jump-to-moment link. Retrieval runs in your browser, no API keys. And if something is not in your document, it tells you so honestly, then offers the AI model's own answer or a web search in a new tab. Only your question goes to the search, never your video.
            </p>
          </div>
          <DocChatDemo />
        </section>

        {/* ── How it exactly works ────────────────────────────── */}
        <section id="lp-how" className="lp-section" style={{ padding: '80px 24px 100px', maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 14,
          }}>
            How it{' '}
            <span style={{ background: 'linear-gradient(90deg, #3f62ff, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              exactly
            </span>
            {' '}works
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.64)', fontSize: '1.05rem', marginBottom: 60 }}>
            Full transparency on every step. Where your data goes, how it's processed, what to expect.
          </p>

          {/* ── Main pipeline row ── */}
          <div style={{ position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute', top: 33, left: '12%', right: '12%', height: 1,
              background: 'linear-gradient(90deg, #3f62ff55, #a78bfa55, #06b6d455, #fbbf2455)',
              pointerEvents: 'none',
            }} />

            <div className="lp-pipe-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
              {[
                {
                  icon: '🎬', color: '#3f62ff', num: '01', title: 'Upload Video',
                  desc: 'Loaded into browser memory. Stays on your device.',
                  chips: [{ label: '0 bytes sent', c: '#3f62ff' }, { label: 'Browser only', c: '#06b6d4' }],
                },
                {
                  icon: '👁', color: '#22d3ee', num: '02', title: 'Extract + See Screen',
                  desc: 'Frames and audio pulled out, then the AI reads the screen with Vision or OCR, naming exact elements and detecting the tools you used.',
                  chips: [{ label: 'Vision / OCR', c: '#22d3ee' }, { label: 'Tools detected', c: '#a78bfa' }],
                },
                {
                  icon: '🎧', color: '#06b6d4', num: '03', title: 'Transcribe + Chunk',
                  desc: 'Whisper Small runs in a Web Worker. Long transcripts are grouped into windows for fast, coherent passes.',
                  chips: [{ label: 'Whisper Small', c: '#06b6d4' }, { label: 'Long-video ready', c: '#3f62ff' }],
                },
                {
                  icon: '🚀', color: '#fbbf24', num: '04', title: 'Export',
                  desc: 'A full Desktop Procedure: HTML with sharp WebM step clips, plus clean PDF and DOCX, all generated locally.',
                  chips: [{ label: 'Step clips', c: '#fbbf24' }, { label: 'PDF / DOCX', c: '#a78bfa' }],
                },
                {
                  icon: '💬', color: '#34d399', num: '05', title: 'Vid Chat',
                  desc: 'Ask your recording anything. In-browser RAG finds the right step and answers with the matching frame.',
                  chips: [{ label: 'RAG chat', c: '#34d399' }, { label: 'Cites the step', c: '#22d3ee' }],
                },
              ].map((node, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', gap: 8,
                }}>
                  {/* Circle icon */}
                  <div style={{
                    width: 66, height: 66, borderRadius: '50%', flexShrink: 0,
                    background: `radial-gradient(circle, ${node.color}1c 0%, ${node.color}07 70%)`,
                    border: `2px solid ${node.color}45`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, zIndex: 1, position: 'relative',
                    boxShadow: `0 0 20px ${node.color}28`,
                  }}>
                    {node.icon}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: node.color, opacity: 0.6 }}>
                    {node.num}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
                    {node.title}
                  </span>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.64)', lineHeight: 1.55, margin: 0 }}>
                    {node.desc}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                    {node.chips.map((chip, ci) => (
                      <span key={ci} style={{
                        padding: '3px 9px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                        background: `${chip.c}18`, border: `1px solid ${chip.c}40`, color: chip.c,
                      }}>{chip.label}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── AI fork ── */}
          <div style={{ marginTop: 24, position: 'relative' }}>
            {/* Connector line down from step 3 */}
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 1, height: 28,
              background: 'linear-gradient(180deg, rgba(63,98,255,0.5), transparent)',
            }} />
            <div style={{
              textAlign: 'center', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)', paddingTop: 30, marginBottom: 16,
            }}>
              AI Annotation, auto-detected
            </div>

            <div className="lp-fork-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Ollama */}
              <div style={{
                padding: '24px 22px', borderRadius: 16,
                background: 'rgba(63,98,255,0.07)',
                border: '1px solid rgba(63,98,255,0.25)',
                backdropFilter: 'blur(14px)',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                    boxShadow: '0 0 8px #22c55e',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ollama detected</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 100,
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    color: '#86efac', letterSpacing: '0.05em',
                  }}>RECOMMENDED</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.66)', lineHeight: 1.6, marginBottom: 16 }}>
                  ShowMeWise pings <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>localhost:11434</code> at startup.
                  If Ollama is running, it auto-lists your installed models.
                  Best results with a vision model like gemma3, so the AI can see the screen.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Steps fully right (gemma3 12B, real work videos)', val: 64, color: '#3f62ff', note: '60 to 67.5 %' },
                    { label: 'Privacy',         val: 100, color: '#22c55e' },
                    { label: 'Time (16 GB laptop, no graphics card)', val: 35, color: '#fbbf24', note: '10 min video: about 1¾ h' },
                  ].map((bar, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)' }}>{bar.label}</span>
                        <span style={{ fontSize: 11, color: bar.color }}>{bar.note ?? `${bar.val}%`}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${bar.val}%`, height: '100%', background: bar.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
                  {['Fully private', 'Best quality', 'Any Ollama model'].map((t, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                      background: 'rgba(63,98,255,0.15)', border: '1px solid rgba(63,98,255,0.3)',
                      color: '#7b96ff',
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* WebLLM */}
              <div style={{
                padding: '24px 22px', borderRadius: 16,
                background: 'rgba(167,139,250,0.07)',
                border: '1px solid rgba(167,139,250,0.2)',
                backdropFilter: 'blur(14px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#a78bfa',
                    boxShadow: '0 0 8px #a78bfa',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>WebLLM fallback</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 100,
                    background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                    color: '#c4b5fd', letterSpacing: '0.05em',
                  }}>NO INSTALL</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.66)', lineHeight: 1.6, marginBottom: 14 }}>
                  No Ollama? ShowMeWise runs the model right in your browser via WebGPU, including a Vision model that reads the screen. Test my computer picks the size that fits, and you can change it; nothing changes behind your back. Needs a WebGPU browser (Chrome 113+).
                </p>
                {/* In-browser model picker — user chooses speed vs accuracy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                  {[
                    { label: 'Small · 1B',  size: '~0.9 GB', acc: 'chat only, too weak for guides' },
                    { label: 'Medium · 1.5B', size: '~1 GB', acc: 'first drafts of guides', tag: 'Usual choice' },
                    { label: 'Large · 3B',  size: '~1.9 GB', acc: 'not measured yet, needs more memory' },
                    { label: 'Vision · 4.2B', size: '~3.5 GB', acc: 'looks at the screen, not measured yet' },
                  ].map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.18)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{m.label}</span>
                      {m.tag && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 100, background: 'rgba(34,197,94,0.18)', color: '#86efac' }}>{m.tag}</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.64)' }}>{m.size} · {m.acc}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Steps fully right (Medium, 1-minute demo)', val: 40, color: '#a78bfa', note: '6 of 15 (11 found)' },
                    { label: 'Privacy',         val: 100, color: '#22c55e' },
                    { label: 'Time (1-minute demo, Medium)', val: 70, color: '#fbbf24', note: 'about 10 min' },
                  ].map((bar, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)' }}>{bar.label}</span>
                        <span style={{ fontSize: 11, color: bar.color }}>{bar.note ?? `${bar.val}%`}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${bar.val}%`, height: '100%', background: bar.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
                  {['Zero install', 'Pick your model', 'Still private', 'Needs Chrome 113+'].map((t, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                      background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                      color: '#c4b5fd',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Export formats row */}
            <div style={{ marginTop: 24 }}>
              <div style={{
                textAlign: 'center', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)', marginBottom: 16,
              }}>
                Export, pick your format
              </div>
              <div className="lp-export-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  {
                    icon: '🌐', label: 'HTML Guide', color: '#06b6d4',
                    features: ['Marked screenshots, click to enlarge', 'Step clips with the same markers', 'Checklist that remembers your ticks', 'One file, opens in any browser'],
                  },
                  {
                    icon: '📄', label: 'PDF', color: '#a78bfa',
                    features: ['Cover, contents and page numbers', 'Marked screenshots with captions', 'Tick-box checklist for paper', 'Looks the same everywhere'],
                  },
                  {
                    icon: '📝', label: 'DOCX', color: '#fbbf24',
                    features: ['The same manual, fully editable', 'Tables and marked screenshots kept', 'Add your own notes and logo', 'Opens in Word and similar apps'],
                  },
                ].map((fmt, i) => (
                  <div key={i} style={{
                    padding: '18px 16px', borderRadius: 12,
                    background: 'rgba(28,18,55,0.65)',
                    border: `1px solid ${fmt.color}20`,
                    backdropFilter: 'blur(12px)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 20, filter: `drop-shadow(0 0 5px ${fmt.color})` }}>{fmt.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: fmt.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{fmt.label}</span>
                    </div>
                    {fmt.features.map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: fmt.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.66)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── First-run downloads ──────────────────────────────── */}
        <section className="lp-section" style={{ padding: '70px 24px 90px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7b96ff', marginBottom: 12 }}>
              One-time setup
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.2vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 14 }}>
              What downloads the{' '}
              <span style={{ background: 'linear-gradient(90deg, #3f62ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>first time</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.66)', fontSize: '1.02rem', maxWidth: 660, margin: '0 auto', lineHeight: 1.7 }}>
              Because everything runs on your machine instead of a server, the AI models download once on first use, then stay cached in your browser. Every run after that starts right away.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: '🎙', name: 'Whisper Small (speech to text)', size: '~970 MB', when: 'On your first video. The standard speech model, good for clear speech.', color: '#06b6d4' },
              { icon: '🎧', name: 'Accurate speech (optional)', size: '~1.6 GB', when: 'Only when you choose Accurate. Whisper large v3 turbo: hears names, codes and mixed languages better, slower without a fast graphics card.', color: '#0ea5e9' },
              { icon: '🧠', name: 'WebLLM (writes the steps)', size: '~0.8 to 2.2 GB', when: 'First guide with the browser AI. Small (Llama 3.2 1B), Medium (Qwen2.5 1.5B, the usual choice) or Large (Qwen2.5 3B); Test my computer picks one', color: '#a78bfa' },
              { icon: '👁', name: 'Vision model (optional)', size: '~3.5 GB', when: 'Browser Vision mode, where the AI sees the screen (Phi-3.5-Vision). With Ollama, gemma3 does this, no download.', color: '#7b96ff' },
              { icon: '💬', name: 'Embeddings (doc chat)', size: '~90 MB', when: 'First time you ask your documentation a question', color: '#34d399' },
              { icon: '🔤', name: 'OCR (reads the screen)', size: '~12 MB', when: 'Reads on-screen text from frames (used when not in Vision mode)', color: '#22d3ee' },
            ].map((m, i) => (
              <div key={i} style={{ borderRadius: 16, padding: '24px 22px', background: 'rgba(28,18,55,0.6)', border: `1px solid ${m.color}30`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 30, marginBottom: 12, filter: `drop-shadow(0 0 8px ${m.color})` }}>{m.icon}</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>{m.name}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: m.color, letterSpacing: '-0.02em', marginBottom: 8 }}>{m.size}</div>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.64)', lineHeight: 1.55, margin: 0 }}>{m.when}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {['Downloaded once', 'Cached in your browser', 'Instant after first run', 'Skip WebLLM with Ollama'].map((t, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', padding: '6px 14px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>✓ {t}</span>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'rgba(255,255,255,0.56)', marginTop: 18, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Tip: tech users can run Ollama instead of WebLLM. It skips the large browser download, runs Vision natively with gemma3, and gives the strongest results.
          </p>
        </section>

        {/* ── V1 → V2 → V3 progression ─────────────────────────── */}
        <section className="lp-section" style={{ padding: '90px 24px', maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 12 }}>
              How far it's come
            </div>
            <h2 style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', fontWeight: 700, letterSpacing: '-0.025em' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>v1</span>{' → '}
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>v2</span>{' → '}
              <span style={{ color: 'rgba(255,255,255,0.52)' }}>v3</span>{' → '}
              <span style={{ color: 'rgba(255,255,255,0.66)' }}>v4</span>{' → '}
              <span style={{ background: 'linear-gradient(90deg, #3f62ff, #22d3ee, #a78bfa, #3f62ff)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'lp-shimmer 4s linear infinite' }}>v5</span>
            </h2>
          </div>

          <div className="lp-v-split" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {/* V2 */}
            <div style={{ borderRadius: 18, padding: '24px 22px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.68)', marginBottom: 16 }}>v2 · then</div>
              {[
                ['🧩', 'Smart chunking for long videos'],
                ['👁', 'OCR reads the on-screen text'],
                ['🎞', 'Animated step GIFs'],
                ['💬', 'RAG chat with your docs'],
                ['🧠', 'Llama 3.2 3B browser model'],
                ['🎧', 'Audio-only understanding'],
              ].map(([ic, t], i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 0', fontSize: '0.86rem', color: 'rgba(255,255,255,0.62)' }}>
                  <span style={{ flexShrink: 0, opacity: 0.7 }}>{ic}</span>{t}
                </div>
              ))}
            </div>

            {/* V3 */}
            <div style={{ borderRadius: 18, padding: '24px 22px', background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.13)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>v3 · then</div>
              {[
                ['👁', 'It sees the screen, not just OCR text'],
                ['🎙', 'A far sharper transcript with Whisper Small'],
                ['📋', 'A real Desktop Procedure (Index, Purpose, FAQ, flow)'],
                ['🎬', 'Crisp WebM step clips, sharper than GIFs'],
                ['❓', 'RAG-grounded FAQ and a clean phased flow'],
                ['🧭', 'Steps name the app, ribbon and tab'],
              ].map(([ic, t], i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 0', fontSize: '0.86rem', color: 'rgba(255,255,255,0.72)' }}>
                  <span style={{ flexShrink: 0, opacity: 0.8 }}>{ic}</span>{t}
                </div>
              ))}
            </div>

            {/* V4 */}
            <div style={{ borderRadius: 18, padding: '24px 22px', background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.16)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', marginBottom: 16 }}>v4 · the trust release</div>
              {[
                ['🔍', 'Looks at the screen first, then writes'],
                ['🎯', 'A new step exactly where the screen changed'],
                ['🛡', 'Every step checked against the screen and the speech'],
                ['✍️', 'Fix, reorder or delete steps before you share'],
                ['⏱', 'Tells you how long it will take, shows steps as it works'],
              ].map(([ic, t], i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 0', fontSize: '0.86rem', color: 'rgba(255,255,255,0.78)' }}>
                  <span style={{ flexShrink: 0, opacity: 0.85 }}>{ic}</span>{t}
                </div>
              ))}
            </div>

            {/* V5 */}
            <div className="lp-card" style={{ position: 'relative', borderRadius: 18, padding: '24px 22px', background: 'linear-gradient(160deg, rgba(109,74,255,0.18), rgba(34,211,238,0.06))', border: '1px solid rgba(167,139,250,0.5)', boxShadow: '0 0 40px rgba(109,74,255,0.18)' }}>
              <div style={{ position: 'absolute', top: -11, right: 16, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: 'linear-gradient(135deg, #6d4aff, #22d3ee)', padding: '4px 11px', borderRadius: 100 }}>Now</div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4b5fd', marginBottom: 16 }}>v5 · the manual release</div>
              {[
                ['📍', 'Clicks marked on the screenshot'],
                ['🎬', 'The same markers inside the step clips'],
                ['📘', 'A real process manual in PDF, Word and HTML'],
                ['🔘', 'Reads coloured buttons and popups'],
                ['🧩', 'Short how-tos split into clean steps'],
                ['⏺', 'Record your screen right here, with your voice'],
                ['🔑', 'Key words: names and codes spelled right'],
                ['↩️', 'Picks up where it stopped after a crash or sleep'],
              ].map(([ic, t], i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 0', fontSize: '0.86rem', color: 'rgba(255,255,255,0.92)' }}>
                  <span style={{ flexShrink: 0 }}>{ic}</span>{t}
                </div>
              ))}
            </div>
          </div>

          <p style={{ textAlign: 'center', maxWidth: 760, margin: '32px auto 0', fontSize: '1.06rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.64)' }}>
            <span style={{ background: 'linear-gradient(90deg,#7b96ff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>Why v5 matters:</span>{' '}
            v3 taught it to <em>see and hear like a person</em>. v4 made it <em>honest</em>. v5 makes it <em>easy to follow</em>: every action points at the exact spot on the screen, in a document that reads like a real manual.
          </p>
        </section>

        <HowItRuns />

        {/* ── The browser plugin ───────────────────────────────── */}
        <section id="lp-plugin" className="lp-section" style={{ padding: '40px 24px 60px', maxWidth: 940, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22d3ee', marginBottom: 12 }}>
              New · browser plugin
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.2vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.025em' }}>ShowMeWise, one click away</h2>
            <p style={{ maxWidth: 620, margin: '14px auto 0', fontSize: '0.98rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.64)' }}>
              A small window under the ShowMeWise icon in your browser bar. For Chrome and Edge, free on the Chrome Web Store.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[
              ['⏺', 'Record any app', 'The whole screen, one window or a tab, with your voice. Press Stop, check the recording, then make the guide.'],
              ['🔔', 'Small and quiet', 'The steps and the time left in a small window, and a notification when your guide is ready.'],
              ['💬', 'Ask Vidi anything', 'About your video, the page you are on, a PDF or Word file, or ShowMeWise itself.'],
              ['🔗', 'Looks behind links', 'Not on the page? Vidi reads the links that match your question (same site) and tells you which.'],
              ['📍', 'Show me on the page', 'Vidi marks the right button on the real page and puts a screenshot in the chat. It never clicks for you.'],
              ['🔒', 'Same privacy', 'It runs on your computer through the ShowMeWise website. One model download for both.'],
            ].map(([ic, title, desc], i) => (
              <div key={i} style={{ borderRadius: 16, padding: '22px 20px', background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.18)' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: 8 }}><span style={{ marginRight: 8 }}>{ic}</span>{title}</div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.66)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Limits: told up front (same facts as the "limits" part in lib/howto.js) ── */}
        <section id="lp-limits" className="lp-section" style={{ padding: '40px 24px 60px', maxWidth: 940, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7b96ff', marginBottom: 12 }}>
              Good to know
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.2vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.025em' }}>Free and private: what that means</h2>
            <p style={{ maxWidth: 640, margin: '14px auto 0', fontSize: '0.98rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.64)' }}>
              ShowMeWise is free and runs completely on your own computer: no cloud, no account, no cost per video. The AI is an open model
              that works on your machine, so the speed and the result depend on your computer and the model you pick. With gemma3 12B on a
              normal 16 GB laptop, <b style={{ color: '#fff' }}>60 to 67.5 %</b> of all actions came out fully right in the first draft, in our tests against manuals written by hand.
              Big paid cloud AIs are usually faster and stronger, but your video would have to leave your computer. ShowMeWise keeps it with you.
            </p>
            <a href="/#/check" style={{ display: 'inline-block', marginTop: 18, padding: '11px 22px', borderRadius: 100, border: '1px solid rgba(52,211,153,0.5)', color: '#a7f3d0', textDecoration: 'none', fontWeight: 600 }}>
              🖥 Test my computer: which AI runs best on it?
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[
              ['Your computer sets the speed', 'Everything runs on your own computer, for free. On a normal 16 GB laptop, a 10 minute video took about 1¾ hours with the biggest model. A stronger computer or a smaller model is faster.'],
              ['A bigger model gives a better guide', 'In our tests a small 4B model got about 30 % of the actions fully right, gemma3 12B 60 to 67.5 %. Pick the biggest model your computer can run. In the browser (no install): Medium found 11 of 15 steps of our 1-minute demo, 6 of them fully right; Small only 2. Test my computer picks the size that fits.'],
              ['A strong first draft that you finish', 'Read the guide and fix it with Edit before you share it. The review mode shows which steps to look at first. A click where nothing visible changes, or a button with only an icon, is often not named.'],
              ['Help it with key words', 'Type the names and codes of your app into the key words box. In our tests this helped the most: codes were spelled right and missing steps came back.'],
              ['Each run is a little different', 'An AI never writes the same text twice. In our tests the same video scored up to 10 points higher or lower from run to run.'],
              ['Keep the computer awake', 'The work runs on your computer, so sleep or a closed lid pauses it. If it stops, choose the same video again and it picks up where it stopped.'],
              ['Guides in English, for now', 'The video can be in English, Hindi, Hinglish, German and more. The guide itself is written in English.'],
              ['Made for computers', 'Chrome, Edge or Firefox on a laptop or desktop (the plugin: Chrome or Edge). Phones and tablets are not strong enough to run the AI on the device.'],
              ['The HTML guide has everything', 'HTML has moving clips, Word has short GIFs in some parts, PDF has still pictures (a PDF cannot play videos). Doc Chat reads PDF, Word, HTML and text files, but not scanned pages (pictures of text).'],
            ].map(([title, desc], i) => (
              <div key={i} style={{ borderRadius: 16, padding: '22px 20px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>{title}</div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.66)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What's next in v5 (coming soon) ──────────────────── */}
        <section className="lp-section" style={{ padding: '40px 24px 90px', maxWidth: 940, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7b96ff', marginBottom: 12 }}>
              The road ahead
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4.2vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.025em' }}>
              What's{' '}
              <span style={{ background: 'linear-gradient(90deg, #3f62ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>next</span>
              <span style={{ marginLeft: 12, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: 'rgba(123,150,255,0.22)', border: '1px solid rgba(123,150,255,0.45)', padding: '4px 12px', borderRadius: 100, verticalAlign: 'middle', whiteSpace: 'nowrap', animation: 'lp-badge-glow 2.6s ease-in-out infinite' }}>Coming soon</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {[
              ['Multi-window awareness', 'Open a second app mid-recording? The steps follow along without mixing the two screens up.'],
              ['Sharper vision', 'Reads tiny text, dense tables and crowded toolbars more reliably.'],
              ['Better with accents', 'Understands accented and technical speech better by learning the words it can see on screen.'],
              ['Guides in your language', 'Recordings in many languages work today; next, the guide itself written in your language, not only in English.'],
              ['Custom branding', 'Your logo and colours, applied as a clean document theme.'],
              ['Batch mode', 'Drop in several recordings and collect the finished documents one by one.'],
              ['Icons without text', 'Name buttons that show only a symbol, by looking at the picture of each click.'],
            ].map(([title, desc], i) => (
              <div key={i} style={{ borderRadius: 16, padding: '22px 20px', background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(123,150,255,0.35)' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>{title}</div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.66)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────── */}
        <section className="lp-section" style={{ padding: '100px 24px 130px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', width: 700, height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(63,98,255,0.07) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)', filter: 'blur(50px)', pointerEvents: 'none',
          }} />

          <h2 style={{
            fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
            fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18, lineHeight: 1.1,
          }}>
            Your next recording is already a doc.
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.64)', fontSize: '1.05rem',
            maxWidth: 480, margin: '0 auto 50px', lineHeight: 1.75,
          }}>
            ShowMeWise is free, open, and runs entirely on your computer.
            No account. No cloud. No more putting it off.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handleEnter} className="lp-cta" style={{
              padding: '18px 48px', borderRadius: 100,
              background: 'linear-gradient(135deg, #3f62ff, #a78bfa)',
              border: 'none', color: '#fff',
              cursor: 'pointer', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.03em',
              boxShadow: '0 0 44px rgba(63,98,255,0.45), 0 0 88px rgba(63,98,255,0.16)',
              animation: 'lp-pulse 3.5s ease-in-out infinite',
            }}>
              🎬 Video → Docs
            </button>
            <button onClick={handleDocChat} className="lp-cta-g" style={{
              padding: '18px 48px', borderRadius: 100,
              background: 'linear-gradient(135deg, #10b981, #22d3ee)',
              border: 'none', color: '#06231c',
              cursor: 'pointer', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.03em',
              boxShadow: '0 0 44px rgba(52,211,153,0.35)',
              animation: 'lp-pulse-green 3.5s ease-in-out infinite',
            }}>
              💬 Doc → Chat
            </button>
          </div>

          <p style={{ marginTop: 26, fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>
            No sign-up · No API key · Works in Chrome and Edge
          </p>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="lp-footer" style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '28px 40px 96px', // the bottom room keeps the links clear of the Vidi button
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            With{' '}
            <span style={{
              color: '#3f62ff',
              textShadow: '0 0 8px rgba(63,98,255,0.9), 0 0 20px rgba(63,98,255,0.5)',
              fontSize: '1.1rem',
            }}>♥</span>
            {' '}from ShowMeWise
          </span>
          <span style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/#/policy" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Privacy, terms and credits</a>
            <a href="/#/legal" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Legal notice</a>
            <a href="https://github.com/Aryan-Bajaj/showmewise" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>GitHub</a>
          </span>
        </footer>
      </div>
    </>
  )
}
