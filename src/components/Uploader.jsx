import { useRef, useState } from "react"
import { Video, ShieldCheck, Sparkles, CloudUpload } from "lucide-react"
import { checkVideoSize, checkVideoDuration, MAX_VIDEO_MB, MAX_VIDEO_MIN } from "../lib/limits"

export default function Uploader({ onVideoSelect }) {
  const videoRef = useRef()
  const [limitError, setLimitError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [language, setLanguage] = useState("en")
  // Accurate speech is a choice, not the default: it hears names and codes
  // better, but without a fast graphics card it takes 3 to 4 times longer
  // (measured). The desktop copy only bundles the small model.
  const desktop = import.meta.env.VITE_BUILD_TARGET === "desktop"
  const [accurate, setAccurate] = useState(false)
  const useAccurate = !desktop && accurate

  // Enforce build-level limits BEFORE the pipeline touches the file, so a
  // too-big video is a friendly message instead of a crashed browser tab.
  const handleVideo = async (file) => {
    setLimitError("")
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv)$/i.test(file.name)) {
      setLimitError("That file is not a video. Please drop an MP4, MOV or WEBM recording.")
      return
    }
    const sizeErr = checkVideoSize(file)
    if (sizeErr) { setLimitError(sizeErr); return }
    const durErr = await checkVideoDuration(file)
    if (durErr) { setLimitError(durErr); return }
    onVideoSelect(file, { language, accurate: useAccurate })
  }

  const limitHint = [
    MAX_VIDEO_MIN ? `up to ${MAX_VIDEO_MIN} min` : null,
    MAX_VIDEO_MB ? `${MAX_VIDEO_MB} MB` : null,
  ].filter(Boolean).join(" or ")

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleVideo(f)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[72vh] gap-7 animate-[fadeIn_.4s_ease-out]">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200 bg-violet-500/10 border border-violet-400/25 rounded-full px-3 py-1">
          <Sparkles className="w-3.5 h-3.5" /> Video in, guide out
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Drop your screen recording</h2>
        <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto">
          VideoDoc listens, reads and looks at every step, then writes a guide with the clicks marked on the screen.
        </p>
      </div>

      {/* Main drop zone */}
      <button
        onClick={() => videoRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative w-full max-w-2xl rounded-2xl p-[1.5px] transition-all duration-300 cursor-pointer group
          ${dragging ? "scale-[1.015]" : "hover:scale-[1.005]"}`}
        style={{ background: dragging ? "linear-gradient(135deg,#a78bfa,#3f62ff,#22d3ee)" : "linear-gradient(135deg,rgba(167,139,250,.55),rgba(63,98,255,.35),rgba(34,211,238,.4))" }}
      >
        <div className={`rounded-2xl px-8 py-12 flex flex-col items-center gap-4 transition-colors ${dragging ? "bg-[#1a1240]/95" : "bg-[#120c2c]/90 group-hover:bg-[#160f36]/95"}`}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(109,74,255,0.45)]"
            style={{ background: "linear-gradient(135deg,#6d4aff,#3f62ff)" }}>
            {dragging ? <CloudUpload className="w-8 h-8 text-white" /> : <Video className="w-8 h-8 text-white" />}
          </div>
          <span className="text-lg font-semibold text-white">{dragging ? "Drop it here" : "Upload Video"}</span>
          <span className="text-sm text-zinc-400">Drag a file here, or click to choose one</span>
          <span className="text-xs text-zinc-500">MP4, MOV or WEBM{limitHint ? ` · ${limitHint}` : ""}</span>
        </div>
      </button>

      {/* Spoken language: English uses the English model; others are translated to English */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <label htmlFor="vd-lang" className="text-zinc-300">Spoken language in the video</label>
        <select id="vd-lang" value={language} onChange={(e) => setLanguage(e.target.value)}
          className="bg-[#0f0b24] border border-white/15 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-violet-400">
          <option value="en">English</option>
          <option value="hindi">Hindi or Hinglish</option>
          <option value="german">German</option>
          <option value="spanish">Spanish</option>
          <option value="french">French</option>
          <option value="auto">Another language (detect it)</option>
        </select>
        {!desktop && (
          <span className="flex items-center gap-2 w-full justify-center">
            <label htmlFor="vd-speech" className="text-zinc-300">Speech recognition</label>
            <select id="vd-speech" value={useAccurate ? "accurate" : "fast"} onChange={(e) => setAccurate(e.target.value === "accurate")}
              className="bg-[#160f33] border border-violet-400/30 rounded-lg px-2 py-1 text-zinc-100">
              <option value="fast">Fast (~970 MB once)</option>
              <option value="accurate">Accurate (~1.6 GB once)</option>
            </select>
          </span>
        )}
        <span className="text-xs text-zinc-400 w-full text-center">
          {useAccurate
            ? "Accurate hears names, codes and mixed languages better. Without a fast graphics card it takes 3 to 4 times longer."
            : language !== "en" ? "Fast suits clear speech. Choose Accurate when names and codes matter." : "Best for clear English speech."}
          {language !== "en" ? " The guide is written in English." : ""}
        </span>
      </div>

      {/* Trust row */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Your video never leaves your computer</span>
        <span>No account</span>
        <span>Free</span>
        <a href="/#/policy" className="text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline">Privacy</a>
      </div>

      {limitError && (
        <div role="alert" className="max-w-2xl text-sm text-violet-200 bg-violet-500/10 border border-violet-500/30 rounded-xl px-4 py-3 text-center">
          {limitError}
        </div>
      )}

      <input ref={videoRef} type="file" accept="video/*" className="hidden"
        onChange={e => e.target.files[0] && handleVideo(e.target.files[0])} />
    </div>
  )
}
