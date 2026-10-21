import { Info } from 'lucide-react'
import { MAX_VIDEO_MB, MAX_VIDEO_MIN } from '../lib/limits'

// A thin strip hanging under the top bar (place it inside the bar): the
// online size limit, so nobody waits for a long upload that is then refused,
// plus the two ways to get help. Hidden in builds without a limit (desktop).
export default function LimitBanner() {
  if (!MAX_VIDEO_MB && !MAX_VIDEO_MIN) return null
  const max = [MAX_VIDEO_MB && `${MAX_VIDEO_MB} MB`, MAX_VIDEO_MIN && `${MAX_VIDEO_MIN} min`].filter(Boolean).join(' · ')
  const pill = { color: '#e9e5ff', textDecoration: 'none', fontSize: 12, padding: '3px 10px', borderRadius: 100, border: '1px solid rgba(167,139,250,0.35)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }
  return (
    <div role="note" style={{ position: 'absolute', top: '100%', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px 12px', flexWrap: 'wrap',
      padding: '6px 16px', background: 'rgba(16,11,38,0.92)', borderBottom: '1px solid rgba(167,139,250,0.14)', color: 'rgba(233,229,255,0.72)', fontSize: 12.5, lineHeight: 1.4 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Info size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />
        <span className="lb-long">Online version: up to <b style={{ color: '#fff', fontWeight: 600 }}>{max}</b> per video. Longer recordings: split them first.</span>
        {/* phones: the same limit in a few words, so the strip stays one line */}
        <span className="lb-short" style={{ display: 'none', whiteSpace: 'nowrap' }}>Up to <b style={{ color: '#fff', fontWeight: 600 }}>{max}</b></span>
      </span>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <a href="/#/howto" style={pill}>How to use</a>
        <button type="button" onClick={() => window.dispatchEvent(new Event('vidi:open'))} style={pill}>Ask Vidi</button>
      </span>
    </div>
  )
}
