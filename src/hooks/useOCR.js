import { useCallback } from "react"

// Apps used purely to RUN the meeting/recording — never the documented tool.
// Detected for context but excluded from the doc's "tools used" list.
const CONFERENCING = new Set(["Microsoft Teams", "Zoom", "Webex", "Google Meet"])

// Known apps / tools we can recognise from on-screen text (OCR) or transcript.
// canonical name -> regex of telltale strings that appear in the UI. Order matters:
// more specific products come BEFORE the broader vendor entry.
const TOOL_SIGNATURES = [
  ["SAP Analytics Cloud", /analytics cloud|hcs\.cloud\.sap|\/fpa\/ui|analytics designer|\bsac\b/i],
  ["Microsoft Excel", /\bexcel\b|\.xls[xm]?\b|formula bar|=sum\(|sheet\d|workbook/i],
  ["VBA / Macros", /\bvba\b|visual basic|alt\s*\+\s*f11|\.bas\b|macro|sub\s+\w+\(\)|end sub/i],
  ["Microsoft Word", /microsoft word|\.docx?\b/i],
  ["PowerPoint", /powerpoint|\.pptx?\b|slide \d/i],
  ["SAP", /\bsap\b|s4hana|s\/4hana|\bt-code\b|sap ibp/i],
  ["VS Code", /visual studio code|vs code/i],
  ["Visual Studio", /visual studio(?! code)/i],
  ["Terminal / CLI", /\$\s|>\s*npm|command prompt|powershell|bash|terminal/i],
  ["Chrome", /google chrome|chrome:\/\//i],
  ["Edge", /microsoft edge\b/i],
  ["Figma", /\bfigma\b/i],
  ["Photoshop", /photoshop|\.psd\b/i],
  ["Notion", /\bnotion\b/i],
  ["Python", /\bpython\b|\.py\b|import \w+|def \w+\(/i],
  ["GitHub", /github\.com|git push|git commit|pull request/i],
  ["Jira", /\bjira\b/i],
  ["Salesforce", /salesforce|lightning experience/i],
  ["Tableau", /\btableau\b/i],
  ["Power BI", /power bi/i],
  ["Microsoft Teams", /microsoft teams|\bteams meeting\b/i],
  ["Zoom", /\bzoom\b.*meeting|zoom\.us/i],
  ["Outlook", /\boutlook\b/i],
  ["Google Sheets", /google sheets|docs\.google\.com\/spreadsheets/i],
  ["Slack", /\bslack\b/i],
  ["SQL / Database", /\bselect\b.*\bfrom\b|\bsql\b|ssms|mysql|postgres/i],
]

export function detectTools(text) {
  const found = []
  for (const [name, re] of TOOL_SIGNATURES) {
    if (re.source !== "(?:)" && re.test(text)) found.push(name)
  }
  let tools = [...new Set(found)]
  // A specific product wins over the broader vendor tag.
  if (tools.includes("SAP Analytics Cloud")) tools = tools.filter((t) => t !== "SAP")
  // Drop the conferencing app — it's how the session was recorded, not the tool
  // being documented. (Teams/Zoom showing up was a recurring false positive.)
  return tools.filter((t) => !CONFERENCING.has(t))
}

// The single primary application being documented — the most specific real tool
// found (conferencing excluded). Used to ground every annotation prompt so the
// model never guesses the wrong software (e.g. "Excel" when it's a web app).
export function detectPrimaryApp(text) {
  return detectTools(text)[0] || ""
}

// Sample up to `max` frames evenly so OCR time stays bounded on long videos.
function sampleFrames(frames, max) {
  if (frames.length <= max) return frames
  const step = frames.length / max
  const out = []
  for (let i = 0; i < max; i++) out.push(frames[Math.floor(i * step)])
  return out
}

// ── Scene-change keyframe selection ──
// Instead of blindly sampling every Nth frame, pick the frames where the SCREEN
// ACTUALLY CHANGED. This gives the model "eyes" on each distinct UI state (a new
// dialog, tab, sheet, screen) rather than near-duplicate frames — far better at
// capturing exactly which tools/elements appear, while staying bounded.
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

async function fingerprint(src, ctx, size = 16) {
  const img = await loadImage(src)
  ctx.clearRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)
  const fp = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) {
    fp[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return fp
}

function fpDiff(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return s / a.length
}

// Returns { keyframes, sceneCuts }. sceneCuts = timestamps where the SCREEN
// pixels actually changed hard (new dialog / tab / app / share start) — far more
// robust than OCR-text similarity, which degrades to noise on blurry recordings.
// The annotator uses these as step boundaries so steps align with real events.
// The OCR budget SCALES with video length (one keyframe per ~40s, capped) so a
// 90-minute recording is read as densely per minute as a 20-minute one.
async function selectKeyframes(frames, maxKeyframes = null) {
  if (!frames?.length) return { keyframes: [], sceneCuts: [] }
  if (maxKeyframes == null) {
    const dur = frames[frames.length - 1].timestamp || 0
    maxKeyframes = Math.min(140, Math.max(48, Math.round(dur / 40)))
  }

  // Fingerprint ALWAYS (even when all frames fit the keyframe budget) — the
  // scene cuts matter to segmentation regardless of how many frames we OCR.
  const cands = sampleFrames(frames, Math.min(frames.length, 240))
  const canvas = document.createElement("canvas")
  canvas.width = 16; canvas.height = 16
  const ctx = canvas.getContext("2d", { willReadFrequently: true })

  const fps = []
  for (const f of cands) {
    try { fps.push(await fingerprint(f.imageData, ctx)) } catch { fps.push(null) }
  }
  const diffs = cands.map((_, i) => (i > 0 && fps[i] && fps[i - 1]) ? fpDiff(fps[i], fps[i - 1]) : 0)

  const THRESHOLD = 8          // avg luminance change that counts as a "new screen"
  const sceneCuts = cands.filter((_, i) => diffs[i] >= THRESHOLD).map((f) => f.timestamp)

  if (frames.length <= maxKeyframes) return { keyframes: frames, sceneCuts }

  const MIN_COVERAGE = 24      // always keep at least this many, even if static
  const chosen = new Set([0])  // first frame is always a keyframe
  const byChange = cands.map((_, i) => i).filter((i) => i > 0).sort((a, b) => diffs[b] - diffs[a])

  for (const i of byChange) { if (chosen.size >= maxKeyframes) break; if (diffs[i] >= THRESHOLD) chosen.add(i) }
  for (const i of byChange) { if (chosen.size >= Math.min(maxKeyframes, MIN_COVERAGE)) break; chosen.add(i) }

  return { keyframes: [...chosen].sort((a, b) => a - b).map((i) => cands[i]), sceneCuts }
}

// Webcam tile / participant labels (Teams renders "Lastname, Firstname (ORG-UNIT,
// CODE)" on every tile, in every frame). These names leak into OCR and the model
// then turns them into fake artifacts ("Wintors Alvares Report"). They are NEVER part
// of the documented application — drop any OCR line that looks like one.
const TILE_LABEL = /\([A-Z]{1,4}[-–][A-Z]{2,6}(,\s*[A-Z]{2,8})?\)|^[A-Z][a-zA-Z]+(\s[A-Za-z]+){0,3},\s*[A-Z][a-zA-Z]+/
function isTileLabelLine(line) {
  const l = (line || "").trim()
  if (l.length < 6 || l.length > 80) return false
  return TILE_LABEL.test(l)
}

// Pull the participant NAME TOKENS out of a tile label ("Winters Alvarez, Jamie
// Lee (AC-NYC, ACME)" → Winters, Alvarez, Jamie, Lee). The list is fed
// to the prompts and the verify pass so a mishearing of a participant's name can
// never survive as a report/table/tool name.
function tileNameTokens(line) {
  const namePart = (line || "").replace(/\([^)]*\)/g, "") // drop the (ORG, CODE) part
  return (namePart.match(/[A-Z][a-z]{2,}/g) || []).filter((w) =>
    !/^(The|And|For|With|From|New|Open|View)$/.test(w))
}

// Rebuild OCR text keeping only CONFIDENT words, preserving line structure. If a
// frame is mostly low-confidence (garbled, unreadable screen), drop it entirely so
// the model never tries to document noise like "EERNGRIEES". Defensive: falls back
// to the raw text if the structured output isn't available.
function cleanOCR(data, minConf = 55, nameSink = null) {
  try {
    const blocks = data?.blocks
    if (Array.isArray(blocks) && blocks.length) {
      const lines = []
      let total = 0, kept = 0
      for (const b of blocks) for (const p of (b.paragraphs || [])) for (const l of (p.lines || [])) {
        const ws = (l.words || []).filter((w) => (w.text || "").trim())
        total += ws.length
        const good = ws.filter((w) => (w.confidence ?? 100) >= minConf)
        kept += good.length
        if (good.length) lines.push(good.map((w) => w.text.trim()).join(" "))
      }
      // Harvest participant names FIRST — the name overlay is often the ONLY
      // confidently-read line on a blurry frame, so it must be collected even
      // when the frame as a whole is dropped as garbage below.
      const content = []
      for (const l of lines) {
        if (isTileLabelLine(l)) {
          if (nameSink) for (const n of tileNameTokens(l)) nameSink.add(n)
        } else content.push(l)
      }
      if (total && kept < total * 0.35) return "" // mostly garbage → drop this frame
      const out = content.join("\n").trim()
      if (out) return out
    }
    if (Array.isArray(data?.words) && data.words.length) {
      const kept = data.words.filter((w) => (w.confidence ?? 100) >= minConf && (w.text || "").trim())
      if (kept.length < data.words.length * 0.35) return ""
      return kept.map((w) => w.text.trim()).join(" ")
    }
    return data?.text || ""
  } catch { return data?.text || "" }
}

// Confident word boxes (image pixels) so a step's "click 'New dashboard'" can be
// pinned to the exact spot on the screenshot. Tile labels are left out.
function wordBoxes(data, minConf = 55) {
  const out = []
  try {
    for (const b of data?.blocks || []) for (const p of (b.paragraphs || [])) for (const l of (p.lines || [])) {
      const line = (l.words || []).map((w) => w.text || "").join(" ")
      if (isTileLabelLine(line)) continue
      for (const w of l.words || []) {
        const t = (w.text || "").trim()
        if (!t || (w.confidence ?? 100) < minConf || !w.bbox) continue
        out.push({ t, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 })
      }
    }
  } catch { /* boxes are a bonus */ }
  return out
}

// A second look for the marker boxes only: Tesseract's page layout drops small
// coloured buttons ("Create", "Share", "Save"), the very things a step clicks.
// Find solid coloured rectangles, then read each one as a single line at 2x,
// inverted when the text is light on a dark fill.
function findButtons(img) {
  const S = 2 // work at half size
  const w = Math.floor(img.width / S), h = Math.floor(img.height / S)
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const ctx = c.getContext("2d", { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    if (mx > 70 && (mx - mn) / mx > 0.38) mask[i] = 1 // saturated colour fill
  }
  const seen = new Uint8Array(w * h), out = [], stack = []
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0
    stack.push(i); seen[i] = 1
    while (stack.length) {
      const k = stack.pop(), x = k % w, y = (k - x) / w
      n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const q of [k - 1, k + 1, k - w, k + w]) {
        if (q < 0 || q >= w * h || seen[q] || !mask[q]) continue
        if ((q === k - 1 && x === 0) || (q === k + 1 && x === w - 1)) continue
        seen[q] = 1; stack.push(q)
      }
    }
    const bw = (x1 - x0 + 1) * S, bh = (y1 - y0 + 1) * S
    // button sized, mostly filled (text holes allowed), wider than tall
    if (bw < 28 || bw > 520 || bh < 16 || bh > 90 || bw < bh * 0.9) continue
    if (n * S * S < bw * bh * 0.45) continue
    out.push({ x: x0 * S, y: y0 * S, w: bw, h: bh })
    if (out.length >= 24) break
  }
  return out
}

async function buttonWords(worker, src) {
  const img = await loadImage(src)
  const boxes = findButtons(img)
  if (!boxes.length) return []
  const words = []
  await worker.setParameters({ tessedit_pageseg_mode: "7" })
  try {
    for (const b of boxes) {
      const k = 3, pad = 2
      const c = document.createElement("canvas")
      c.width = (b.w + pad * 2) * k; c.height = (b.h + pad * 2) * k
      const ctx = c.getContext("2d", { willReadFrequently: true })
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 0, 0, c.width, c.height)
      const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data
      // grey + Otsu threshold → crisp dark text on white, whatever the button colour
      const lum = new Uint8Array(px.length / 4), hist = new Array(256).fill(0)
      for (let i = 0; i < lum.length; i++) { lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; hist[lum[i]]++ }
      let sumAll = 0; for (let t = 0; t < 256; t++) sumAll += t * hist[t]
      let wB = 0, sumB = 0, best = 0, thr = 128
      for (let t = 0; t < 256; t++) {
        wB += hist[t]; if (!wB) continue
        const wF = lum.length - wB; if (!wF) break
        sumB += t * hist[t]
        const between = wB * wF * (sumB / wB - (sumAll - sumB) / wF) ** 2
        if (between > best) { best = between; thr = t }
      }
      let above = 0; for (let i = 0; i < lum.length; i++) if (lum[i] > thr) above++
      const lightText = above < lum.length / 2 // the minority side is the text
      const ink = new Uint8Array(lum.length)
      for (let i = 0; i < lum.length; i++) ink[i] = (lightText ? lum[i] > thr : lum[i] <= thr) ? 1 : 0
      // ink touching the crop edge is the page around the rounded button, not text
      const W = c.width, Hh = c.height, q = []
      for (let x = 0; x < W; x++) { q.push(x, (Hh - 1) * W + x) }
      for (let y = 0; y < Hh; y++) { q.push(y * W, y * W + W - 1) }
      while (q.length) {
        const k = q.pop()
        if (!ink[k]) continue
        ink[k] = 0
        const x = k % W
        if (x > 0) q.push(k - 1); if (x < W - 1) q.push(k + 1)
        if (k >= W) q.push(k - W); if (k < W * (Hh - 1)) q.push(k + W)
      }
      for (let i = 0; i < lum.length; i++) px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = ink[i] ? 0 : 255
      ctx.putImageData(d, 0, 0)
      try {
        const { data } = await worker.recognize(c, {}, { blocks: true })
        for (const wd of wordBoxes(data, 60)) {
          if (!/[a-z0-9]/i.test(wd.t)) continue
          words.push({ t: wd.t, x0: b.x - pad + wd.x0 / k, y0: b.y - pad + wd.y0 / k, x1: b.x - pad + wd.x1 / k, y1: b.y - pad + wd.y1 / k })
        }
      } catch { /* unreadable button */ }
    }
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: "3" })
  }
  return words
}

function mergeWords(base, extra, scale) {
  const out = [...base]
  for (const w of extra) {
    const b = { t: w.t, x0: w.x0 / scale, y0: w.y0 / scale, x1: w.x1 / scale, y1: w.y1 / scale }
    const overlap = out.some((o) => {
      const ix = Math.max(0, Math.min(o.x1, b.x1) - Math.max(o.x0, b.x0))
      const iy = Math.max(0, Math.min(o.y1, b.y1) - Math.max(o.y0, b.y0))
      return ix * iy > 0.3 * Math.min((o.x1 - o.x0) * (o.y1 - o.y0), (b.x1 - b.x0) * (b.y1 - b.y0))
    })
    if (!overlap) out.push(b)
  }
  return out
}

export default function useOCR() {
  // frames: [{timestamp, imageData}], transcriptText: string (for extra tool hints)
  const runOCR = useCallback(async (frames, transcriptText = "", onProgress) => {
    if (!frames?.length) return { frameTexts: [], tools: detectTools(transcriptText), primaryApp: detectPrimaryApp(transcriptText), sceneCuts: [] }

    const { createWorker } = await import("tesseract.js")
    // Point the engine, the worker and the English data at our own origin.
    // Left to itself tesseract.js downloads all three from jsdelivr on first
    // use, which is both a call to a third party and a reason OCR would fail
    // on an offline machine. The build copies them into /tesseract.
    const worker = await createWorker("eng", 1, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract",
      langPath: "/tesseract/lang",
    })
    // Keep spacing between words/columns — helps read tables, ribbons and menus.
    try { await worker.setParameters({ preserve_interword_spaces: "1" }) } catch { /* older tesseract.js */ }

    const { keyframes, sceneCuts } = await selectKeyframes(frames)
    const frameTexts = []
    const nameCounts = new Map() // participant name → number of frames it appeared on
    let combined = transcriptText + "\n"

    for (let i = 0; i < keyframes.length; i++) {
      onProgress?.(i, keyframes.length)
      try {
        // Request word/line confidence so we can drop garbled, low-confidence OCR
        // (e.g. unreadable enterprise-UI text) instead of feeding it to the model.
        const { data } = await worker.recognize(keyframes[i].imageData, {}, { text: true, blocks: true })
        const frameNames = new Set()
        const text = cleanOCR(data, 55, frameNames).replace(/\s+\n/g, "\n").trim()
        for (const n of frameNames) nameCounts.set(n, (nameCounts.get(n) || 0) + 1)
        if (text) {
          let words = wordBoxes(data)
          try { words = mergeWords(words, await buttonWords(worker, keyframes[i].imageData), 1) } catch { /* first pass boxes are enough */ }
          frameTexts.push({ timestamp: keyframes[i].timestamp, text, words })
          combined += text + "\n"
        }
      } catch {
        // skip unreadable frame
      }
    }

    await worker.terminate()
    // Only names seen on SEVERAL frames count as participants — a one-off OCR
    // fluke of real screen content must not land on the blocklist. Webcam tile
    // labels render on every frame, so real participants clear this bar easily.
    const participants = [...nameCounts.entries()].filter(([, c]) => c >= 2).map(([n]) => n)
    return { frameTexts, tools: detectTools(combined), primaryApp: detectPrimaryApp(combined), sceneCuts, participants }
  }, [])

  return { runOCR, detectTools }
}

// Find the OCR text captured nearest a given timestamp (for annotation context).
export function ocrNear(frameTexts, ts, windowSecs = 8) {
  if (!frameTexts?.length) return ""
  const hits = frameTexts
    .filter((f) => Math.abs(f.timestamp - ts) <= windowSecs)
    .map((f) => f.text)
  return hits.join(" ").slice(0, 400)
}
