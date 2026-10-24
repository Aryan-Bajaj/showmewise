// "Test my computer": which browser AI model runs well on THIS computer.
// It tries the models from small to big, one at a time, measures the load time,
// the speed and one fixed test answer, and frees the model again before the
// next one. The user decides whether to try the next, bigger one.
// Free memory and open tabs can only be read by the browser plugin (a website
// is not allowed to); without it the check still works, by trying.

export const CHECK_MODELS = [
  // mb: graphics memory the model needs (from the WebLLM model list)
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B", mb: 879, download: "0,9 GB" },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen2.5 1.5B", mb: 1630, download: "1,0 GB" },
  { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", name: "Qwen2.5 3B", mb: 2505, download: "1,9 GB" },
]
// room the browser and Windows need on top of the model, so nothing freezes
export const SAFETY_MB = 1200

// the graphics chip the browser gets; a built-in one (Intel, AMD APU) uses the normal memory
export async function gpuInfo() {
  if (!navigator.gpu) return { webgpu: false }
  const a = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" }).catch(() => null)
  if (!a) return { webgpu: false }
  const i = a.info || {}
  const text = `${i.vendor || ""} ${i.architecture || ""} ${i.description || ""}`.toLowerCase()
  const builtIn = /intel|gen-\d|xe|iris|uhd|apple|qualcomm|adreno|mali/.test(text) || (/amd/.test(text) && /rdna2|gfx103|vega|radeon\(tm\) graphics/.test(text))
  return { webgpu: true, vendor: i.vendor || "unknown", arch: i.architecture || "", builtIn, maxBufferMB: Math.round(a.limits.maxBufferSize / 1048576), f16: a.features.has("shader-f16") }
}

// free memory and open tabs, from the plugin when it is installed (null otherwise)
export function pluginSystem(timeout = 1500) {
  return new Promise((res) => {
    const id = Math.random().toString(36).slice(2)
    const on = (e) => { if (e.detail?.id === id) { removeEventListener("videodoc:system-info", on); clearTimeout(t); res(e.detail) } }
    const t = setTimeout(() => { removeEventListener("videodoc:system-info", on); res(null) }, timeout)
    addEventListener("videodoc:system-info", on)
    window.postMessage({ source: "videodoc-app", type: "need-system-info", id }, location.origin)
  })
}

// which models fit the free memory now (with room to spare)
export function fitsNow(freeMB) {
  return CHECK_MODELS.map((m) => ({ ...m, fits: freeMB == null ? null : freeMB - SAFETY_MB >= m.mb, needMB: m.mb + SAFETY_MB }))
}

// a fixed little task: the answer is in the text; a model that gets it wrong is not reliable enough
const TEST = {
  system: "Answer only from the text. Answer in at most 6 words.",
  user: 'Text: "To share the dashboard, click Share, then switch on Anyone with the link, then click Copy link." Question: What do you click first to share the dashboard?',
  ok: (a) => /share/i.test(a) && !/copy link/i.test(a.split(/[.,]/)[0]),
}

// try one model: load it, answer the test task twice (speed), free it again
export async function tryModel(model, onStatus) {
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm")
  const t0 = performance.now()
  let engine
  try {
    engine = await CreateMLCEngine(model.id, { initProgressCallback: (p) => onStatus?.(p.text, Math.round((p.progress ?? 0) * 100)) })
  } catch (e) {
    return { id: model.id, ok: false, error: /memory|allocat|device|lost|buffer/i.test(e.message) ? "Not enough graphics memory for this model." : e.message.slice(0, 160) }
  }
  const loadS = (performance.now() - t0) / 1000
  try {
    onStatus?.("Answering the test question...", null)
    const r = await engine.chat.completions.create({ messages: [{ role: "system", content: TEST.system }, { role: "user", content: TEST.user }], temperature: 0, max_tokens: 24 })
    const answer = (r.choices[0].message.content || "").trim()
    // speed on a longer answer (tokens per second)
    const t1 = performance.now()
    const r2 = await engine.chat.completions.create({ messages: [{ role: "user", content: "In 3 short sentences, explain what a step-by-step guide is for." }], temperature: 0, max_tokens: 90 })
    const tokens = r2.usage?.completion_tokens || (r2.choices[0].message.content || "").split(/\s+/).length * 1.3
    const tps = r2.usage?.extra?.decode_tokens_per_s || tokens / ((performance.now() - t1) / 1000)
    return { id: model.id, ok: true, loadS: Math.round(loadS), tps: Math.round(tps * 10) / 10, answer, correct: TEST.ok(answer) }
  } catch (e) {
    return { id: model.id, ok: false, loadS: Math.round(loadS), error: /lost|device/i.test(e.message) ? "The graphics chip stopped (not enough memory)." : e.message.slice(0, 160) }
  } finally {
    try { await engine.unload() } catch { /* already gone */ }
  }
}

// the best model from the results: the biggest one that answered right and fast enough
export function pickBest(results) {
  const good = results.filter((r) => r.ok && r.correct && r.tps >= 4)
  const best = good.length ? good[good.length - 1] : results.find((r) => r.ok)
  return best ? CHECK_MODELS.find((m) => m.id === best.id) : null
}

// the tested models that are not the best are deleted again, so they take no space
export async function removeUnused(keepId, ids) {
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm")
  for (const id of new Set(ids)) if (id !== keepId) await deleteModelAllInfoInCache(id).catch(() => {})
}

const KEY = "vd-webllm-best"
export const savedBest = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null") } catch { return null } }
export const saveBest = (v) => { try { localStorage.setItem(KEY, JSON.stringify({ ...v, at: Date.now() })) } catch { /* private window */ } }
