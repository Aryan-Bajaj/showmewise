import { useState } from "react"

// On a phone, say up front that VideoDoc is made for a computer and what it
// would download, before anyone fills their phone storage. Once per visit.
const isPhone = () => {
  try {
    return matchMedia("(max-width: 820px)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  } catch { return false }
}
const seen = () => { try { return sessionStorage.getItem("vd-mobile-notice") === "1" } catch { return false } }

export default function MobileNotice() {
  const [open, setOpen] = useState(() => isPhone() && !seen())
  if (!open) return null
  const close = () => { try { sessionStorage.setItem("vd-mobile-notice", "1") } catch { /* private mode */ } setOpen(false) }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="vd-mn-title"
      className="fixed inset-0 z-[9500] flex items-end sm:items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-violet-400/30 bg-[#160f33] p-5 text-sm text-zinc-200 shadow-2xl">
        <h2 id="vd-mn-title" className="text-lg font-bold text-white mb-2">💻 VideoDoc is made for a computer</h2>
        <p className="mb-3 leading-relaxed">
          VideoDoc runs the AI on your own device, so the first run downloads AI models into your browser:
        </p>
        <ul className="mb-3 space-y-1.5">
          <li>• <b className="text-white">Video to guide:</b> at least about <b className="text-white">2 GB</b> (speech model ~970 MB and the usual writing model ~1 GB)</li>
          <li>• <b className="text-white">Doc Chat:</b> at least about <b className="text-white">1.1 GB</b></li>
        </ul>
        <p className="mb-3 leading-relaxed text-zinc-300">
          On a phone this can fill your storage and drain your battery, and most phone browsers cannot run these models.
        </p>
        <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 leading-relaxed">
          <b className="text-emerald-300">Recommended:</b> a laptop or desktop with <b className="text-white">Ollama</b> and the gemma3 model:
          12B (~8.1 GB) for the most exact guides.
        </div>
        <p className="mb-4 text-xs text-zinc-400">Nothing is downloaded just by looking around this site.</p>
        <button onClick={close} autoFocus
          className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 font-semibold text-white transition-colors">
          Got it, just looking
        </button>
      </div>
    </div>
  )
}
