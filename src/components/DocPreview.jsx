import { useState, useMemo, useEffect } from "react"
import { renderShot } from "../lib/annotateImage"
import { evaluateDoc } from "../lib/evalDoc"

function formatTS(secs) {
  if (secs == null) return "00:00"
  return `${Math.floor(secs / 60).toString().padStart(2, "0")}:${Math.floor(secs % 60).toString().padStart(2, "0")}`
}

// ── "To verify" detection ──
// Acronyms (ERP, KPI, SLA, API…) are the things a reader most often needs to
// check — the AI or the transcript can get them wrong. We highlight them and list
// them so the user can confirm or fix each one. A few everyday ones are ignored.
const ACR_STOP = new Set(["OK", "AI", "NO", "ID", "TV", "PC", "IT", "OS", "UI", "UX", "FAQ", "SOP", "PDF"])
const ACR_RE = /\b[A-Z][A-Z0-9&/]{1,5}\b/g
function isAcr(a) { return a && !ACR_STOP.has(a) }

function collectAcronyms(docs) {
  const counts = new Map()
  const scan = (s) => {
    if (typeof s !== "string") return
    const ms = s.match(ACR_RE)
    if (ms) for (const a of ms) if (isAcr(a)) counts.set(a, (counts.get(a) || 0) + 1)
  }
  for (const d of docs || []) {
    const st = d.step
    if (!st) continue
    scan(st.title); (st.steps || []).forEach(scan); scan(st.result); scan(st.note)
  }
  return counts
}

// Render text, wrapping unverified acronyms in a clickable amber chip.
function Highlighted({ text, verified, onClickAcr }) {
  if (!text) return null
  const out = []
  let last = 0, m
  const re = new RegExp(ACR_RE.source, "g")
  while ((m = re.exec(text))) {
    const a = m[0]
    if (!isAcr(a)) continue
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(verified.has(a)
      ? <span key={m.index} className="text-emerald-300/90">{a}</span>
      : <mark
          key={m.index}
          onClick={(e) => { e.stopPropagation(); onClickAcr?.(a) }}
          className="bg-amber-400/20 text-amber-200 rounded px-0.5 cursor-pointer ring-1 ring-amber-400/40 hover:bg-amber-400/30 transition-colors"
          title="Click to verify or fix"
        >{a}</mark>)
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

// ── Inline editor for one step: plain labels, big fields, one box per action ──
function StepEditor({ step, onSave, onCancel }) {
  const [title, setTitle] = useState(step?.title || "")
  const [lines, setLines] = useState(step?.steps?.length ? [...step.steps] : [""])
  const [result, setResult] = useState(step?.result || "")
  const [note, setNote] = useState(step?.note || "")

  const setLine = (i, v) => setLines(ls => ls.map((l, idx) => idx === i ? v : l))
  const addLine = () => setLines(ls => [...ls, ""])
  const delLine = (i) => setLines(ls => ls.filter((_, idx) => idx !== i).length ? ls.filter((_, idx) => idx !== i) : [""])
  const save = () => onSave({ ...step, title: title.trim(), steps: lines.map(l => l.trim()).filter(Boolean), result: result.trim(), note: note.trim() })
  const keys = (e) => {
    if (e.key === "Escape") onCancel()
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save()
  }

  const field = "w-full bg-[#0f0b24] border border-white/15 rounded-lg px-3.5 py-2.5 text-[15px] text-zinc-100 leading-relaxed focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25 transition"
  const label = "text-sm font-semibold text-zinc-200 mb-1.5 block"
  const hint = "text-xs text-zinc-500 font-normal ml-1"

  return (
    <div onKeyDown={keys} className="mt-3 border border-violet-400/40 rounded-xl p-4 sm:p-5 space-y-4 bg-[#160f36] shadow-[0_12px_40px_rgba(30,15,90,0.45)] animate-[fadeIn_.15s_ease-out]">
      <div>
        <label className={label}>Step title</label>
        <input autoFocus className={field + " font-semibold"} value={title} onChange={e => setTitle(e.target.value)} placeholder="For example: Create a new dashboard" />
      </div>
      <div>
        <label className={label}>What to do <span className={hint}>one action per box</span></label>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="min-w-[30px] h-[30px] rounded-lg bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-1.5">{i + 1}</span>
              <textarea className={field + " resize-y min-h-[46px]"} style={{ fieldSizing: "content" }} rows={1} value={l} onChange={e => setLine(i, e.target.value)} placeholder="For example: Click the Share button" />
              <button onClick={() => delLine(i)} title="Remove this action"
                className="shrink-0 mt-1 h-[38px] px-3 rounded-lg text-sm text-zinc-300 border border-white/10 hover:border-red-400/60 hover:text-red-300 hover:bg-red-500/10 transition">Remove</button>
            </div>
          ))}
        </div>
        <button onClick={addLine} className="mt-2.5 h-9 px-3.5 rounded-lg text-sm font-medium text-violet-200 border border-violet-400/40 hover:bg-violet-500/15 transition">+ Add an action</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>What you get <span className={hint}>optional</span></label>
          <textarea rows={2} className={field + " resize-y"} style={{ fieldSizing: "content" }} value={result} onChange={e => setResult(e.target.value)} placeholder="For example: The link is copied" />
        </div>
        <div>
          <label className={label}>Tip <span className={hint}>optional</span></label>
          <textarea rows={2} className={field + " resize-y"} style={{ fieldSizing: "content" }} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything the reader should know" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button onClick={save} className="h-10 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg text-sm font-semibold transition shadow-[0_6px_20px_rgba(109,74,255,0.35)]">Save changes</button>
        <button onClick={onCancel} className="h-10 px-5 border border-white/15 hover:border-white/30 rounded-lg text-sm transition">Cancel</button>
        <span className="text-xs text-zinc-500 ml-auto hidden sm:inline">Ctrl + Enter saves · Esc cancels</span>
      </div>
    </div>
  )
}

// Read view of one step. The whole block is clickable: click any text to edit.
function StepView({ step, letter, verified, onClickAcr, onEdit }) {
  if (!step) return null
  return (
    <div onClick={onEdit} title="Click to edit this step"
      className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-violet-400/40 hover:bg-violet-500/[0.04] transition cursor-pointer overflow-hidden">
      {step.steps?.map((s, i) => (
        <div key={i} className="flex items-start gap-3 px-3.5 py-2.5 border-b border-white/5 last:border-b-0">
          <span className="min-w-[34px] h-6 rounded-md bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{letter}{i + 1}</span>
          <p className="text-[14.5px] text-zinc-200 leading-relaxed"><Highlighted text={s} verified={verified} onClickAcr={onClickAcr} /></p>
        </div>
      ))}
      {step.result && (
        <div className="flex items-start gap-3 px-3.5 py-2.5 bg-emerald-500/[0.07] border-t border-white/5">
          <span className="text-xs font-bold text-emerald-300 shrink-0 mt-0.5 w-[44px]">Result</span>
          <p className="text-sm text-emerald-100/90 leading-relaxed"><Highlighted text={step.result} verified={verified} onClickAcr={onClickAcr} /></p>
        </div>
      )}
      {step.note && (
        <div className="flex items-start gap-3 px-3.5 py-2.5 bg-sky-500/[0.07] border-t border-white/5">
          <span className="text-xs font-bold text-sky-300 shrink-0 mt-0.5 w-[44px]">Tip</span>
          <p className="text-sm text-sky-100/90 leading-relaxed"><Highlighted text={step.note} verified={verified} onClickAcr={onClickAcr} /></p>
        </div>
      )}
    </div>
  )
}

const LETTER = (i) => { let s = "", n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0); return s }

export default function DocPreview({ transcriptChunks, annotatedDocs, onSeek, onEditStep, onMoveStep, onDeleteStep, onReplaceEverywhere }) {
  const hasAnnotations = annotatedDocs?.length > 0
  const hasTranscript = transcriptChunks?.length > 0

  const [editing, setEditing] = useState(null)        // index being edited
  const [verified, setVerified] = useState(() => new Set())
  const [showVerify, setShowVerify] = useState(false)
  const [drafts, setDrafts] = useState({})            // acronym -> replacement text
  const [lightbox, setLightbox] = useState(null)      // enlarged screenshot {src, label}

  const acronyms = useMemo(() => collectAcronyms(annotatedDocs), [annotatedDocs])
  const evalResult = useMemo(() => evaluateDoc(annotatedDocs), [annotatedDocs])
  const toVerify = useMemo(() => [...acronyms.keys()].filter(a => !verified.has(a)), [acronyms, verified])

  if (!hasTranscript && !hasAnnotations) {
    return (
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 min-h-64 flex items-center justify-center">
        <p className="text-zinc-600 text-sm text-center">Docs will appear here<br />after video is processed</p>
      </div>
    )
  }

  if (hasAnnotations) {
    const markGood = (a) => setVerified(v => new Set(v).add(a))
    const applyReplace = (a) => {
      const repl = (drafts[a] ?? "").trim()
      if (repl && repl !== a) onReplaceEverywhere?.(a, repl)
      markGood(a)
      setDrafts(d => { const n = { ...d }; delete n[a]; return n })
    }
    const openVerify = (a) => { setShowVerify(true); setDrafts(d => ({ ...d, [a]: d[a] ?? "" })) }

    return (
      <div className="rounded-2xl bg-[#120c2c]/85 backdrop-blur-md border border-violet-400/15 overflow-hidden flex flex-col" style={{ maxHeight: "82vh" }}>
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between shrink-0 gap-2 flex-wrap">
          <p className="text-sm font-semibold text-zinc-100">Your guide <span className="text-zinc-400 font-normal">· click any step to edit it</span></p>
          <div className="flex items-center gap-2 shrink-0">
            <span
              title={`Self-check (no manual answer key): ${evalResult.unclearRate}% steps unclear · ${evalResult.logisticsSteps} noise steps · apps named: ${evalResult.appsNamed.join(', ') || 'none'}`}
              className={`text-xs px-2 py-1 rounded-full ring-1 ${
                evalResult.score >= 75 ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40' :
                evalResult.score >= 50 ? 'bg-amber-500/15 text-amber-300 ring-amber-500/40' :
                'bg-red-500/15 text-red-300 ring-red-500/40'}`}>
              Self-check {evalResult.score}/100
            </span>
            {toVerify.length > 0 && (
              <button onClick={() => setShowVerify(s => !s)}
                className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-500/25 transition-colors">
                ⚠ {toVerify.length} to verify
              </button>
            )}
            <span className="text-xs text-zinc-300">{annotatedDocs.length} parts</span>
          </div>
        </div>

        {/* Verify panel */}
        {showVerify && toVerify.length > 0 && (
          <div className="px-4 py-3 border-b border-zinc-800 bg-amber-950/10 max-h-48 overflow-y-auto animate-[fadeIn_.15s_ease-out]">
            <p className="text-[11px] text-amber-200/80 mb-2">Check these short codes / acronyms. Fix once → it changes everywhere.</p>
            <div className="space-y-1.5">
              {toVerify.map(a => (
                <div key={a} className="flex items-center gap-1.5">
                  <span className="text-xs font-mono bg-amber-400/15 text-amber-200 rounded px-1.5 py-0.5 ring-1 ring-amber-400/30 shrink-0">{a}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0">×{acronyms.get(a)}</span>
                  <input
                    value={drafts[a] ?? ""}
                    onChange={e => setDrafts(d => ({ ...d, [a]: e.target.value }))}
                    placeholder="correct it (optional)"
                    className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500" />
                  {(drafts[a] ?? "").trim() && (drafts[a] ?? "").trim() !== a
                    ? <button onClick={() => applyReplace(a)} className="text-[11px] px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shrink-0">Replace all</button>
                    : <button onClick={() => markGood(a)} className="text-[11px] px-2 py-1 border border-zinc-600 hover:border-emerald-500 text-zinc-300 rounded transition-colors shrink-0">Looks good</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto divide-y divide-white/5">
          {annotatedDocs.map((doc, i) => (
            <div key={i} className="p-4 sm:p-5">
              {/* Header: part badge, title, time; labelled buttons are always visible */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-white bg-violet-600 rounded-md px-2 py-1 shrink-0">Part {LETTER(i)}</span>
                <h4 onClick={() => doc.step && setEditing(i)} className={`text-[15.5px] font-semibold text-zinc-50 leading-snug min-w-0 flex-1 ${doc.step ? "cursor-pointer hover:text-violet-200" : ""}`}>
                  {doc.step?.title ? <Highlighted text={doc.step.title} verified={verified} onClickAcr={openVerify} /> : `Step ${i + 1}`}
                  {doc.lowConfidence && (
                    <span title="Written from thin evidence (little narration and little readable screen text at this moment). Worth a quick look."
                      className="ml-2 align-middle text-[11px] font-medium text-amber-200 bg-amber-500/15 border border-amber-400/30 rounded-full px-2 py-0.5">check this</span>
                  )}
                </h4>
                <button onClick={() => onSeek?.(doc.timestamp, i)} title="Play the video from this moment"
                  className="text-xs font-semibold text-cyan-200 bg-cyan-500/10 border border-cyan-400/25 hover:bg-cyan-500/20 rounded-full px-2.5 py-1 tabular-nums transition">▶ {doc.label}</button>
              </div>
              {editing !== i && doc.step && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <button onClick={() => setEditing(i)} className="h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-500 transition">✎ Edit</button>
                  <button onClick={() => onMoveStep?.(i, -1)} disabled={i === 0} className="h-8 px-3 rounded-lg text-[13px] text-zinc-200 border border-white/15 hover:border-white/30 disabled:opacity-30 disabled:cursor-default transition">↑ Move up</button>
                  <button onClick={() => onMoveStep?.(i, 1)} disabled={i === annotatedDocs.length - 1} className="h-8 px-3 rounded-lg text-[13px] text-zinc-200 border border-white/15 hover:border-white/30 disabled:opacity-30 disabled:cursor-default transition">↓ Move down</button>
                  <button onClick={() => { if (window.confirm(`Delete "${doc.step.title || "this step"}" from the guide?`)) onDeleteStep?.(i) }}
                    className="h-8 px-3 rounded-lg text-[13px] text-red-200 border border-red-400/25 hover:bg-red-500/10 hover:border-red-400/50 transition">Delete</button>
                </div>
              )}

              {editing === i && doc.step ? (
                <StepEditor step={doc.step} onSave={(ns) => { onEditStep?.(i, ns); setEditing(null) }} onCancel={() => setEditing(null)} />
              ) : doc.step ? (
                <>
                  <StepView step={doc.step} letter={LETTER(i)} verified={verified} onClickAcr={openVerify} onEdit={() => setEditing(i)} />
                  <MarkedShots shots={doc.shots} onOpen={(src, k) => setLightbox({ src, label: `Part ${LETTER(i)} · screenshot ${k + 1}` })} />
                  {!doc.shots?.length && doc.frame && (
                    <button onClick={() => setLightbox({ src: doc.frame, label: `Part ${LETTER(i)} · ${doc.label}` })} className="mt-2.5 block w-40 cursor-zoom-in" title="Click to enlarge">
                      <img src={doc.frame} alt="" className="w-full rounded-md ring-1 ring-white/10" />
                    </button>
                  )}
                </>
              ) : doc.annotation ? (
                <p className="text-zinc-300 text-sm leading-relaxed mt-2">{doc.annotation}</p>
              ) : null}
            </div>
          ))}
        </div>

        {/* Screenshot lightbox — dense enterprise UIs are unreadable at 80px */}
        {lightbox && (
          <div className="fixed inset-0 z-[60] bg-black/85 flex flex-col items-center justify-center p-6 cursor-zoom-out"
            onClick={() => setLightbox(null)}>
            <img src={lightbox.src} alt="" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-zinc-300 font-mono">{lightbox.label}</span>
              <span className="text-xs text-zinc-500">click anywhere to close</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Transcript only
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col" style={{ maxHeight: "65vh" }}>
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <p className="text-xs text-zinc-500">Transcript — use "Annotate" to add AI notes</p>
      </div>
      <div className="overflow-y-auto p-4 space-y-3">
        {transcriptChunks.map((chunk, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-emerald-400 font-mono text-xs shrink-0 mt-0.5">{formatTS(chunk.timestamp?.[0])}</span>
            <p className="text-zinc-300 text-sm leading-relaxed">{chunk.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Screenshots with each action's marker burned in (box + numbered label).
function MarkedShots({ shots, onOpen }) {
  const [imgs, setImgs] = useState([])
  useEffect(() => {
    let live = true
    ;(async () => {
      const out = []
      // each image carries its own count: the shots list can change (a merge,
      // an edit) while an older render is still on screen
      for (const s of shots || []) {
        let src = null
        try { src = (await renderShot(s.image, s.callouts, { maxW: 1100 })).dataUrl } catch { /* skip this one */ }
        out.push({ src, n: s.callouts?.length || 0 })
      }
      if (live) setImgs(out)
    })()
    return () => { live = false }
  }, [shots])
  if (!shots?.length || !imgs.length) return null
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      {imgs.map(({ src, n }, k) => src && (
        <button key={k} onClick={() => onOpen(src, k)} title="Click to enlarge" className="relative block cursor-zoom-in group/shot">
          <img src={src} alt="" className="w-full rounded-md ring-1 ring-violet-500/30 group-hover/shot:ring-violet-400/70 transition" />
          <span className="absolute bottom-1 right-1 text-[10px] font-semibold bg-violet-600/90 text-white rounded px-1.5 py-0.5">
            {n} marked
          </span>
        </button>
      ))}
    </div>
  )
}
