import { useEffect, useRef, useState } from "react"
import { ollamaState, downloadFor, FIRST_MODEL, pullModel } from "../lib/ollamaSetup"

// Ollama in three steps for someone who never used a terminal: install it,
// let this site in, get the first model. Each step ticks by itself (checked every
// 4 s), so the user only does the step that is lit. onReady: a model is there.
export default function OllamaSetup({ onReady }) {
  const [s, setS] = useState({ state: "checking", models: [] })
  const [pull, setPull] = useState(null) // { p: 0..1 } while downloading, { error } when it failed
  const [copied, setCopied] = useState("")
  const ready = useRef(false)
  const dl = downloadFor()

  useEffect(() => {
    let alive = true
    const look = async () => {
      const now = await ollamaState()
      if (!alive) return
      setS(now)
      if (now.state === "ok" && now.models.some((m) => !/cloud$/.test(m)) && !ready.current) { ready.current = true; onReady?.() }
    }
    look()
    const id = setInterval(look, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [onReady])

  const copy = (t) => { navigator.clipboard?.writeText(t).then(() => { setCopied(t); setTimeout(() => setCopied(""), 1500) }).catch(() => {}) }
  const get = async () => {
    setPull({ p: 0 })
    try { await pullModel(FIRST_MODEL.name, (p) => setPull({ p })); setPull(null); setS(await ollamaState()) }
    catch (e) { setPull({ error: e.message }) }
  }

  const installed = s.state === "ok" || s.state === "blocked"
  const allowed = s.state === "ok"
  const hasModel = allowed && s.models.some((m) => !/cloud$/.test(m))
  const step = !installed ? 1 : !allowed ? 2 : !hasModel ? 3 : 4
  const Row = ({ n, title, children }) => (
    <li className={`rounded-lg border p-3 ${step === n ? "border-blue-500/60 bg-blue-500/10" : "border-zinc-700"}`}>
      <p className={`text-sm font-semibold ${step > n ? "text-emerald-400" : step === n ? "text-zinc-100" : "text-zinc-500"}`}>{step > n ? "✓" : `${n}.`} {title}</p>
      {step === n && <div className="mt-1.5 text-xs text-zinc-400 space-y-2">{children}</div>}
    </li>
  )
  const code = (t) => (
    <span className="flex gap-2 items-stretch mt-1">
      <code className="flex-1 text-emerald-300 font-mono bg-black/40 rounded px-2 py-1.5 whitespace-pre-wrap break-all">{t}</code>
      <button type="button" onClick={() => copy(t)} className="px-2 rounded border border-zinc-600 text-zinc-300 hover:bg-zinc-700">{copied === t ? "Copied" : "Copy"}</button>
    </span>
  )

  if (s.state === "checking") return <p className="text-xs text-zinc-500 mt-3">Looking for Ollama on this computer...</p>
  return (
    <div className="bg-zinc-800 rounded-lg p-3.5 mt-3" data-testid="ollama-setup">
      <p className="text-zinc-200 font-semibold text-sm">Set up Ollama (free, the AI runs on your computer)</p>
      <p className="text-xs text-zinc-500 mt-0.5 mb-2.5">Do the lit step. This box notices by itself when a step is done.</p>
      <ol className="space-y-2">
        <Row n={1} title="Install Ollama">
          <a href={dl.url} target="_blank" rel="noreferrer" className="inline-block px-3 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-400">⬇ Download Ollama for {dl.os}</a>
          {dl.command ? <p>On Linux, paste this in a terminal instead:{code(dl.command)}</p> : <p>Open the file you downloaded and click through it, like any app. Ollama then starts by itself.</p>}
        </Row>
        <Row n={2} title="Let this website use Ollama">
          <p>Ollama is running, but it only talks to websites you allow. Once:</p>
          <p>{dl.os === "Windows" ? <>Press the Windows key, type <b className="text-zinc-200">PowerShell</b>, press Enter, paste this and press Enter:</> : <>Open the Terminal app, paste this and press Enter:</>}</p>
          {code(dl.os === "Windows" ? `setx OLLAMA_ORIGINS "${location.origin}"` : dl.os === "Mac" ? `launchctl setenv OLLAMA_ORIGINS "${location.origin}"` : `sudo systemctl edit ollama  # add: Environment="OLLAMA_ORIGINS=${location.origin}"`)}
          <p>Then quit Ollama ({dl.os === "Windows" ? "right-click its icon at the bottom right of the taskbar, Quit" : "its icon in the menu bar, Quit"}) and open it again.</p>
        </Row>
        <Row n={3} title="Get the AI model">
          <p>One download of {FIRST_MODEL.size} ({FIRST_MODEL.name}). It stays on your computer.</p>
          {!pull && <button type="button" onClick={get} className="px-3 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-400">⬇ Get {FIRST_MODEL.name}</button>}
          {pull && !pull.error && (
            <div role="progressbar" aria-valuenow={Math.round(pull.p * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 rounded bg-zinc-700 overflow-hidden"><div className="h-2 bg-blue-500" style={{ width: `${Math.round(pull.p * 100)}%` }} /></div>
              <p className="mt-1">Downloading... {Math.round(pull.p * 100)}%. You can keep this page open and wait.</p>
            </div>
          )}
          {pull?.error && <p className="text-red-300">{pull.error} <button type="button" onClick={get} className="underline">Try again</button></p>}
        </Row>
      </ol>
      {step === 4 && <p className="text-emerald-400 text-sm mt-2.5">✓ Ollama is ready.</p>}
    </div>
  )
}
