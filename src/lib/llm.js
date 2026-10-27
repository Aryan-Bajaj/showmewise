// Shared local-LLM calls (Ollama + WebLLM) used by both annotation and RAG chat.
// Everything runs locally / in-browser — no servers, no API keys (except an
// Ollama cloud model, which the user turns on themselves: lib/cloud.js).
import { isCloud, cloudError } from "./cloud"

let webllmEngine = null
let webllmModel = null

// Curated in-browser models the user can pick from (all valid MLC prebuilt IDs).
// Ordered lightest → heaviest; the array order is also the load-fallback order.
//
// Tuned for the REAL audience: laptops, many on integrated graphics or a 4 GB
// dedicated GPU (the dev machine is an RTX 3050 Laptop, 4 GB VRAM). So:
//   • q4f16 quant everywhere — half the VRAM of q4f32, fits a 4 GB GPU.
//   • No 7B — it needs 6-8 GB VRAM and won't load on most target machines.
//   • Vision (Phi-3.5-vision, the product's USP) is the only in-browser VLM MLC
//     ships; it needs ~4 GB VRAM, so it's the heaviest option and last fallback.
//   • NON-reasoning models only. Reasoning models (Qwen3 / Qwen3.5) emit <think>
//     blocks that, when truncated by the token limit, leak raw chain-of-thought
//     into the document. Proven instruct models keep the output clean.
// What each one is good for. Measured = read step by step against our 1-minute
// demo video (15 actions) on a 16 GB laptop with Intel graphics, 24 Oct 2026.
// Anything not measured says so: no untested claims.
export const WEBLLM_MODELS = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B",
    label: "Small", params: "1B", size: "~0.9 GB", gb: 0.9,
    accuracy: "Weak for guides (2 of 15 steps in our test)", speed: "Fast", time: "10 to 30s",
    note: "The lightest. Fine for short chat answers, too weak to write guides.",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen2.5 1.5B",
    label: "Medium", params: "1.5B", size: "~1.0 GB", gb: 1.6,
    accuracy: "First drafts (11 of 15 steps found, 6 fully right in our test)", speed: "OK", time: "15 to 40s",
    note: "The best choice for most laptops with built-in graphics. A guide of a short video took 9 minutes in our test.",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 3B",
    label: "Large", params: "3B", size: "~1.9 GB", gb: 2.3,
    accuracy: "Not measured yet", speed: "Slower", time: "30s to 1m",
    note: "Bigger, so probably better answers. Needs about 2.3 GB of graphics memory and more free memory.",
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", name: "Qwen2.5 3B",
    label: "Large", params: "3B", size: "~1.9 GB", gb: 2.5,
    accuracy: "Not measured yet (did not fit our test laptop)", speed: "Slower", time: "30s to 1m",
    note: "Bigger, so probably better answers. Needs about 2.5 GB of graphics memory and more free memory.",
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC", name: "Phi-3.5 mini",
    label: "Large", params: "3.8B", size: "~2.2 GB", gb: 2.2,
    accuracy: "Not measured yet", speed: "Slower", time: "40s to 1.5m",
    note: "Bigger, needs a newer computer or a graphics card.",
  },
  {
    id: "Phi-3.5-vision-instruct-q4f16_1-MLC", name: "Phi-3.5 Vision",
    label: "Vision", params: "4.2B", size: "~3.5 GB", gb: 3.5, vision: true,
    accuracy: "Not measured yet", speed: "Slow", time: "1 to 3m",
    note: "Looks at the screenshots, not only the screen text. Needs about 4 GB of graphics memory (a graphics card).",
  },
]

// A model that can take screenshots as input (so the LLM "sees" the screen).
export function isWebLLMVision(id) { return /vision/i.test(id || "") }

// Pick the best model for a probed device capacity (GB). Prefers the heaviest
// model that still fits; returns a vision model too if asked and it fits.
export function recommendModel(capacityGB, wantVision = false) {
  const fits = WEBLLM_MODELS.filter((m) => m.gb <= capacityGB + 0.2)
  if (wantVision) {
    const v = fits.find((m) => m.vision)
    if (v) return v.id
  }
  const text = fits.filter((m) => !m.vision)
  return (text[text.length - 1] || WEBLLM_MODELS[0]).id
}

// Does the chosen model likely exceed what the device can load? Used to warn.
export function modelGB(id) { return WEBLLM_MODELS.find((m) => m.id === id)?.gb ?? 0 }

// Default to the proven 3B — reliable on a 4 GB laptop GPU and good quality.
// Power users pick "Quality" (Qwen3.5-4B) or "Vision". ensureWebLLM falls back to
// a lighter model if a GPU can't load the chosen one.
// Medium: measured, and it fits most laptops (3B did not fit our 16 GB test laptop)
export const DEFAULT_WEBLLM_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC"

export function webLLMLabel(id) {
  return WEBLLM_MODELS.find((m) => m.id === id)?.label ?? "WebLLM"
}

// Turn the raw WebLLM init text into a friendly phase + label so the UI can
// show distinct, moving steps (download → load into GPU → compile → ready)
// instead of one frozen "Finish loading on WebGPU" line.
function webllmPhase(text) {
  const t = (text || "").toLowerCase()
  if (t.includes("finish") || t.includes("ready"))
    return { phase: "ready", label: "Model ready on WebGPU" }
  if (t.includes("shader") || t.includes("compil"))
    return { phase: "compile", label: "Compiling GPU shaders" }
  if (t.includes("fetch") || t.includes("download") || t.includes("param cache"))
    return { phase: "download", label: "Downloading model to your browser cache" }
  if (t.includes("cache") || t.includes("loading model"))
    return { phase: "load", label: "Loading model into the GPU" }
  return { phase: "init", label: text || "Preparing model..." }
}

export function cleanLLMOutput(text) {
  if (!text) return ""
  return text
    // Strip reasoning-model "thinking". CLOSED blocks first, then any UNCLOSED
    // <think> that ran to the end (truncated by the token limit) — otherwise the
    // raw chain-of-thought leaks into the document.
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .replace(/<\/?think>/gi, '')
    // a small model sometimes repeats the question first ("Question: ... Answer: ...")
    .replace(/^\s*question:[^\n]*\n+\s*answer:\s*/i, '')
    // Drop chatty meta-preambles like "Okay, here's an outline based on…" that
    // small models prepend instead of answering directly.
    .replace(/^\s*(okay|ok|sure|certainly|alright|of course|got it)[,!.]?\s+(here'?s?|here is|i'?ll|i will|let me|below)[^\n]*\n+/i, '')
    .replace(/^\s*(here'?s?|here is|below is|this is)\b[^\n]*\b(outline|summary|breakdown|list|prerequisites|answer|response)[^\n]*:?\s*\n+/i, '')
    .replace(/^\s*outline\s*:[^\n]*\n+/i, '')
    .replace(/^[\*\-\s]+(?=\S)/m, '')
    .replace(/\bNow,?\s+I'?ll\b.*?[\n]/gi, '')
    .replace(/\bLet me\s+(?:now\s+)?(?:make sure|ensure|note|outline|describe|summarize)\b.*?[\n]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Ollama wants bare base64 (no "data:image/...;base64," prefix).
function stripDataUrl(u) {
  return typeof u === "string" ? u.replace(/^data:[^,]*,/, "") : u
}

// A vision model turns an image into a fixed budget of "embedding" tokens that
// GROWS with the screenshot's resolution. We can't know what users upload (1080p,
// 4K, ultrawide, portrait…), so we downscale every screenshot to a bounded
// longest edge before sending. This keeps the image embedding small and
// PREDICTABLE on any input — WebLLM's prefill can't chunk a single image, so an
// oversized one throws "prefillChunkSize needs to be greater than imageEmbedSize";
// a hard ceiling here makes that impossible instead of relying on luck.
const VISION_MAX_SIDE = 896
// Server engines (Ollama / bundled gemma3) have no single-image prefill limit, so
// we can send a SHARPER frame — crucial for reading dense enterprise UIs that
// the model otherwise mis-reads at 896px. WebLLM keeps the smaller 896 ceiling.
const SERVER_VISION_MAX_SIDE = 1400
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
export async function downscaleForVision(dataUrl, maxSide = VISION_MAX_SIDE) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return dataUrl
  try {
    const img = await loadImage(dataUrl)
    const longest = Math.max(img.width, img.height)
    if (longest <= maxSide) return dataUrl // already within budget
    const scale = maxSide / longest
    const c = document.createElement("canvas")
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL("image/jpeg", 0.7)
  } catch { return dataUrl } // never let a resize failure block annotation
}

// A local AI server on a busy laptop can drop a request (memory pressure, a
// restart). One such hiccup cost a test run 6 of 11 parts, so a failed
// connection or a server error is tried again after 5 s, 20 s and 60 s before
// it counts. A 4xx answer (wrong model name) fails at once: waiting won't fix it.
const RETRY_WAITS = [5000, 20000, 60000]
async function postWithRetry(url, body) {
  const payload = JSON.stringify(body)
  for (let i = 0; ; i++) {
    try {
      // no Content-Type header: a plain request needs no browser pre-check, so the plugin can connect it to Ollama
      const res = await fetch(url, { method: "POST", body: payload })
      if (res.status < 500 || i >= RETRY_WAITS.length) return res
    } catch (e) {
      if (i >= RETRY_WAITS.length) throw e
    }
    console.info(`[ShowMeWise] AI server did not answer, trying again in ${RETRY_WAITS[i] / 1000} s`)
    await new Promise((r) => setTimeout(r, RETRY_WAITS[i]))
  }
}

// A cloud model with no internet, or with the free cloud amount used up: the AI on this
// computer answers instead, and the page tells the user (event "showmewise:ai-switch").
// Never the other way: a local choice never goes to the cloud by itself.
export async function callOllama(userMsg, systemPrompt, model = "llama3.2", opts = {}) {
  if (!isCloud(model)) return callOllamaOnce(userMsg, systemPrompt, model, opts)
  let why = navigator.onLine === false ? "offline" : ""
  if (!why) {
    try { return await callOllamaOnce(userMsg, systemPrompt, model, opts) } catch (e) {
      // only "free limit reached" (429) or no internet: a paid model the free plan does not include (402)
      // is told to the user as it is, never answered quietly by another AI
      why = /free limit/i.test(e.message) ? "limit" : /could not be reached|internet connection|failed to fetch|network/i.test(e.message) ? "offline" : ""
      if (!why) throw e
    }
  }
  const local = await localBackup()
  if (!local) throw new Error(why === "limit" ? "The free cloud amount is used up, and there is no AI on this computer yet. Download the offline AI in the AI settings." : "You are offline, and there is no AI on this computer yet. Connect to the internet, or download the offline AI once.")
  window.dispatchEvent(new CustomEvent("showmewise:ai-switch", { detail: { from: model, to: local, why } }))
  return callOllamaOnce(userMsg, systemPrompt, local, opts)
}
async function localBackup() {
  try {
    const d = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2500) }).then((r) => r.json())
    const names = (d.models || []).map((m) => m.name).filter((n) => !isCloud(n))
    return names.find((n) => /gemma3/.test(n)) || names[0] || ""
  } catch { return "" }
}

async function callOllamaOnce(userMsg, systemPrompt, model, opts = {}) {
  const body = {
    model,
    prompt: `${systemPrompt}\n\n${userMsg}`,
    // opts.onToken: the answer arrives word by word (Vidi types it out as it is written)
    stream: !!opts.onToken,
    // Ollama's default window (4096 tokens) is too small for 3 screenshots plus
    // the screen text and a completeness rewrite: a real run had those refused
    // (400, "exceeds the available context size"). One fixed size for every
    // call, so the model is not reloaded between calls.
    options: { temperature: opts.temperature ?? 0.2, num_predict: opts.maxTokens ?? 512, num_ctx: 8192 },
  }
  // Constrained decoding: Ollama grammar-forces the reply to match this JSON
  // schema — malformed / chatty output becomes impossible (Ollama ≥ 0.5).
  if (opts.schema) body.format = opts.schema
  // Vision models (e.g. gemma3) — pass the screenshot so the model SEES the screen.
  // Sharper than WebLLM (no prefill limit) so dense UIs stay readable.
  if (opts.images?.length) {
    const imgs = await Promise.all(opts.images.map((u) => downscaleForVision(u, SERVER_VISION_MAX_SIDE)))
    body.images = imgs.map(stripDataUrl)
  }

  const res = await postWithRetry("http://localhost:11434/api/generate", body)
  if (!res.ok) {
    const why = await res.text().catch(() => "")
    console.info(`[ShowMeWise] AI server refused the request (${res.status}): ${why.slice(0, 200)}`)
    if (isCloud(model) && res.status !== 400) throw new Error(cloudError(res.status, why))
    throw new Error(res.status === 400 ? `Ollama refused the request: ${why.slice(0, 200)}` : "Ollama not reachable — is it running on localhost:11434?")
  }
  if (opts.onToken && res.body) {
    // one JSON object per line, each with the next piece of the answer
    const reader = res.body.getReader(), dec = new TextDecoder()
    let buf = "", text = ""
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split("\n"); buf = lines.pop()
      for (const l of lines) { if (!l.trim()) continue; try { text += JSON.parse(l).response || "" } catch { /* half a line */ } }
      opts.onToken(text)
    }
    return cleanLLMOutput(text)
  }
  const data = await res.json()
  return cleanLLMOutput(data.response || "")
}

// ── Bundled local engine (desktop app) ──
// The desktop build ships llama.cpp's server (`llama-server`) + a bundled model
// (e.g. gemma3, which is multimodal) and starts it on localhost. It speaks the
// OpenAI-compatible /v1/chat/completions API, including images for vision models.
// This runs ENTIRELY on the user's machine — no install steps, no cloud, no data
// leaves the device (localhost is the computer talking to itself).
export const LOCAL_ENGINE_URL = "http://localhost:8080"

// Is the bundled engine up? (the desktop shell starts it; in the browser it's off)
export async function localEngineStatus() {
  try {
    const r = await fetch(`${LOCAL_ENGINE_URL}/health`, { signal: AbortSignal.timeout(2000) })
    return r.ok
  } catch { return false }
}

export async function callLocalEngine(userMsg, systemPrompt, _model, opts = {}) {
  const useImages = opts.images?.length > 0
  // Vision (gemma3 multimodal): attach the screenshot, downscaled to a sane size.
  const imgs = useImages ? await Promise.all(opts.images.map((u) => downscaleForVision(u, SERVER_VISION_MAX_SIDE))) : null
  const userContent = useImages
    ? [{ type: "text", text: userMsg }, ...imgs.map((url) => ({ type: "image_url", image_url: { url } }))]
    : userMsg
  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 512,
    stream: false,
  }
  // Constrained decoding: llama-server compiles the schema to a GBNF grammar —
  // the sampler literally cannot emit tokens that break the JSON structure.
  if (opts.schema) body.response_format = { type: "json_object", schema: opts.schema }
  const res = await postWithRetry(`${LOCAL_ENGINE_URL}/v1/chat/completions`, body)
  if (!res.ok) throw new Error("Local AI engine not reachable — is the desktop app's model running?")
  const data = await res.json()
  return cleanLLMOutput(data.choices?.[0]?.message?.content || "")
}

// Does an Ollama model support image input? (queried from /api/show capabilities)
export async function ollamaModelHasVision(model) {
  try {
    const res = await fetch("http://localhost:11434/api/show", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return false
    const data = await res.json()
    return Array.isArray(data.capabilities) && data.capabilities.includes("vision")
  } catch { return false }
}

// onStatus is called as (label, pct, phase) so the UI can render distinct
// loading steps. preferredModel is the user's pick; on failure we fall back
// through the lighter models so a weak GPU still ends up with something.
export async function ensureWebLLM(onStatus, preferredModel) {
  // Reuse the cached engine only if it's the model the user wants — otherwise
  // unload and load the requested one (needed when switching to/from Vision).
  if (webllmEngine && (!preferredModel || webllmModel === preferredModel)) {
    onStatus?.("Model ready on WebGPU", 100, "ready")
    return webllmEngine
  }
  if (webllmEngine && preferredModel && webllmModel !== preferredModel) {
    try { await webllmEngine.unload?.() } catch { /* noop */ }
    webllmEngine = null; webllmModel = null
  }
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm")
  // When a model does not load (often: too little memory), only SMALLER ones
  // are tried next. Trying the bigger ones after a failure could freeze a laptop
  // whose graphics share the normal memory (seen on Intel Iris Xe).
  const sizeOf = (id) => WEBLLM_MODELS.find((m) => m.id === id)?.gb ?? 1.6
  const ids = WEBLLM_MODELS.filter((m) => !m.vision).map((m) => m.id).sort((a, b) => sizeOf(b) - sizeOf(a))
  const order = preferredModel ? [preferredModel, ...ids.filter((id) => id !== preferredModel && sizeOf(id) < sizeOf(preferredModel))] : ids.slice().reverse()
  const tried = new Set()
  let lastErr = null
  for (const m of order) {
    if (tried.has(m)) continue
    tried.add(m)
    try {
      onStatus?.(`Preparing ${webLLMLabel(m)} model...`, 0, "init")
      // Vision models embed a whole screenshot in one prefill that can't be
      // chunked, so prefill_chunk_size must be >= the image embedding size
      // (≈2353 tokens). The model's default (2048) is too small and throws
      // "prefillChunkSize needs to be greater than imageEmbedSize". Bump it.
      const chatOpts = isWebLLMVision(m) ? { prefill_chunk_size: 4096 } : undefined
      webllmEngine = await CreateMLCEngine(m, {
        initProgressCallback: (p) => {
          const { phase, label } = webllmPhase(p.text)
          onStatus?.(label, Math.round((p.progress ?? 0) * 100), phase)
        },
      }, chatOpts)
      webllmModel = m
      return webllmEngine
    } catch (e) { lastErr = e }
  }
  throw lastErr ?? new Error("WebLLM failed to load")
}

// Thrown when a screenshot was supplied but the model that actually loaded is a
// text-only fallback (e.g. the user's GPU couldn't fit the vision model). The
// caller catches this and retries the step with OCR text instead.
export const WEBLLM_NO_VISION = "WEBLLM_NO_VISION"

export async function callWebLLM(userMsg, systemPrompt, onStatus, opts = {}) {
  const engine = await ensureWebLLM(onStatus, opts.model)
  const wantImages = opts.images?.length > 0
  // If a screenshot was requested but the model that actually loaded is text-only
  // (a GPU-fit fallback), don't silently send a vision prompt with no image —
  // signal the caller so it can fall back to OCR text for this step.
  if (wantImages && !isWebLLMVision(webllmModel)) throw new Error(WEBLLM_NO_VISION)
  const useImages = wantImages && isWebLLMVision(webllmModel)
  const imgs = useImages ? await Promise.all(opts.images.map((u) => downscaleForVision(u))) : null
  const userContent = useImages
    ? [{ type: "text", text: userMsg }, ...imgs.map((url) => ({ type: "image_url", image_url: { url } }))]
    : userMsg
  const req = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 512,
  }
  // Constrained decoding (MLC takes the schema as a string). Not every prebuilt
  // model config supports it — on failure retry unconstrained; the JSON-first
  // parser falls back to text parsing, so nothing is lost.
  if (opts.schema) req.response_format = { type: "json_object", schema: JSON.stringify(opts.schema) }
  // opts.onToken: the answer arrives word by word
  if (opts.onToken && !opts.schema) {
    let text = ""
    for await (const chunk of await engine.chat.completions.create({ ...req, stream: true })) {
      text += chunk.choices?.[0]?.delta?.content || ""
      opts.onToken(text)
    }
    return cleanLLMOutput(text)
  }
  let result
  try {
    result = await engine.chat.completions.create(req)
  } catch (e) {
    if (!opts.schema) throw e
    delete req.response_format
    result = await engine.chat.completions.create(req)
  }
  return cleanLLMOutput(result.choices[0].message.content || "")
}

export function getWebLLMModel() { return webllmModel }
