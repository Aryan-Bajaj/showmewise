// The AIs for this computer, as buttons: what is ready to use, what can be downloaded (size, how big or
// quick it is, accuracy in our own tests), each tagged ✅ Suggested or ⚠️ Not suggested for this
// computer's memory, suggested ones first, highest accuracy first. Ollama missing: its setup steps.
// Used by Vidi on the website (the plugin's pet has the same list in its chat).
import { useEffect, useState } from "react"
import "../../extension/pet/scores.js"
import { ollamaState, pullModel } from "../lib/ollamaSetup"
import { gpuInfo, pluginSystem } from "../lib/computerCheck"
import OllamaSetup from "./OllamaSetup"

const GET = [
  { name: "gemma3:1b", size: "0.8 GB", mb: 800, how: "small, fastest, simple answers" },
  { name: "gemma3:4b", size: "3.3 GB", mb: 3300, how: "medium, quick, good answers" },
  { name: "gemma3:12b", size: "8.1 GB", mb: 8100, how: "big, slower, best answers" },
]
const acc = (n) => window.VidiScore?.(n) ?? null

export default function ModelPicker({ onUse }) {
  const [st, setSt] = useState(null) // { state, models }
  const [mem, setMem] = useState(null) // total MB, exact from the plugin; without it a website sees at most "8 GB or more"
  const [gpu, setGpu] = useState(null)
  const [dl, setDl] = useState({}) // name: { p } / { done } / { error }
  const look = () => { ollamaState().then(setSt); pluginSystem().then((s) => setMem(s?.totalMB ? { mb: s.totalMB, exact: true } : navigator.deviceMemory ? { mb: navigator.deviceMemory * 1024, exact: navigator.deviceMemory < 8 } : null)); gpuInfo().then(setGpu) }
  useEffect(look, [])
  if (!st) return <div style={{ fontSize: 13 }}>🧪 Checking this computer…</div>
  // a model needs about 1.3 times its file in memory, and runs well when that is at most half of all memory
  // (an "8 GB or more" from the website alone is not exact: then a bigger model gets no tag instead of a guess)
  const fits = (fileMB) => { if (!mem) return null; const need = fileMB * 1.3; return need <= mem.mb * 0.5 ? true : mem.exact ? false : null }
  const items = [
    ...st.models.filter((n) => !/cloud/.test(n)).map((n) => { const g = GET.find((x) => x.name === n); return { name: n, ready: true, ok: g ? fits(g.mb) : true, acc: acc(n), info: g ? `${g.size} · ${g.how}` : "on this computer" } }),
    ...st.models.filter((n) => /cloud/.test(n)).map((n) => ({ name: n, ready: true, ok: true, acc: acc(n), info: "☁ cloud: what you ask goes to Ollama's servers" })),
    ...(st.state === "ok" ? GET.filter((g) => !st.models.includes(g.name)).map((g) => ({ name: g.name, ready: false, ok: fits(g.mb), acc: acc(g.name), info: `${g.size} · ${g.how}` })) : []),
  ].sort((a, b) => (a.ok === false) - (b.ok === false) || (b.acc ?? -1) - (a.acc ?? -1))
  const tag = (ok) => ok == null ? "" : ok ? "✅ Suggested" : "⚠️ Not suggested"
  const get = async (name) => {
    setDl((d) => ({ ...d, [name]: { p: 0 } }))
    try { await pullModel(name, (p) => setDl((d) => ({ ...d, [name]: { p } }))); setDl((d) => ({ ...d, [name]: { done: true } })); look() }
    catch (e) { setDl((d) => ({ ...d, [name]: { error: e.message } })) }
  }
  const b = { border: "1px solid rgba(167,139,250,0.4)", background: "rgba(109,74,255,0.18)", color: "#ece9ff", borderRadius: 10, padding: "6px 10px", fontSize: 12.5, cursor: "pointer" }
  return (
    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
      <div style={{ marginBottom: 6 }}>🧪 This computer: {mem ? `${mem.exact ? "" : "at least "}${Math.round(mem.mb / 1024)} GB memory` : "memory unknown"}{gpu ? `, graphics ${gpu.webgpu ? "ready for the browser AI" : "not usable by the browser AI"}` : ""}. ✅ runs well here, ⚠️ too big for it.</div>
      {st.state !== "ok" && <><div style={{ margin: "6px 0" }}>{st.state === "missing" ? "Ollama is not on this computer yet. It is free and runs the AI privately, on your computer:" : "Ollama runs, but does not allow this website yet:"}</div><OllamaSetup /><button style={{ ...b, marginTop: 6 }} onClick={look}>↻ Check again</button></>}
      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        {items.map((x) => (
          <div key={x.name} style={{ padding: 8, borderRadius: 10, border: `1px solid ${x.ok === false ? "rgba(251,191,36,.35)" : "rgba(167,139,250,.3)"}`, background: "rgba(255,255,255,.03)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
              <b>{x.name}</b><span style={{ fontSize: 11.5 }}>{tag(x.ok)}</span>{x.acc != null && <span style={{ fontSize: 11.5, color: "#6ee7b7" }}>✓ {x.acc}% in our tests</span>}
            </div>
            <div style={{ fontSize: 12, color: "rgba(236,233,255,.7)" }}>{x.info}</div>
            {x.ready ? <button style={{ ...b, marginTop: 5 }} onClick={() => { try { localStorage.setItem("vd-model-pick", x.name) } catch { /* private window */ } onUse?.(x.name) }}>Use {x.name}</button>
              : dl[x.name]?.p != null ? <div style={{ marginTop: 6 }}><div style={{ height: 8, borderRadius: 9, background: "rgba(255,255,255,.12)", overflow: "hidden" }}><div style={{ width: `${Math.max(2, Math.round(dl[x.name].p * 100))}%`, height: "100%", background: "linear-gradient(90deg,#7c5cff,#22d3ee)", transition: "width .4s" }} /></div><span style={{ fontSize: 11.5 }}>Downloading… {Math.round(dl[x.name].p * 100)}%</span></div>
              : dl[x.name]?.error ? <div style={{ color: "#fca5a5", fontSize: 12 }}>{dl[x.name].error}</div>
              : <button style={{ ...b, marginTop: 5 }} onClick={() => get(x.name)}>⬇ Download ({x.name.match(/\d+b/)?.[0]}, {GET.find((g) => g.name === x.name)?.size})</button>}
          </div>
        ))}
        <div style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(167,139,250,.3)" }}>
          <b>Browser AI</b> <span style={{ fontSize: 11.5 }}>{tag(gpu ? gpu.webgpu && (!mem || mem.mb >= 8000) : null)}</span>{acc("webllm") != null && <span style={{ fontSize: 11.5, color: "#6ee7b7" }}> ✓ {acc("webllm")}% in our tests</span>}
          <div style={{ fontSize: 12, color: "rgba(236,233,255,.7)" }}>Nothing to install, about 1 GB downloaded once; the weakest of all.</div>
          <button style={{ ...b, marginTop: 5 }} onClick={() => onUse?.("webllm")}>Use the browser AI</button>
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 11.5, color: "rgba(236,233,255,.6)" }}>✓ % = how often it was right in our own tests; on your computer it can differ.</div>
    </div>
  )
}
