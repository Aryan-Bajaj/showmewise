import { useState, useEffect, useRef } from "react"
import { X, Globe, Cpu, Plus, FileText, ChevronDown, Eye, Gauge, AlertTriangle } from "lucide-react"
import { DEFAULT_SECTIONS } from "../hooks/useDocParser"
import { WEBLLM_MODELS, DEFAULT_WEBLLM_MODEL, isWebLLMVision, ollamaModelHasVision, recommendModel, modelGB, localEngineStatus } from "../lib/llm"
import { probeSystem } from "../lib/systemCheck"
import { savedBest } from "../lib/computerCheck"
import { isCloud, cloudOn, setCloud, setCloudModel } from "../lib/cloud"
import OllamaSetup from "./OllamaSetup"
const FREE_CLOUD = "gemma4:31b-cloud"

// Desktop build ships ONE engine (bundled llama.cpp + gemma3 vision) so a
// non-technical user on an office laptop never has to choose or install
// anything. WebLLM/Ollama choices exist only in the web build.
const DESKTOP = import.meta.env.VITE_BUILD_TARGET === "desktop"
// guide steps right in our own test videos (judged by reading, Oct 2026); others not tested yet
const TESTED = { "gemma3:12b": "✓ 60% in tests" }

export default function AISettings({ onConfirm, onClose, suggestedSections, toolsUsed = [], videoDuration = 0 }) {
  const [mode, setMode] = useState(DESKTOP ? "local" : "webllm") // browser-first on web: works for everyone, no install
  const [ollamaStatus, setOllamaStatus] = useState("checking")
  const autoPicked = useRef(false) // switch to Ollama once; a later choice by the user stays
  const [ollamaModels, setOllamaModels] = useState([])
  // Ollama cloud models: listed only after the user turned them on, with a notice
  const [cloudModels, setCloudModels] = useState([])
  const [cloud, setCloudState] = useState(cloudOn())
  const [cloudAsk, setCloudAsk] = useState(false)
  const [cloudOk, setCloudOk] = useState(false)
  const [selectedModel, setSelectedModel] = useState("")
  const [webModel, setWebModel] = useState(savedBest()?.id || DEFAULT_WEBLLM_MODEL) // "Test my computer" result first
  const [selected, setSelected] = useState([])
  const [customSections, setCustomSections] = useState([])
  const [customInput, setCustomInput] = useState("")
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [ollamaVision, setOllamaVision] = useState(false)
  // Accuracy passes: Consolidate on, Self-verify off by default (see below). Self-verify fact-checks each step against
  // the evidence (~2x slower); Consolidation tidies titles into a coherent SOP.
  // Off by default: in two judged runs (21 Oct 2026) it removed correct details
  // ("SAP Analytics Cloud tab", "Project Builder") and cost 20 to 30 minutes.
  const [selfVerify, setSelfVerify] = useState(false)
  const [consolidate, setConsolidate] = useState(true)
  // System probe → model recommendation (browser-side; works on any OS/device).
  const [sys, setSys] = useState(null)
  const [testing, setTesting] = useState(false)
  // Bundled desktop engine (llama.cpp + gemma3) — only present in the desktop app.
  const [hasLocalEngine, setHasLocalEngine] = useState(false)

  // In the packaged desktop app the bundled engine is running on localhost; detect
  // it and make it the default (best accuracy, zero setup, fully offline). In the
  // desktop build keep polling until it's up — the engine can still be loading
  // the model when the user reaches this dialog.
  useEffect(() => {
    let alive = true
    const check = () => localEngineStatus().then((ok) => { if (alive && ok) { setHasLocalEngine(true); if (DESKTOP) setMode("local") } })
    check()
    if (!DESKTOP) return () => { alive = false }
    const id = setInterval(() => { if (!hasLocalEngine) check() }, 3000)
    return () => { alive = false; clearInterval(id) }
  }, [hasLocalEngine])

  const runSystemTest = async () => {
    setTesting(true)
    try {
      const result = await probeSystem()
      setSys(result)
      // Auto-pick the best model the device can handle (keep vision only if it fits).
      // the real "Test my computer" result wins over this quick guess
      if (!savedBest() && result.webgpu && result.capacityGB > 0) {
        setWebModel(recommendModel(result.capacityGB, isWebLLMVision(webModel)))
      }
    } catch {
      setSys({ webgpu: false, os: "your device", error: true })
    }
    setTesting(false)
  }

  // the quick guess runs by itself; its warning below stays useful
  useEffect(() => { if (!DESKTOP) runSystemTest() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Warn (simple English) if the chosen model is heavier than the device can load.
  const heavyWarning = (() => {
    if (!sys || !sys.webgpu) return null
    const need = modelGB(webModel)
    if (need <= sys.capacityGB + 0.2) return null
    const lighter = recommendModel(sys.capacityGB, false)
    const lighterLabel = WEBLLM_MODELS.find((m) => m.id === lighter)?.label || "a lighter model"
    return `This model needs about ${need} GB of graphics memory. ${sys.os} looks like it can handle around ${sys.capacityGB} GB, so it may load very slowly or fail. Pick "${lighterLabel}" for a smooth run.`
  })()

  useEffect(() => {
    setSelected(suggestedSections?.length ? suggestedSections : [])
  }, [suggestedSections])

  const checkOllama = (silent = false) => {
    if (!silent) setOllamaStatus("checking")
    fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // cloud models run on Ollama's servers: offered only when turned on, never picked by itself
        const local = (data?.models || []).filter(m => !isCloud(m.name))
        setCloudModels((data?.models || []).filter(m => isCloud(m.name)).map(m => m.name))
        if (local.length) {
          const names = local.map(m => m.name)
          setOllamaModels(names)
          // Ollama found: use it with its best model, the user changes nothing.
          // gemma3 first (it reads screens without inventing), then the biggest.
          const size = (m) => parseFloat(m.details?.parameter_size) || 0
          const best = [...local].sort((a, b) => (/gemma3/.test(b.name) - /gemma3/.test(a.name)) || size(b) - size(a))[0]
          // (a model the user picked with Vidi's "Use" button comes first, when it is installed)
          let picked = ""; try { picked = localStorage.getItem("vd-model-pick") || "" } catch { /* private window */ }
          if (!autoPicked.current) { autoPicked.current = true; setSelectedModel(names.includes(picked) ? picked : best.name); if (!DESKTOP) setMode("ollama") }
          else setSelectedModel((cur) => names.includes(cur) || (isCloud(cur) && cloudOn()) ? cur : best.name)
          setOllamaStatus("ok")
        } else {
          setOllamaStatus("down")
        }
      })
      .catch(() => setOllamaStatus("down"))
  }

  useEffect(() => { if (!DESKTOP) checkOllama() }, [])

  // Keep checking quietly while the user has Ollama selected but it's not
  // detected yet — so the moment they allow this origin (OLLAMA_ORIGINS) and
  // restart Ollama, it connects on its own without needing a Retry click.
  useEffect(() => {
    if (mode !== "ollama" || ollamaStatus !== "down") return
    const id = setInterval(() => checkOllama(true), 4000)
    return () => clearInterval(id)
  }, [mode, ollamaStatus])

  // Does the selected Ollama model support vision (e.g. gemma3)? → show a badge.
  useEffect(() => {
    if (mode !== "ollama" || !selectedModel) { setOllamaVision(false); return }
    let alive = true
    ollamaModelHasVision(selectedModel).then((v) => { if (alive) setOllamaVision(v) })
    return () => { alive = false }
  }, [mode, selectedModel])

  // Add a cloud model from Ollama's list: Ollama fetches its small stub file, then it shows in the list
  const [adding, setAdding] = useState({})
  const addCloudModel = (name) => {
    setAdding((a) => ({ ...a, [name]: "busy" }))
    fetch("http://localhost:11434/api/pull", { method: "POST", body: JSON.stringify({ model: name, stream: false }), signal: AbortSignal.timeout(120000) })
      .then((r) => { if (!r.ok) throw new Error(r.status); setAdding((a) => ({ ...a, [name]: "done" })); setSelectedModel(name); setCloudModel(name); checkOllama(true) })
      .catch(() => setAdding((a) => ({ ...a, [name]: "error" })))
  }

  const turnCloud = (on) => {
    setCloud(on); setCloudState(on); setCloudAsk(false); setCloudOk(false)
    // turned off while a cloud model was chosen: back to the best one on this computer
    if (!on && isCloud(selectedModel)) setSelectedModel(ollamaModels[0] || "")
    if (!on) setCloudModel(null)
  }

  const toggle = (s) =>
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const addCustom = () => {
    const v = customInput.trim()
    if (v && !selected.includes(v)) {
      setCustomSections(prev => [...prev, v])
      setSelected(prev => [...prev, v])
    }
    setCustomInput("")
  }

  const allSuggestions = [...new Set([...(suggestedSections ?? []), ...DEFAULT_SECTIONS, ...customSections])]

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Configure Annotation</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document title */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Document Title</p>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Create and share a dashboard"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-zinc-600 mt-1.5">Used as the guide heading. Leave blank for an auto title (not the video file name).</p>

          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2 mt-4">Company name <span className="text-zinc-600 normal-case tracking-normal">(optional)</span></p>
          <input
            type="text" value={company} onChange={e => setCompany(e.target.value)}
            placeholder="e.g. company name"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-zinc-600 mt-1.5">Shown in the top-right of the exported document.</p>

          {toolsUsed.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="text-xs text-zinc-500">Detected tools:</span>
              {toolsUsed.map(t => (
                <span key={t} className="text-xs bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800" />

        {/* AI Backend */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">AI Backend</p>

          {/* Bundled desktop engine — the ONLY engine in the desktop build */}
          {(hasLocalEngine || DESKTOP) && (
            <button onClick={() => { autoPicked.current = true; setMode("local") }}
              className={`w-full mb-3 p-4 rounded-xl border-2 flex items-start gap-3 text-left transition-all
                ${mode === "local" ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-700 hover:border-zinc-500"}`}>
              <Eye className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">Built-in AI (gemma3){DESKTOP ? "" : " · Recommended"}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">Runs inside this app — best accuracy, sees the screen, fully offline. Nothing leaves your device.</span>
                {hasLocalEngine
                  ? <span className="block text-xs text-emerald-400 mt-1">✓ Ready</span>
                  : <span className="block text-xs text-violet-400 mt-1">Starting… if this doesn't turn green, launch ShowMeWise.bat and keep its window open.</span>}
              </span>
            </button>
          )}

          {!DESKTOP && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { autoPicked.current = true; setMode("webllm") }}
              className={`p-4 rounded-xl border-2 flex flex-col gap-2 text-left transition-all
                ${mode === "webllm" ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-700 hover:border-zinc-500"}`}>
              <Globe className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">WebLLM</span>
              <span className="text-xs text-zinc-500 leading-relaxed">Runs in browser. First run ~1GB.</span>
              <span className="text-xs text-zinc-400">Chrome 113+ · 8 GB+ RAM</span>
            </button>

            <button onClick={() => { autoPicked.current = true; setMode("ollama") }}
              className={`p-4 rounded-xl border-2 flex flex-col gap-2 text-left transition-all
                ${mode === "ollama" ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-500"}`}>
              <Cpu className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Ollama</span>
              <span className="text-xs text-zinc-500 leading-relaxed">Uses your local Ollama models.</span>
              <span className={`text-xs mt-auto ${
                ollamaStatus === "ok" ? "text-emerald-400" :
                ollamaStatus === "down" ? "text-red-400" : "text-zinc-500"}`}>
                {ollamaStatus === "checking" && "Checking..."}
                {ollamaStatus === "ok" && `✓ Running · ${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''}`}
                {ollamaStatus === "down" && "Not detected"}
              </span>
            </button>
          </div>
          )}

          {/* WebLLM model picker — speed vs accuracy, all in-browser */}
          {!DESKTOP && mode === "webllm" && (() => {
            const m = WEBLLM_MODELS.find(x => x.id === webModel) ?? WEBLLM_MODELS[0]
            return (
              <div className="mt-3">
                {/* System test → model recommendation */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {/* the real check: tries the models on this computer (CheckPage) */}
                  <a href="/#/check" target="_blank" rel="noopener"
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-600/50 text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                    <Gauge className="w-3.5 h-3.5" /> {savedBest() ? `Tested: ${savedBest().name} fits best · test again` : "Test my computer (finds the best size)"}
                  </a>
                  {sys && (
                    <span className="text-xs text-zinc-400">
                      {sys.webgpu
                        ? `${sys.os} · ${sys.gpuName || (sys.discrete ? "dedicated GPU" : "integrated graphics")}${sys.ram ? ` · ${sys.ram} GB RAM` : ""} → fits ~${sys.capacityGB} GB`
                        : `${sys.os}: in-browser AI not supported here (no WebGPU — use Chrome/Edge on desktop)`}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500 mb-1.5">Browser model{sys?.webgpu ? " · auto-picked for your system" : ""}</p>
                <div className="relative">
                  <select
                    value={webModel}
                    onChange={e => setWebModel(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {WEBLLM_MODELS.map(o => (
                      <option key={o.id} value={o.id}>{o.label} · {o.name || o.params} · {o.size}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5">
                  {[['Accuracy', m.accuracy], ['Speed', m.speed], ['Per segment', m.time]].map(([k, v]) => (
                    <div key={k} className="bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2.5 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{k}</div>
                      <div className="text-xs font-medium text-emerald-300 mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                {isWebLLMVision(webModel) && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                    <Eye className="w-3.5 h-3.5 shrink-0" /> Looks at the screenshots, not only the screen text. Not measured yet.
                  </div>
                )}
                {heavyWarning && (
                  <div className="flex items-start gap-2 mt-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {heavyWarning}
                  </div>
                )}
                <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{m.note}</p>
                <p className="text-xs text-zinc-600 mt-1.5">
                  Times are a rough per-segment estimate plus a one-time model download. Slower on Intel / integrated graphics, faster on a dedicated GPU.
                </p>
              </div>
            )
          })()}

          {/* Model selector — shown when Ollama is running */}
          {mode === "ollama" && ollamaStatus === "ok" && ollamaModels.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-zinc-500 mb-1.5">Select model</p>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={e => { setSelectedModel(e.target.value); setCloudModel(e.target.value) }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {ollamaModels.map(m => (
                    <option key={m} value={m}>{m}{TESTED[m] ? ` · ${TESTED[m]}` : ""}</option>
                  ))}
                  {cloud && cloudModels.map(m => (
                    <option key={m} value={m}>☁ {m} (cloud){TESTED[m] ? ` · ${TESTED[m]}` : ""}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
              <p className="text-xs text-zinc-500 mt-1.5">✓ % = guide steps that came out right in our own test videos. Your videos can give a different result. Models without a % are not tested yet.</p>
              <label className="flex items-center gap-2 mt-3 text-xs text-zinc-300 cursor-pointer">
                <input type="checkbox" id="vd-cloud" checked={cloud || cloudAsk} onChange={(e) => e.target.checked ? setCloudAsk(true) : turnCloud(false)} />
                Use Ollama cloud models (more powerful)
              </label>
              {cloudAsk && (
                <div role="dialog" aria-label="About cloud models" className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                  <p className="font-semibold text-amber-200 mb-1">Before you turn this on</p>
                  <p>A cloud model is bigger and better at reasoning, but it runs on Ollama's servers. What it reads goes there: the words and screenshots of your video, your documents and your questions. Do not use it for private or work videos. It needs internet, and free use has limits.</p>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" id="vd-cloud-ok" checked={cloudOk} onChange={(e) => setCloudOk(e.target.checked)} /> I understand</label>
                  <div className="flex gap-2 mt-2">
                    <button type="button" disabled={!cloudOk} onClick={() => turnCloud(true)} className="px-3 py-1.5 rounded-md bg-amber-500 text-black font-semibold disabled:opacity-40">Turn on</button>
                    <button type="button" onClick={() => { setCloudAsk(false); setCloudOk(false) }} className="px-3 py-1.5 rounded-md border border-zinc-600 text-zinc-200">Cancel</button>
                  </div>
                </div>
              )}
              {/* one free cloud model, the best one for ShowMeWise (the others need paid Ollama credits) */}
              {cloud && !cloudModels.includes(FREE_CLOUD) && (
                <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5 flex items-center gap-3">
                  <div className="flex-1 text-xs text-zinc-200">
                    <b>☁ Gemma 4</b> · 31B · Free · ✓ 100% in our tests<br />
                    <span className="text-zinc-400">All-round, sees your screen. Best for guides. Needs the free Ollama account.</span>
                  </div>
                  {adding[FREE_CLOUD] === "error" && <span className="text-xs text-amber-300">could not add</span>}
                  <button type="button" disabled={adding[FREE_CLOUD] === "busy"} onClick={() => addCloudModel(FREE_CLOUD)}
                    className="px-3 py-1.5 rounded-md bg-blue-500 text-white text-xs font-semibold disabled:opacity-50">{adding[FREE_CLOUD] === "busy" ? "Adding…" : "Use this"}</button>
                </div>
              )}
              {isCloud(selectedModel) && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Cloud model: what it reads leaves your computer and goes to Ollama's servers.
                </div>
              )}
              {ollamaVision && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                  <Eye className="w-3.5 h-3.5 shrink-0" /> This model sees the screen — screenshots are sent for the most accurate steps.
                </div>
              )}
            </div>
          )}

          {mode === "ollama" && ollamaStatus === "down" && <OllamaSetup onReady={() => checkOllama()} />}
        </div>

        <div className="border-t border-zinc-800" />

        {/* Output format: fixed professional Desktop Procedure */}
        <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-lg p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-zinc-300 uppercase tracking-widest font-semibold">Output: Desktop Procedure</p>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Generates a structured procedure with an Index, Purpose, Prerequisites, numbered
            step-by-step actions (Action → Result + screenshot), Key Observations, Summary, FAQ and a Flow diagram.
            Off-topic / silent segments are skipped automatically.
          </p>
        </div>

        {/* Accuracy passes */}
        <div className="space-y-2.5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Accuracy</p>

          <button
            onClick={() => setSelfVerify(v => !v)}
            className="w-full flex items-start gap-3 text-left p-3 rounded-lg border border-zinc-700/60 bg-zinc-800/40 hover:border-zinc-600 transition-colors">
            <span className={`mt-0.5 w-9 h-5 rounded-full shrink-0 relative transition-colors ${selfVerify ? "bg-emerald-600" : "bg-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${selfVerify ? "left-[18px]" : "left-0.5"}`} />
            </span>
            <span>
              <span className="block text-sm font-medium text-zinc-200">Self-verify each step</span>
              <span className="block text-xs text-zinc-500 leading-relaxed">The AI checks every step a second time against the screen and the speech. It can remove made-up steps, but in our tests it also removed correct details. Takes about a third longer.</span>
            </span>
          </button>

          <button
            onClick={() => setConsolidate(v => !v)}
            className="w-full flex items-start gap-3 text-left p-3 rounded-lg border border-zinc-700/60 bg-zinc-800/40 hover:border-zinc-600 transition-colors">
            <span className={`mt-0.5 w-9 h-5 rounded-full shrink-0 relative transition-colors ${consolidate ? "bg-emerald-600" : "bg-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${consolidate ? "left-[18px]" : "left-0.5"}`} />
            </span>
            <span>
              <span className="block text-sm font-medium text-zinc-200">Consolidate procedure</span>
              <span className="block text-xs text-zinc-500 leading-relaxed">A final pass that tidies the step titles and merges duplicates into one clean, coherent procedure.</span>
            </span>
          </button>
        </div>

        {(() => {
          if (!videoDuration) return null
          return (
            <div className="flex items-start gap-2 text-xs text-zinc-400 bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2.5">
              <Gauge className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
              <span>
                <span className="text-zinc-200 font-medium">Run time depends on this computer.</span> On a 16 GB laptop without a strong graphics card, the most accurate model (gemma3 12B) took about 1¾ hours for a 10 minute video in our tests (about 2 hours with Self-verify). A smaller model is faster. The time left is measured live once writing starts, and steps appear as they are written.
              </span>
            </div>
          )
        })()}

        <button
          onClick={() => onConfirm(mode, null, mode === "ollama" ? selectedModel : mode === "local" ? "gemma3" : webModel, title.trim(), company.trim(), { selfVerify, consolidate })}
          disabled={mode === "ollama" && ollamaStatus === "down"}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors">
          Generate Procedure
        </button>
      </div>
    </div>
  )
}
