import { MAX_VIDEO_MB, MAX_VIDEO_MIN } from '../lib/limits'

// Says the online size limit up front, so nobody waits for a 2 hour upload
// that is then refused. Hidden in builds without a limit (desktop).
export default function LimitBanner({ style }) {
  if (!MAX_VIDEO_MB && !MAX_VIDEO_MIN) return null
  const max = [MAX_VIDEO_MB && `${MAX_VIDEO_MB} MB`, MAX_VIDEO_MIN && `${MAX_VIDEO_MIN} minutes`].filter(Boolean).join(' and ')
  return (
    <div role="note" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center', textAlign: 'center',
      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.45)', color: '#fde7b0', borderRadius: 12, padding: '9px 14px', fontSize: 13.5, lineHeight: 1.45, ...style }}>
      <span>⏱️ Online version: one video can be up to <b style={{ color: '#fff' }}>{max}</b>. Longer recording? Split it into parts first.</span>
      <a href="/#/howto#before" style={{ color: '#fcd34d', fontWeight: 600 }}>How to use</a>
    </div>
  )
}
