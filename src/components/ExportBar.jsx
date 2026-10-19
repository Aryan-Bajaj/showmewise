import { useState } from "react"
import { exportHTML } from "../lib/exportHTML"
import { exportPDF } from "../lib/exportPDF"
import { exportDOCX } from "../lib/exportDOCX"
import { renderMermaidSVG, svgToPngDataURL } from "../lib/mermaidRender"
import useClipMaker from "../hooks/useClipMaker"
import useGifMaker from "../hooks/useGifMaker"
import { Download, Globe, FileText, FileType } from "lucide-react"

function toExportDocs(annotatedDocs, transcriptChunks) {
  if (annotatedDocs?.length > 0) return annotatedDocs
  return (transcriptChunks ?? []).map(c => {
    const ts = c.timestamp?.[0] ?? 0
    const m = Math.floor(ts / 60).toString().padStart(2, "0")
    const s = Math.floor(ts % 60).toString().padStart(2, "0")
    return { timestamp: ts, label: `${m}:${s}`, text: c.text, frame: null, annotation: null }
  })
}

export default function ExportBar({ annotatedDocs, transcriptChunks, videoName, videoFile, docTitle, companyName, insights, toolsUsed, frames, videoDuration }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [gifMsg, setGifMsg] = useState(null)
  const { makeClips } = useClipMaker()
  const { makeGifs } = useGifMaker()

  const hasContent = (annotatedDocs?.length ?? 0) + (transcriptChunks?.length ?? 0) > 0
  // Title for the guide: user-provided title preferred; never the raw video file name.
  const title = (docTitle && docTitle.trim()) || "Step-by-Step Guide"
  const name = videoName || "video"

  const handle = async (type) => {
    if (!hasContent || busy) return
    setBusy(type)
    setError(null)
    try {
      const docs = toExportDocs(annotatedDocs, transcriptChunks)

      // Flow diagram: render the Mermaid once. HTML embeds the live SVG; PDF/DOCX
      // embed a rasterised PNG. Both are fully offline (no runtime, no CDN).
      let mermaidSvg = "", flowImage = null
      if (insights?.mermaid) {
        setGifMsg("Rendering flow diagram…")
        mermaidSvg = await renderMermaidSVG(insights.mermaid)
        if (type !== "html" && mermaidSvg) flowImage = await svgToPngDataURL(mermaidSvg)
        setGifMsg(null)
      }
      const meta = { title, company: companyName || "", insights: insights || null, tools: toolsUsed || [], flowImage, transcript: transcriptChunks || [], duration: videoDuration || 0 }

      if (type === "html") {
        // Build a short, sharp WebM clip per step — browser-only, base64-inlined.
        let clips = new Map()
        if (videoFile && docs.length) {
          clips = await makeClips(videoFile, docs, (i, t) => setGifMsg(`Building step clips ${i}/${t}… (keep this tab focused)`), { crop: frames?.[0]?.crop })
          setGifMsg(null)
        }
        await exportHTML(docs, name, frames, { ...meta, clips, mermaidSvg })
      }
      if (type === "pdf") await exportPDF(docs, name, meta)
      if (type === "docx") {
        // Animated GIF per step inside the Word file (modern Word plays them;
        // older Word shows the first frame). Compact settings keep the .docx
        // size sane on long recordings.
        let gifs = new Map()
        if (videoFile && docs.length) {
          gifs = await makeGifs(videoFile, docs,
            (i, t) => setGifMsg(`Building step animations ${i}/${t}… (keep this tab focused)`),
            { window: 4, fps: 4, maxW: 480, colors: 128, crop: frames?.[0]?.crop })
          setGifMsg(null)
        }
        await exportDOCX(docs, name, { ...meta, gifs })
      }
    } catch (e) {
      setError(`${type.toUpperCase()} export failed: ${e.message}`)
    } finally {
      setBusy(null)
      setGifMsg(null)
    }
  }

  const FORMATS = [
    { type: "html", title: "HTML", sub: "Web guide", desc: "Marked screenshots, step clips, checklist and FAQ in one file.", Icon: Globe, grad: "from-violet-500/25 to-indigo-500/10", ring: "hover:border-violet-400/60" },
    { type: "pdf", title: "PDF", sub: "Print ready", desc: "Cover, contents, numbered parts and page numbers.", Icon: FileText, grad: "from-rose-500/20 to-violet-500/10", ring: "hover:border-rose-300/60" },
    { type: "docx", title: "DOCX", sub: "Editable Word", desc: "The same manual, ready to edit and reuse.", Icon: FileType, grad: "from-sky-500/20 to-violet-500/10", ring: "hover:border-sky-300/60" },
  ]

  return (
    <div className="rounded-2xl border border-violet-400/15 bg-[#120c2c]/80 backdrop-blur-md p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Download className="w-4 h-4 text-violet-300 shrink-0" />
        <span className="text-sm font-semibold text-zinc-100">Export your guide</span>
        {!hasContent && <span className="text-xs text-zinc-500">· process a video to enable export</span>}
        {gifMsg && <span className="text-xs text-violet-200 ml-auto animate-pulse">{gifMsg}</span>}
        {error && <span className="text-xs text-red-300 ml-auto">{error}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FORMATS.map(({ type, title, sub, desc, Icon, grad, ring }) => {
          const off = !hasContent || !!busy
          return (
            <button
              key={type}
              onClick={() => handle(type)}
              disabled={off}
              aria-label={title}
              className={`text-left rounded-xl border border-white/10 bg-gradient-to-br ${grad} px-4 py-3.5 transition-all
                ${off ? "opacity-50 cursor-not-allowed" : `cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(60,30,160,0.35)] ${ring}`}`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-5 h-5 text-white/90" />
                <span className="text-sm font-bold tracking-wide text-white">{busy === type ? "Building…" : title}</span>
                <span className="text-[11px] text-zinc-300/80 ml-auto">{sub}</span>
              </span>
              <span className="block text-xs text-zinc-300/75 mt-1.5 leading-relaxed">{desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
