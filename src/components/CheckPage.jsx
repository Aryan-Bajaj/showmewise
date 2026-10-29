// "Test my computer": finds the browser AI that runs best on this computer.
// Written for people who are not technical: no technical words on the page.
import { useEffect, useState } from "react"
import { CHECK_MODELS, SAFETY_MB, gpuInfo, pluginSystem, fitsNow, tryModel, pickBest, savedBest, saveBest, removeUnused } from "../lib/computerCheck"

// what each size is good for, from our tests (read step by step, 1-minute demo video)
const SIZE = {
  0: ["Small", "only for short chat answers; too weak to write guides (2 of 15 steps in our test)"],
  1: ["Medium", "good for chat; writes a usable first draft of a guide (11 of 15 steps found, 6 fully right in our test)"],
  2: ["Large", "better answers, needs a lot of free memory (did not fit our 16 GB test laptop with other programs open)"],
}
const gb = (mb) => (mb / 1024).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) // the viewer's own number format
const speed = (tps) => (tps >= 10 ? "fast" : tps >= 4 ? "OK" : "slow")

const C = { bg: "#0f0b24", card: "#17113a", line: "rgba(255,255,255,.1)", ink: "#f1eeff", dim: "#b9b3d8", ok: "#34d399", warn: "#fbbf24", bad: "#f87171", acc: "#7c5cff" }
const Card = ({ children, style }) => <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, ...style }}>{children}</div>
const Btn = ({ children, onClick, disabled, quiet }) => (
  <button onClick={onClick} disabled={disabled} style={{ font: "inherit", fontWeight: 600, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, borderRadius: 12, padding: "10px 16px", border: quiet ? `1px solid ${C.line}` : 0, color: "#fff", background: quiet ? "transparent" : "linear-gradient(135deg,#6d4aff,#3f62ff)" }}>{children}</button>
)

export default function CheckPage() {
  const [gpu, setGpu] = useState(null)
  const [sys, setSys] = useState(undefined) // undefined: asking, null: no plugin
  const [ollama, setOllama] = useState(null)
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(null) // { i, text, pct }
  const [best, setBest] = useState(savedBest())
  const [sure, setSure] = useState(false) // asked once more before a model that may be too big

  const look = async () => {
    setSys(undefined)
    setGpu(await gpuInfo())
    setSys(await pluginSystem())
    fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2500) }).then((r) => r.json()).then((d) => setOllama((d.models || []).filter((m) => !/cloud/.test(m.name)).length)).catch(() => setOllama(0))
  }
  // leftovers of an earlier, unfinished test: everything but the saved best goes
  useEffect(() => { look(); const b = savedBest(); if (b) removeUnused(b.id) }, [])

  const next = results.length
  const fits = fitsNow(sys?.freeMB)
  const tight = sys && (sys.freeMB < 3000 || sys.tabs > 15)
  // the next size: blocked when we know it does not fit; asked again when we cannot know
  const noRoom = next < CHECK_MODELS.length && fits[next].fits === false
  const unsure = next >= 2 && gpu?.builtIn && fits[next]?.fits == null

  const run = async () => {
    const i = next
    setBusy({ i, text: "Starting...", pct: 0 })
    const r = await tryModel(CHECK_MODELS[i], (text, pct) => setBusy({ i, text: /fetch|download|loading model from cache/i.test(text) ? "Downloading (only the first time)..." : /shader|compile|gpu|init/i.test(text) ? "Getting ready..." : text, pct }))
    const all = [...results, r]
    setResults(all); setBusy(null)
    const b = pickBest(all)
    if (b) { saveBest({ id: b.id, name: b.name }); setBest({ id: b.id, name: b.name }) }
    // only the best one stays on the computer
    removeUnused(b?.id, all.map((x) => x.id))
    setSure(false)
    if (sys) setSys(await pluginSystem())
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", padding: "32px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <a href="/"style={{ color: C.dim, fontSize: 14, textDecoration: "none" }}>← Back</a>
        <h1 style={{ margin: 0, fontSize: "clamp(1.8rem,5vw,2.4rem)" }}>Test my computer</h1>
        <p style={{ margin: 0, color: C.dim, lineHeight: 1.6 }}>
          ShowMeWise can use an AI that runs inside your browser. This test finds the best one for your computer, so it runs well and nothing gets stuck. It takes a few minutes. The ones you do not need are deleted after the test, so they do not take space.
        </p>

        <Card>
          <h2 style={{ margin: "0 0 10px", fontSize: 17 }}>Your computer</h2>
          {!gpu ? <p style={{ margin: 0, color: C.dim }}>Looking...</p> : (
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9, listStyle: "disc" }}>
              <li>{gpu.webgpu ? <>The browser AI <b style={{ color: C.ok }}>works</b> in this browser.</> : <>The browser AI <b style={{ color: C.bad }}>does not work</b> in this browser. Use Chrome or Edge on a computer{ollama ? "" : ", or install Ollama"}.</>}</li>
              {gpu.webgpu && <li>{gpu.builtIn ? "Your computer has built-in graphics. The AI then uses your normal memory, so free memory matters." : "Your computer has a graphics card for the AI."}</li>}
              {sys === undefined ? <li style={{ color: C.dim }}>Checking free memory...</li>
                : sys ? <li>Free memory: <b style={{ color: tight ? C.warn : C.ok }}>{gb(sys.freeMB)} GB</b> of {gb(sys.totalMB)} GB · <b>{sys.tabs}</b> tabs open</li>
                : <li style={{ color: C.dim }}>A website cannot see your free memory. With the ShowMeWise plugin it can.</li>}
              <li>{ollama ? <>Ollama is on this computer: <b style={{ color: C.ok }}>use it</b>. It is faster and more exact than the browser AI.</> : ollama === 0 ? "Ollama: not found (that is fine, the browser AI works without it)." : "Looking for Ollama..."}</li>
            </ul>
          )}
          {(tight || sys === null) && gpu?.webgpu && (
            <div style={{ marginTop: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.35)", borderRadius: 12, padding: "10px 12px", lineHeight: 1.6 }}>
              <b>Before you start:</b> close the tabs and programs you do not need.{sys && sys.tabs > 15 ? ` You have ${sys.tabs} tabs open.` : ""} More free memory means a better AI can run.
              {sys && <div style={{ marginTop: 8 }}><Btn quiet onClick={look}>I closed some, check again</Btn></div>}
            </div>
          )}
        </Card>

        {gpu?.webgpu && (
          <Card>
            <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>The AI sizes</h2>
            <p style={{ margin: "0 0 12px", color: C.dim, fontSize: 14 }}>We try them one by one, small first. Each one is downloaded once the first time.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CHECK_MODELS.map((m, i) => {
                const r = results[i], f = fits[i]
                return (
                  <div key={m.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <b>{SIZE[i][0]}</b><span style={{ color: C.dim, fontSize: 13 }}>({m.name})</span><span style={{ color: C.dim, fontSize: 14 }}>{SIZE[i][1]} · download {m.download}</span>
                      {f.fits === false && !r && <span style={{ color: C.warn, fontSize: 13 }}>· needs about {gb(f.needMB)} GB free</span>}
                    </div>
                    {busy?.i === i && <div style={{ color: C.dim, fontSize: 14, marginTop: 6 }}>{busy.text}{busy.pct != null ? ` ${busy.pct}%` : ""}</div>}
                    {r && (r.ok
                      ? <div style={{ fontSize: 14, marginTop: 6 }}>Ready in {r.loadS} s · speed: <b style={{ color: speed(r.tps) === "slow" ? C.warn : C.ok }}>{speed(r.tps)}</b> · test answer: <b style={{ color: r.correct ? C.ok : C.warn }}>{r.correct ? "right" : "wrong"}</b></div>
                      : <div style={{ fontSize: 14, marginTop: 6, color: C.bad }}>Did not run: {r.error}</div>)}
                  </div>
                )
              })}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {/* a download that failed can simply be tried again */}
              {results.at(-1)?.kind && results.at(-1).kind !== "memory" && !busy && <Btn quiet onClick={() => setResults(results.slice(0, -1))}>Try again</Btn>}
              {next < CHECK_MODELS.length && !results.some((r) => !r.ok) && (noRoom
                ? <span style={{ color: C.warn, lineHeight: 1.6 }}>{SIZE[next][0]} does not fit now: it needs about {gb(fits[next].needMB)} GB free. Close tabs and programs, then press "check again" above.</span>
                : unsure && !sure
                ? <div style={{ lineHeight: 1.6 }}>
                    <div style={{ color: C.warn, marginBottom: 8 }}>{SIZE[next][0]} needs a lot of memory. With built-in graphics your computer can become very slow while it loads. Try it only if you closed other programs.</div>
                    <Btn quiet onClick={() => setSure(true)}>I closed other programs, try it</Btn>
                  </div>
                : <Btn onClick={run} disabled={!!busy}>{busy ? "Testing..." : next === 0 ? "Start the test" : `Try the next, bigger one (${SIZE[next][0]})`}</Btn>
              )}
              {next > 0 && !busy && <span style={{ color: C.dim, fontSize: 14, alignSelf: "center" }}>{results.some((r) => r.kind === "memory") ? "That one is too big for this computer right now." : results.some((r) => !r.ok) ? "" : "You can stop here."}</span>}
            </div>
          </Card>
        )}

        {best && (
          <Card style={{ borderColor: "rgba(52,211,153,.45)" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 17 }}>Best for your computer: {SIZE[CHECK_MODELS.findIndex((m) => m.id === best.id)]?.[0] || ""} ({best.name})</h2>
            <p style={{ margin: 0, color: C.dim, lineHeight: 1.6 }}>ShowMeWise uses it from now on for the browser AI. {ollama ? "Ollama is still the better choice when it is running." : ""}</p>
            {best.id === CHECK_MODELS[0].id && (
              <p style={{ margin: "10px 0 0", color: C.warn, lineHeight: 1.6 }}>Small is fine for questions in the chats, but too weak to write guides. To write guides, install the free Ollama app, or close programs and test again: Medium may fit then.</p>
            )}
          </Card>
        )}
        <p style={{ margin: 0, color: C.dim, fontSize: 13 }}>Everything runs on your computer. Nothing is uploaded. The test always leaves {gb(SAFETY_MB)} GB free for your other programs.</p>
      </div>
    </div>
  )
}
