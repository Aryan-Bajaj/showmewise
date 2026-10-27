import { useEffect, useRef, useState } from "react"
import { ollamaState, downloadFor, DOWNLOADS, FIRST_MODEL, pullModel } from "../lib/ollamaSetup"
import { post, hasPlugin, ollamaBridge } from "../lib/bridge"
import { PLUGIN_URL } from "../lib/links"

// Ollama in three steps for someone who never used a terminal: install it,
// let this site in, get the first model. Each step ticks by itself (checked every
// 4 s), so the user only does the step that is lit. onReady: a model is there.
export default function OllamaSetup({ onReady }) {
  const [s, setS] = useState({ state: "checking", models: [] })
  const [pull, setPull] = useState(null) // { p: 0..1 } while downloading, { error } when it failed
  const [copied, setCopied] = useState("")
  const ready = useRef(false)
  const [os, setOs] = useState(null) // the user can switch Windows / Mac if we guessed wrong
  const dl = os ? DOWNLOADS[os] : downloadFor()
  const [checked, setChecked] = useState(false)
  const recheck = async () => { const now = await ollamaState(); setS(now); setChecked(now.state === "missing") }
  // the plugin's one click connection: asked while step 2 is open (it answers "on" once allowed)
  const [bridge, setBridge] = useState("none")
  useEffect(() => {
    if (s.state !== "blocked") return
    let alive = true
    const ask = () => ollamaBridge().then((b) => alive && setBridge(b))
    ask(); const id = setInterval(ask, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [s.state])

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
        <Row n={1} title="Install Ollama (free)">
          <a href={dl.url} className="inline-block px-3 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-400">⬇ Download Ollama for {dl.os}</a>
          {dl.os !== "Linux" && <button type="button" onClick={() => setOs(dl.os === "Mac" ? "Windows" : "Mac")} className="ml-2 underline text-zinc-400">Not on {dl.os}? Get it for {dl.os === "Mac" ? "Windows" : "Mac"}</button>}
          {dl.command ? <p>On Linux, paste this in a terminal instead:{code(dl.command)}</p> : <ol className="list-decimal pl-4 space-y-1 text-zinc-300">
            {dl.os === "Windows" ? <>
              <li>Open the file you just downloaded, <b>OllamaSetup.exe</b>: click the <b>⬇ arrow at the top right</b> of Chrome, or look in your <b>Downloads</b> folder.</li>
              <li>Click <b>Install</b> and wait until it finishes.
                <img src="/setup/09-ollama-install.png" alt="The Ollama setup window: click Install" loading="lazy" className="mt-1.5 w-full max-w-md rounded border border-zinc-700" /></li>
              <li>Press the <b>Windows key</b>, type <b>Ollama</b> and press <b>Enter</b>. A small llama icon appears at the bottom right, next to the clock. You can close or minimise any Ollama window: it keeps running.
                <img src="/setup/10-ollama-start.png" alt="Windows search with Ollama typed: press Enter" loading="lazy" className="mt-1.5 w-full max-w-md rounded border border-zinc-700" />
                <span className="block mt-1.5">Don't see the llama? Click the small arrow next to the clock:</span>
                <img src="/setup/11-ollama-tray.png" alt="The arrow next to the clock opens the hidden icons, with the llama icon" loading="lazy" className="mt-1 w-full max-w-xs rounded border border-zinc-700" /></li>
            </> : <>
              <li>Open the file you just downloaded, <b>Ollama.dmg</b>: click the <b>⬇ arrow at the top right</b> of Chrome, or look in <b>Downloads</b>.</li>
              <li><b>Drag the llama</b> into the <b>Applications</b> folder.</li>
              <li>Press <b>Cmd + Space</b>, type <b>Ollama</b> and press <b>Enter</b>. If the Mac asks “Are you sure?”, click <b>Open</b>. A small llama icon appears in the menu bar at the top. You can close any Ollama window: it keeps running.</li>
            </>}
          </ol>}
          <button type="button" onClick={recheck} className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-700">🔍 Check if it worked</button>
          {checked && <p className="text-amber-300">Not found yet. This box keeps checking by itself.</p>}
          <details className="text-zinc-400"><summary className="cursor-pointer">Still not found?</summary>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Is the llama icon there ({dl.os === "Mac" ? "menu bar at the top" : "bottom right, maybe under the ^ arrow"})? If not, open Ollama again as in step 3.</li>
              <li>Open <a href="http://127.0.0.1:11434" target="_blank" rel="noreferrer" className="underline">this link</a>: it should say “Ollama is running”.</li>
              <li>Restart the computer once, then open Ollama.</li>
              <li>Some antivirus programs block it: allow Ollama there.</li>
            </ul>
          </details>
        </Row>
        <Row n={2} title="Connect ShowMeWise to Ollama">
          {bridge === "off" ? <>
            <p className="text-zinc-300">One click: a small window opens. Click <b>Connect</b> there, then <b>Allow</b>.</p>
            <button type="button" onClick={() => post("ollama-connect")} className="px-3 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-400">🔌 Connect</button>
            <p className="text-zinc-300">Chrome then shows this. Click <b>Allow</b>:</p>
            <img src="/setup/08-connect-allow.png" alt="Chrome asks to read and change data on 127.0.0.1 and localhost: click Allow" loading="lazy" className="w-full max-w-md rounded border border-zinc-700" />
          </> : bridge === "on" ? <>
            <p className="text-zinc-300">The plugin is connected, but Ollama does not answer yet. Quit Ollama ({dl.os === "Mac" ? "llama icon in the menu bar" : "right-click the llama icon at the bottom right"}, Quit) and open it again. This box notices by itself.</p>
          </> : <>
            <p className="text-zinc-300">The free ShowMeWise plugin connects Ollama with one click, no terminal. {hasPlugin() ? "Your plugin is an older version: Chrome updates it by itself, or restart Chrome." : "Add it to Chrome, then come back here."}</p>
            {!hasPlugin() && <a href={PLUGIN_URL} target="_blank" rel="noopener" className="inline-block px-3 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-400">🧩 Add the free plugin</a>}
          </>}
          <details className="text-zinc-400"><summary className="cursor-pointer">Without the plugin (needs a terminal)</summary>
          <p>Ollama is running, but it only talks to websites you allow. Once:</p>
          <p>{dl.os === "Windows" ? <>Press the Windows key, type <b className="text-zinc-200">PowerShell</b>, press Enter, paste this and press Enter:</> : <>Open the Terminal app, paste this and press Enter:</>}</p>
          {code(dl.os === "Windows" ? `setx OLLAMA_ORIGINS "${location.origin}"` : dl.os === "Mac" ? `launchctl setenv OLLAMA_ORIGINS "${location.origin}"` : `sudo systemctl edit ollama  # add: Environment="OLLAMA_ORIGINS=${location.origin}"`)}
          <p>Then quit Ollama ({dl.os === "Windows" ? "right-click its icon at the bottom right of the taskbar, Quit" : "its icon in the menu bar, Quit"}) and open it again.</p>
          </details>
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
