// One structure for every export (HTML, PDF, Word), modelled on a hand-written
// process manual: cover details, purpose, what you need, the process at a
// glance, then Part A, B, C… with numbered sub-steps (A1, A2…) and marked-up
// screenshots, a checklist and a quick reference. Every line comes from the
// annotated steps or the insights; nothing new is written here.

import { renderShot } from "./annotateImage"

const QUOTED = /['"‘’“”]([^'"‘’“”]{1,48})['"‘’“”]/g

export function partLetter(i) {
  let s = "", n = i
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return s
}

const fmtTime = (secs) => {
  const s = Math.max(0, Math.round(secs || 0))
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`
}

// "Access to the app: ask your admin" → { what, detail }
function splitNeed(item) {
  const t = (item || "").trim()
  const m = t.match(/^(.{3,60}?)\s*(?::|\s[-–—]\s)\s*(.+)$/)
  return m ? { what: m[1], detail: m[2] } : { what: t, detail: "" }
}

const clean = (t) => (t || "").replace(/^[-•*]\s*/, "").trim()

export function buildGuide(docs, meta = {}) {
  const ins = meta.insights || {}
  const tools = meta.tools || []
  const title = (meta.title && meta.title.trim()) || "Step-by-Step Guide"
  let steps = (docs || []).filter((d) => d.step || d.annotation)
  // nothing annotated yet (export straight after transcription): document the narration
  if (!steps.length) steps = (docs || []).filter((d) => d.text).map((d) => ({ ...d, annotation: d.text }))

  const parts = steps.map((d, i) => {
    const letter = partLetter(i)
    const actions = (d.step?.steps || []).map(clean).filter(Boolean)
    const marks = d.marks || actions.map(() => null)
    const shots = (d.shots || []).map((s, k) => ({ ...s, fig: 0, key: `${letter}-${k}` }))
    // Group the actions under the screenshot that shows them (A1 text, A2 text,
    // then the picture with markers 1 and 2), the way a manual reads.
    const groups = []
    let current = null
    actions.forEach((text, k) => {
      const n = marks[k]
      const shotIdx = n ? shots.findIndex((s) => s.callouts.some((c) => c.n === n)) : -1
      if (!current || (shotIdx >= 0 && shotIdx !== current.shotIdx && current.shotIdx >= 0)) {
        current = { shotIdx, subs: [] }; groups.push(current)
      } else if (shotIdx >= 0 && current.shotIdx < 0) current.shotIdx = shotIdx
      current.subs.push({ id: `${letter}${k + 1}`, n: k + 1, text, marked: !!n })
    })
    if (!groups.length && d.annotation) groups.push({ shotIdx: -1, subs: [{ id: `${letter}1`, n: 1, text: clean(d.annotation), marked: false }] })
    const entries = [...new Set(actions.flatMap((a) => [...a.matchAll(QUOTED)].map((m) => m[1].trim())))]
    return {
      letter,
      title: d.step?.title || `Step ${i + 1}`,
      label: d.label || "",
      timestamp: d.timestamp ?? 0,
      groups,
      shots,
      result: d.step?.result || "",
      tip: (d.step?.note || "").replace(/^[-\s]+/, ""),
      lowConfidence: !!d.lowConfidence,
      first: actions[0] || "",
      entries,
      doc: d,
    }
  })

  // figure numbers in reading order
  // A screenshot shown once is not shown again: a later action on the same
  // screen points back to it ("see Figure 3") instead of repeating the picture.
  let fig = 0
  for (const p of parts) for (const g of p.groups) {
    if (g.shotIdx < 0) continue
    const s = p.shots[g.shotIdx]
    if (s.fig) {
      g.subs.forEach((sub) => { if (sub.marked) sub.text = `${sub.text.replace(/[.]+$/, "")} (see Figure ${s.fig}).` })
      g.shotIdx = -1
    } else s.fig = ++fig
  }

  const purpose = (ins.purpose || "").split(/\n\n+/).map((t) => t.trim()).filter(Boolean)
  const needs = (Array.isArray(ins.prerequisites) ? ins.prerequisites : []).map(splitNeed).filter((n) => n.what)
  if (tools.length && !needs.some((n) => /tool|app|system|software/i.test(n.what))) {
    needs.push({ what: tools.length > 1 ? "Apps used" : "App used", detail: tools.join(", ") })
  }
  const details = [
    ["Process", title],
    ...(tools.length ? [["App", tools.join(", ")]] : []),
    ["Steps", `${parts.length} parts, ${parts.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.subs.length, 0), 0)} actions`],
    ...(meta.duration ? [["Recording", fmtTime(meta.duration)]] : []),
    ...(meta.company ? [["Team", meta.company]] : []),
    ["Created", new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })],
    ["Made with", "ShowMeWise"],
  ]

  return {
    title,
    subtitle: purpose[0] ? purpose[0].split(/(?<=[.!?])\s/)[0] : "",
    company: meta.company || "",
    details,
    purpose,
    summary: (ins.summary || "").split(/\n\n+/).map((t) => t.trim()).filter(Boolean),
    needs,
    parts,
    checklist: parts.map((p) => ({ part: p.letter, text: p.result ? `${p.title}: ${p.result}` : p.title })),
    quickRef: parts.map((p) => ({ part: p.letter, title: p.title, entries: p.entries.join(", ") })),
    observations: Array.isArray(ins.keyObservations) ? ins.keyObservations.filter(Boolean) : [],
    faqs: Array.isArray(ins.faqs) ? ins.faqs.filter((f) => f?.q && f?.a) : [],
    flowImage: meta.flowImage || null,
    figures: fig,
  }
}

// Burn the markers into every screenshot once (shared by all exports).
export async function renderGuideShots(guide, opts) {
  for (const p of guide.parts) {
    for (const s of p.shots) {
      if (s.rendered || !s.image) continue
      try { s.rendered = await renderShot(s.image, s.callouts, opts) } catch { s.rendered = null }
    }
  }
  return guide
}

// Caption for a figure: the actions it shows.
export function figureCaption(part, shot) {
  const ns = shot.callouts.map((c) => c.n)
  const subs = part.groups.flatMap((g) => g.subs).filter((s) => ns.includes(s.n))
  const what = subs.map((s) => s.text.replace(/\s*\(see Figure \d+\)/, "").replace(/[.]+$/, "")).join(", then ")
  return `Figure ${shot.fig}: ${what.length > 110 ? what.slice(0, 108).trimEnd() + "…" : what}`
}
