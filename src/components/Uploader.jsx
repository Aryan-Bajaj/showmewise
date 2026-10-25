import { useEffect, useRef, useState } from "react"
import { Video, ShieldCheck, Sparkles, CloudUpload, Circle, Square } from "lucide-react"
import { post } from "../lib/bridge"
import { savedBest } from "../lib/computerCheck"
import { canRecord, startRecording, savedRecording, recoverRecording, discardSavedRecording } from "../lib/recorder"
import { checkVideoSize, checkVideoDuration, MAX_VIDEO_MB, MAX_VIDEO_MIN } from "../lib/limits"
import { parseTerms } from "../lib/terms"

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
  const [keywords, setKeywords] = useState("")
  const useAccurate = !desktop && accurate

  // Enforce build-level limits BEFORE the pipeline touches the file, so a
  // too-big video is a friendly message instead of a crashed browser tab.
  // `o`: options sent with a plugin recording (else the fields on this page)
  const handleVideo = async (file, o = null) => {
    setLimitError("")
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv)$/i.test(file.name)) {
      setLimitError("That file is not a video. Please drop an MP4, MOV or WEBM recording.")
      return
    }
    const sizeErr = checkVideoSize(file)
    if (sizeErr) { setLimitError(sizeErr); return }
    const durErr = await checkVideoDuration(file)
    if (durErr) { setLimitError(durErr); return }
    onVideoSelect(file, o ? { language: o.language || "en", accurate: !desktop && !!o.accurate, terms: parseTerms(o.terms || "") } : { language, accurate: useAccurate, terms: parseTerms(keywords) })
  }

  // Record your screen: the whole screen, a window or a tab, with your voice
  const [rec, setRec] = useState(null)        // { stop, ms } while recording
  const [recNote, setRecNote] = useState("")
  const [saved, setSaved] = useState(null)    // "cut" | "unfinished" | null
  useEffect(() => { savedRecording().then(setSaved) }, [])
  const record = async (streamId = null, o = null) => {
    setLimitError(""); setRecNote("")
    try {
      const r = await startRecording({
        streamId,
        meta: o || { terms: keywords, language, accurate: useAccurate },
        onTick: (ms) => {
          setRec((x) => x && { ...x, ms })
          post("status", { state: "recording", ms, steps: [] })
          // the website takes up to MAX_VIDEO_MIN minutes: stop there, not after
          if (MAX_VIDEO_MIN && ms >= MAX_VIDEO_MIN * 60000) r.stop()
        },
        onEnd: (file) => { setRec(null); post("status", { state: "upload", steps: [] }); if (file) handleVideo(file, o); else setLimitError("The recording is empty. Try again and share a screen, window or tab.") },
      })
      setRec({ stop: r.stop, ms: 0 })
      if (r.micNote) setRecNote(r.micNote)
    } catch (e) { setLimitError(e.message); post("status", { state: "upload", steps: [], error: e.message }) }
  }
  // the browser plugin starts a recording with a screen it picked
  useEffect(() => {
    const on = (e) => {
      if (!e.detail?.streamId || rec) return
      const o = e.detail.opts || null
      // show the plugin's choices in the fields here too
      if (o) { setKeywords(o.terms || ""); setLanguage(o.language || "en"); setAccurate(!!o.accurate) }
      record(e.detail.streamId, o)
    }
    const stop = () => rec?.stop()
    const again = async () => { const f = await recoverRecording(); setSaved(null); if (f) handleVideo(f, f.vdOpts) }
    window.addEventListener("showmewise:record", on); window.addEventListener("showmewise:stop", stop); window.addEventListener("showmewise:recover", again)
    return () => { window.removeEventListener("showmewise:record", on); window.removeEventListener("showmewise:stop", stop); window.removeEventListener("showmewise:recover", again) }
  })
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`

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
          ShowMeWise listens, reads and looks at every step, then writes a guide with the clicks marked on the screen.
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

      {/* not tested yet: which browser AI fits this computer */}
      {!savedBest() && !desktop && (
        <a href="/#/check" target="_blank" rel="noopener" className="text-sm text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline">
          No Ollama? Test your computer first: it finds the AI size that runs well (about 2 minutes).
        </a>
      )}

      {/* Or record the screen right here */}
      {canRecord() && (rec ? (
        <div role="status" className="w-full max-w-2xl flex items-center gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm text-red-100">Recording <b className="tabular-nums">{mmss(rec.ms)}</b>{MAX_VIDEO_MIN ? <span className="text-red-200/70"> · stops by itself at {MAX_VIDEO_MIN} min</span> : null}. Do the task and explain it out loud.</span>
          <button onClick={() => rec.stop()} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg px-3 py-1.5">
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <button onClick={() => record()} className="inline-flex items-center gap-2 text-sm font-semibold text-red-100 border border-red-400/40 hover:bg-red-500/10 rounded-full px-4 py-2 transition">
            <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" /> Record your screen
          </button>
          <span className="text-xs text-zinc-500">The whole screen, one app window or a tab, with your voice. The recording stays on your computer.</span>
          {saved && (
            <span className="text-xs text-amber-200 flex flex-wrap items-center justify-center gap-2">
              {saved === "cut" ? "A recording was cut short." : "Your last recording has no finished guide yet."}
              <button onClick={async () => { const f = await recoverRecording(); setSaved(null); if (f) handleVideo(f, f.vdOpts) }} className="underline hover:text-white">Use it</button>
              <button onClick={() => { discardSavedRecording(); setSaved(null) }} className="underline text-zinc-400 hover:text-white">Delete it</button>
            </span>
          )}
        </div>
      ))}
      {recNote && <p className="text-xs text-amber-200 max-w-2xl text-center">{recNote}</p>}

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

      {/* Key words (optional): spelled exactly like this in the guide */}
      <div className="w-full max-w-2xl flex flex-col gap-1.5 text-sm">
        <label htmlFor="vd-terms" className="text-zinc-300">Key words in the video <span className="text-zinc-500">(optional)</span></label>
        <input id="vd-terms" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="For example: QX21N, Weekly Overview, Share"
          className="bg-[#0f0b24] border border-white/15 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400" />
        <span className="text-xs text-zinc-500">Names or codes, separated by commas. The guide spells them exactly like this.</span>
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
