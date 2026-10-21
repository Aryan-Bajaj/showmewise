import { useState, useCallback, useEffect } from "react"
import useRAG from "../hooks/useRAG"
import ChatText from "./ChatText"
import { renderShot } from "../lib/annotateImage"
import { MessageSquare, Send, CornerDownRight, Sparkles, Globe } from "lucide-react"

function fmt(ts) {
  if (ts == null) return ""
  const m = Math.floor(ts / 60).toString().padStart(2, "0")
  const s = Math.floor(ts % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

// Live progress block — replaces the dead "…thinking" with the actual phase
// (searching → loading model X% → writing answer) so the user sees it moving.
function Progress({ status }) {
  if (!status) return null
  const { label, pct, phase } = status
  const showPct = typeof pct === "number" && pct > 0 && pct < 100
  const text = phase === "ready" ? "Writing the answer..." : label
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-zinc-200">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
        <span className="truncate">{text}</span>
        {showPct && <span className="ml-auto text-emerald-400 font-mono font-semibold">{pct}%</span>}
      </div>
      <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        {showPct ? (
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        ) : (
          <div className="h-full w-1/3 bg-emerald-500 rounded-full animate-[indeterminate_1.4s_ease-in-out_infinite]" />
        )}
      </div>
      {phase === "download" && (
        <p className="text-[11px] text-zinc-500 mt-1.5">First run downloads the browser AI once, then it stays cached.</p>
      )}
    </div>
  )
}

const LETTER = (i) => { let s = "", n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0); return s }

// The step an answer came from, shown the way the guide shows it: its marked
// screenshot, its part letter and title, and a button that plays that moment.
function SourceCard({ source, part, onSeek, onZoom }) {
  const [img, setImg] = useState(null)
  const shot = source.shots?.[0]
  useEffect(() => {
    let live = true
    if (shot) renderShot(shot.image, shot.callouts, { maxW: 900 }).then((r) => live && setImg(r.dataUrl)).catch(() => {})
    return () => { live = false }
  }, [shot])
  const src = img || source.frame
  if (!src) return null
  return (
    <div className="rounded-xl overflow-hidden border border-violet-400/25 bg-[#120c2c] max-w-md">
      <button onClick={() => onZoom?.(src)} className="block w-full cursor-zoom-in" title="Click to enlarge">
        <img src={src} alt={source.title || "Step screenshot"} className="w-full block" />
      </button>
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        {part && <span className="font-bold text-white bg-violet-600 rounded px-1.5 py-0.5 shrink-0">Part {part}</span>}
        <span className="text-zinc-200 truncate">{source.title || "From your guide"}</span>
        {source.timestamp != null && (
          <button onClick={() => onSeek?.(source.timestamp)} title="Play this moment"
            className="ml-auto shrink-0 font-semibold text-cyan-200 bg-cyan-500/10 border border-cyan-400/25 hover:bg-cyan-500/20 rounded-full px-2 py-0.5 tabular-nums transition">▶ {fmt(source.timestamp)}</button>
        )}
      </div>
    </div>
  )
}

export default function DocChat({ docs, aiMode, ollamaModel, onSeek, autoStart = false, name = "Vid Chat", about = "this recording" }) {
  const { buildIndex, ask, askGeneral, isReady } = useRAG()
  const [open, setOpen] = useState(autoStart)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState(null) // { label, pct, phase } | null
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([]) // {q, a, sources}
  const [openSrc, setOpenSrc] = useState(null) // "msgIdx-srcIdx" of an expanded doc source
  const [zoom, setZoom] = useState(null)        // enlarged screenshot
  // Chat answers come from the finished guide (text), so a big model running on
  // the processor (one answer took over 12 minutes) is not needed: when a lighter
  // model is installed in Ollama, the chat uses it and says so.
  const [chatModel, setChatModel] = useState(ollamaModel)
  useEffect(() => {
    setChatModel(ollamaModel)
    if (aiMode !== "ollama" || !/12b|27b|cpu/i.test(ollamaModel || "")) return
    fetch("http://localhost:11434/api/tags").then((r) => r.json()).then((d) => {
      const names = (d.models || []).map((m) => m.name)
      const light = names.find((n) => /^gemma3:4b/.test(n)) || names.find((n) => /(^|[:-])(4b|3b)\b/i.test(n) && !/cpu|cloud/i.test(n))
      if (light) setChatModel(light)
    }).catch(() => {})
  }, [aiMode, ollamaModel])
  const partOf =(ts) => { if (ts == null) return ""; const k = (docs || []).findIndex((d) => d.timestamp === ts); return k >= 0 && docs[k].step ? LETTER(k) : "" }

  const onStatus = useCallback((label, pct = null, phase = null) => {
    setStatus(label ? { label, pct, phase } : null)
  }, [])

  const ensureIndex = useCallback(async () => {
    if (ready || isReady()) { setReady(true); return }
    onStatus("Indexing the document...", null, "index")
    await buildIndex(docs, onStatus)
    setStatus(null)
    setReady(true)
  }, [ready, isReady, buildIndex, docs, onStatus])

  const handleOpen = async () => {
    setOpen(true)
    setBusy(true)
    try { await ensureIndex() } catch (e) { onStatus(e.message) } finally { setBusy(false) }
  }

  // Auto-start: as soon as the document is ready, build the knowledge index in
  // the background (don't wait for the user to ask) so the first answer is fast.
  useEffect(() => {
    if (!autoStart || !docs?.length || ready || isReady()) return
    let cancelled = false
    setBusy(true)
    ;(async () => {
      try { await ensureIndex() } catch (e) { if (!cancelled) onStatus(e.message) }
      finally { if (!cancelled) setBusy(false) }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, docs])

  // A question asked while the index is still being built is kept and sent as
  // soon as it is ready (it used to be dropped without a word).
  const [queued, setQueued] = useState(null)
  const submit = () => {
    const q = input.trim()
    if (!q) return
    setInput("")
    if (busy) { setQueued(q); return }
    send(q)
  }
  useEffect(() => {
    if (!busy && queued) { const q = queued; setQueued(null); send(q) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, queued])
  const send = async (q) => {
    setBusy(true)
    setMessages((m) => [...m, { q, a: null, sources: [] }])
    try {
      await ensureIndex()
      const { answer, sources, notFound } = await ask(q, aiMode || "webllm", chatModel, onStatus)
      setMessages((m) => m.map((x, i) => i === m.length - 1 ? { ...x, a: answer, sources, notFound: !!notFound, query: q } : x))
    } catch (e) {
      setMessages((m) => m.map((x, i) => i === m.length - 1 ? { ...x, a: `⚠️ ${e.message}` } : x))
    } finally {
      setBusy(false); setStatus(null)
    }
  }

  // Document doesn't cover it → answer from the model's own general knowledge.
  const answerFromAI = async (idx, q) => {
    if (busy) return
    setBusy(true)
    setMessages((m) => m.map((x, i) => i === idx ? { ...x, notFound: false } : x))
    try {
      const a = await askGeneral(q, aiMode || "webllm", chatModel, onStatus)
      setMessages((m) => m.map((x, i) => i === idx ? { ...x, a, sources: [], general: true } : x))
    } catch (e) {
      setMessages((m) => m.map((x, i) => i === idx ? { ...x, a: `⚠️ ${e.message}`, notFound: true } : x))
    } finally {
      setBusy(false); setStatus(null)
    }
  }

  // Hand off to a real web search (real sources, opens in a new tab).
  const searchWeb = (q) => {
    window.open(`https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer")
  }

  if (!docs?.length) return null

  if (!open) {
    return (
      <button onClick={handleOpen}
        className="w-full border border-emerald-700/40 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl px-4 py-3 flex items-center gap-3 transition-all">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-300">{name}</span>
        <span className="text-xs text-zinc-500 ml-auto">Ask anything · answers cite the exact step{aiMode === "ollama" && chatModel && chatModel !== ollamaModel ? ` · answered by ${chatModel} (quicker for chat)` : ""}</span>
      </button>
    )
  }

  return (
    <div className="border border-violet-400/20 rounded-2xl overflow-hidden flex flex-col bg-[#120c2c]/90 backdrop-blur-md shadow-xl" style={{ maxHeight: 640 }}>
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-emerald-300" />
        <span className="text-sm font-semibold text-white">{name}</span>
        <span className="text-xs text-zinc-400">· ask anything about {about}</span>
        {busy && <span className="text-xs text-violet-300 ml-auto animate-pulse">Working...</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 && !busy && (
          <div className="flex flex-wrap gap-2">
            {["What is this about?", "Which steps are there?", "What do I need before I start?"].map((q) => (
              <button key={q} onClick={() => setInput(q)} className="text-xs text-zinc-200 border border-white/10 hover:border-violet-400/50 hover:bg-violet-500/10 rounded-full px-3 py-1.5 transition">{q}</button>
            ))}
          </div>
        )}

        {/* Indexing progress before the first question */}
        {messages.length === 0 && busy && status && <Progress status={status} />}
        {queued && <p className="text-xs text-zinc-400">Your question "{queued}" is asked as soon as the chat is ready.</p>}

        {messages.map((m, i) => {
          const isLast = i === messages.length - 1
          return (
            <div key={i} className="space-y-2">
              <div className="flex justify-end"><div className="text-[14.5px] text-emerald-50 bg-emerald-500/15 border border-emerald-400/25 rounded-xl rounded-br-sm px-3.5 py-2 max-w-[85%]">{m.q}</div></div>
              {m.a != null ? (
                <div className="space-y-1.5">
                  {m.general && (
                    <div className="flex items-center gap-1.5 text-[11px] text-violet-300">
                      <Sparkles className="w-3 h-3" /> From the AI model's general knowledge, not your document
                    </div>
                  )}
                  <div className="text-[14.5px] text-zinc-100 leading-relaxed bg-[#1c1540] border border-white/10 rounded-xl px-3.5 py-3"><ChatText text={m.a} /></div>
                  {!m.general && m.sources?.[0] && (
                    <SourceCard source={m.sources[0]} part={partOf(m.sources[0].timestamp)} onSeek={onSeek} onZoom={setZoom} />
                  )}
                  <button onClick={() => searchWeb(m.query || m.q)}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-violet-200 border border-white/10 hover:border-violet-400/50 rounded-full px-3 py-1 transition">
                    <Globe className="w-3.5 h-3.5" /> Search the web for more ↗
                  </button>
                </div>
              ) : m.notFound ? (
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 space-y-2.5">
                  <p className="text-sm text-zinc-200">I couldn't find this in it.</p>
                  <p className="text-xs text-zinc-500">Want an answer anyway?</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => answerFromAI(i, m.query)} disabled={busy}
                      className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg px-3 py-1.5 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" /> Answer from the AI's knowledge
                    </button>
                    <button onClick={() => searchWeb(m.query)}
                      className="flex items-center gap-1.5 text-xs border border-zinc-600 hover:border-emerald-500 hover:text-emerald-300 text-zinc-300 rounded-lg px-3 py-1.5 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Search the web ↗
                    </button>
                  </div>
                </div>
              ) : (
                <Progress status={isLast && busy ? (status ?? { label: "Thinking...", pct: null, phase: null }) : { label: "Thinking...", pct: null, phase: null }} />
              )}
              {m.sources?.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {m.sources.map((s, k) => {
                      const hasTime = s.timestamp != null
                      const key = `${i}-${k}`
                      const isOpen = openSrc === key
                      return (
                        <button key={k}
                          onClick={() => hasTime ? onSeek?.(s.timestamp) : setOpenSrc(isOpen ? null : key)}
                          title={hasTime ? "Jump to this moment in the video" : "Show this passage"}
                          className={`flex items-center gap-2 border rounded-lg pr-2.5 transition-colors cursor-pointer ${isOpen ? 'bg-zinc-700 border-emerald-600' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'}`}>
                          {s.frame
                            ? <img src={s.frame} alt={s.label} className="w-12 h-8 object-cover rounded-l-lg" />
                            : <span className="w-12 h-8 flex items-center justify-center text-[10px] text-zinc-400 px-1">{s.label}</span>}
                          <span className="text-[11px] text-zinc-300 flex items-center gap-1">
                            <CornerDownRight className="w-3 h-3" />{hasTime ? fmt(s.timestamp) : (isOpen ? 'hide' : 'view')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {/* Expanded passage for a clicked document source */}
                  {m.sources.map((s, k) => {
                    const key = `${i}-${k}`
                    if (openSrc !== key || !s.text) return null
                    return (
                      <div key={`t-${k}`} className="text-xs text-zinc-300 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
                        <span className="text-emerald-400 font-semibold">{s.label}: </span>{s.text}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-3 border-t border-white/5 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={`Ask about ${about}...`}
          className="flex-1 bg-[#0f0b24] border border-white/15 rounded-xl px-3.5 py-2.5 text-[14.5px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25" />
        <button onClick={submit} disabled={busy || !input.trim()} title="Send"
          className="px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 rounded-xl transition">
          <Send className="w-4 h-4" />
        </button>
      </div>
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-6 cursor-zoom-out" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" className="max-w-full max-h-[88vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  )
}
