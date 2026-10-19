// Marked-up screenshots: pin every action of a step ("Click '+ New dashboard'")
// to the exact words on the screen, using the OCR word boxes of the frames in
// that step's time window. Deterministic, no model call: if a label can't be
// found on screen, the action simply gets no marker (never a guessed one).
// The transcript gives the timing hint (when was it said?), the OCR gives the
// place (where is it?), the same eyes-and-ears rule as the rest of the pipeline.

const VERBS = /^(?:double[- ]click|right[- ]click|click(?: on)?|tap|select|choose|pick|type|enter|fill in|toggle|switch(?: on| off)?|turn(?: on| off)?|open|press|check|tick|uncheck|go to|navigate to|name|give|set|copy|paste|drag|hover over|expand|close|save|add|edit|rename|search for)\b/i
const TYPING = /^(?:type|enter|fill in|name|give|rename|search for)\b/i
const QUOTED = /['"‘’“”]([^'"‘’“”]{1,48})['"‘’“”]/g
// "Select 'Tasks by status' from the 'Data' field": a value going INTO a field
const INTO_FIELD = /\b(?:from|in|into|on|under)\s+(?:the\s+)?['"‘’“”][^'"‘’“”]+['"‘’“”]\s*(?:field|box|list|dropdown|menu|input|option)?/i
const isFieldEntry = (a) => TYPING.test(a) || ([...a.matchAll(QUOTED)].length > 1 && INTO_FIELD.test(a))
const STOP_TAIL = /\s+(?:button|menu|tab|field|option|icon|link|switch|toggle|box|dropdown|list|panel|dialog|window|setting|from|in|on|at|to|into|under|next to|and|then)\b.*$/i

const norm = (t) => (t || "").toLowerCase().replace(/[^a-z0-9+]/g, "")

function close(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true // dashboard / dashboards
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0 // one OCR slip allowed on longer words
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

// What on the screen does this action point at? Field label first for typing
// actions (the field is visible before anything is typed), the value second.
export function actionTargets(action) {
  const a = (action || "").trim()
  const quoted = [...a.matchAll(QUOTED)].map((m) => m[1].trim()).filter(Boolean)
  if (quoted.length) return TYPING.test(a) && quoted.length > 1 ? [quoted[1], quoted[0]] : quoted // field first when typing; value first when picking
  const m = a.match(VERBS)
  if (!m) return []
  let rest = a.slice(m[0].length).replace(/^\s*(?:the|a|an)\s+/i, "").replace(/[.:;]+$/, "")
  rest = rest.replace(STOP_TAIL, "").trim()
  return rest && rest.split(/\s+/).length <= 5 ? [rest] : []
}

// Short text for the marker bubble: "Click + New dashboard".
export function shortLabel(action) {
  const a = (action || "").trim().replace(/[.]+$/, "")
  const verb = (a.match(VERBS)?.[0] || "").replace(/\s+on$/i, "")
  const target = actionTargets(a)[0]
  let out = verb && target ? `${verb[0].toUpperCase()}${verb.slice(1).toLowerCase()} ${target}` : a
  if (TYPING.test(a)) {
    const q = [...a.matchAll(QUOTED)].map((m) => m[1].trim())
    if (q.length) out = `${verb[0].toUpperCase()}${verb.slice(1).toLowerCase()} ${q[0]}`
  }
  return out.length > 38 ? out.slice(0, 36).trimEnd() + "…" : out
}

// Find the label's word run in one frame's boxes → { box, exact } or null.
// exact = the run stands alone (a button "Share"), not inside a longer line
// ("Share dashboard" heading), which is what a click target looks like.
function locate(label, words) {
  const want = label.split(/\s+/).map(norm).filter(Boolean)
  if (!want.length || !words?.length) return null
  const ws = words.map((w) => ({ ...w, n: norm(w.t) })).filter((w) => w.n)
  let best = null
  for (let i = 0; i < ws.length; i++) {
    if (!close(ws[i].n, want[0]) && !(want[0] === "+" && ws[i].n.startsWith("+"))) continue
    const run = [ws[i]]
    let k = 1
    // "+New" read as one word still matches "+ New"
    if (want[0] === "+" && ws[i].n.length > 1 && close(ws[i].n.slice(1), want[1] || "")) k = 2
    for (let j = i + 1; k < want.length && j < ws.length && j <= i + want.length + 1; j++) {
      const prev = run[run.length - 1]
      const h = Math.max(prev.y1 - prev.y0, 6)
      const sameLine = Math.abs((ws[j].y0 + ws[j].y1) / 2 - (prev.y0 + prev.y1) / 2) < h * 0.8
      const near = ws[j].x0 - prev.x1 < h * 2.5 && ws[j].x0 >= prev.x0
      if (!sameLine || !near) break
      const lastCut = k === want.length - 1 && ws[j].n.length >= 3 && want[k].startsWith(ws[j].n) // "wee|" while typing
      if (close(ws[j].n, want[k]) || lastCut) { run.push(ws[j]); k++ }
      else break
    }
    if (k < want.length) continue
    const box = {
      x0: Math.min(...run.map((w) => w.x0)), y0: Math.min(...run.map((w) => w.y0)),
      x1: Math.max(...run.map((w) => w.x1)), y1: Math.max(...run.map((w) => w.y1)),
    }
    const area = (box.x1 - box.x0) * (box.y1 - box.y0)
    const h = Math.max(box.y1 - box.y0, 6)
    const cy = (box.y0 + box.y1) / 2
    const touching = ws.some((w) => !run.includes(w) && Math.abs((w.y0 + w.y1) / 2 - cy) < h * 0.6 &&
      ((w.x0 >= box.x1 && w.x0 - box.x1 < h * 0.9) || (w.x1 <= box.x0 && box.x0 - w.x1 < h * 0.9)))
    const exact = !touching
    if (!best || (exact && !best.exact) || (exact === best.exact && area < best.area)) best = { box, area, exact }
  }
  return best ? { box: best.box, exact: best.exact } : null
}

// When was this label said? First transcript chunk inside the window that names it.
function spokenAt(label, chunks, a, b) {
  const want = label.split(/\s+/).map(norm).filter((t) => t.length > 2)
  if (!want.length) return null
  for (const c of chunks || []) {
    const s = c.timestamp?.[0] ?? 0
    if (s < a - 2 || s > b + 2) continue
    const said = (c.text || "").split(/\s+/).map(norm)
    if (want.every((t) => said.some((x) => close(x, t)))) return s
  }
  return null
}

// docs: annotated steps · ocrFrameTexts: [{timestamp, words}] · frames: [{timestamp, imageData}]
// Returns one entry per doc: { shots: [{ ts, image, callouts: [{ n, label, box }] }], marks: [n|null per action] }
export function buildStepShots(docs, ocrFrameTexts, frames, chunks) {
  const byTs = new Map((frames || []).map((f) => [f.timestamp, f.imageData]))
  const widthAt = new Map((frames || []).map((f) => [f.timestamp, f.width || 0]))
  const ocr = (ocrFrameTexts || []).filter((f) => f.words?.length && byTs.has(f.timestamp))
    .sort((x, y) => x.timestamp - y.timestamp)
  return (docs || []).map((doc) => {
    const actions = doc.step?.steps || []
    const a = doc.timestamp ?? 0
    const b = doc.endTimestamp ?? a + 30
    const pool = ocr.filter((f) => f.timestamp >= a - 1.5 && f.timestamp <= b + 1.5)
    const shots = []
    const marks = actions.map(() => null)
    const find = (act, lo, hi) => {
      for (const label of actionTargets(act)) {
        const said = spokenAt(label, chunks, a, b)
        const all = pool.filter((f) => f.timestamp >= lo && f.timestamp <= hi)
          .map((f) => { const r = locate(label, f.words); return r ? { f, box: r.box, exact: r.exact } : null }).filter(Boolean)
        if (!all.length) continue
        // stand-alone matches (real buttons) win over words inside a longer line
        const cands = all.some((c) => c.exact) ? all.filter((c) => c.exact) : all
        // the frame just before it was said shows the screen the viewer acts on
        return said == null ? cands[0]
          : cands.reduce((p, c) => (Math.abs(c.f.timestamp - (said - 0.5)) < Math.abs(p.f.timestamp - (said - 0.5)) ? c : p))
      }
      return null
    }
    // 1) clicks and selections, in order: never look before the previous one
    const hits = actions.map(() => null)
    let floor = a - 1.5
    actions.forEach((act, i) => {
      if (isFieldEntry(act)) return
      const hit = find(act, floor, b + 1.5)
      if (hit) { hits[i] = hit; floor = hit.f.timestamp }
    })
    // 2) typed or picked values: only while the dialog they go into is open, i.e.
    // from the previous click until the next click's button disappears. Later the
    // same words show up as the saved result (a title, a chart name).
    actions.forEach((act, i) => {
      if (!isFieldEntry(act)) return
      const lo = hits.slice(0, i).reverse().find(Boolean)?.f.timestamp ?? a - 1.5
      const k = hits.findIndex((h, j) => j > i && h)
      let hi = b + 1.5
      if (k >= 0) {
        const label = actionTargets(actions[k])[0]
        const after = pool.filter((f) => f.timestamp >= hits[k].f.timestamp)
        const gone = after.find((f) => !locate(label, f.words))
        hi = gone ? gone.timestamp - 0.01 : after[after.length - 1].timestamp
      }
      hits[i] = find(act, lo, hi)
    })
    hits.forEach((hit, i) => {
      if (!hit) return
      let shot = shots.find((s) => s.ts === hit.f.timestamp)
      if (!shot) { shot = { ts: hit.f.timestamp, image: byTs.get(hit.f.timestamp), srcW: widthAt.get(hit.f.timestamp), callouts: [] }; shots.push(shot) }
      shot.callouts.push({ n: i + 1, label: shortLabel(actions[i]), box: hit.box })
      marks[i] = i + 1
    })
    shots.sort((x, y) => x.ts - y.ts)
    return { shots, marks }
  })
}
