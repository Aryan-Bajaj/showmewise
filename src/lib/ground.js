// Names in the summary parts (purpose, what you need, summary, FAQ) must come
// from the video. A product name that is neither said nor on screen is one the
// AI made up (a demo of a made-up app came back as "Access to Grafana"): it is
// replaced with "the app". Steps have their own check (groundStepInEvidence).

const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "")

// capitalised names, one word or several in a row ("Grafana", "Power BI")
const NAME = /\b[A-Z][A-Za-z0-9&+.-]*[A-Za-z0-9](?:\s+[A-Z][A-Za-z0-9&+.-]*[A-Za-z0-9])*\b/g

export function groundNames(text, evidence) {
  if (typeof text !== "string" || !text) return text
  const have = squash(evidence)
  let out = text.replace(NAME, (name, at, all) => {
    // the first word of a sentence is capitalised anyway: not checked
    const before = all.slice(0, at)
    if (!before.trim() || /[.!?:]\s*$/.test(before)) return name
    if (name.length < 3 || have.includes(squash(name))) return name
    // a longer name whose words are all in the video stays ("Weekly Overview")
    if (name.split(/\s+/).every((w) => have.includes(squash(w)))) return name
    return "the app"
  })
  out = out.replace(/\bthe the app\b/gi, "the app").replace(/\b(an?) the app\b/gi, "the app")
  return out
}

// all summary fields at once
export function groundInsights(ins, evidence) {
  const g = (s) => groundNames(s, evidence)
  return {
    ...ins,
    purpose: g(ins.purpose),
    summary: g(ins.summary),
    prerequisites: (ins.prerequisites || []).map(g),
    keyObservations: (ins.keyObservations || []).map(g),
    faqs: (ins.faqs || []).map((f) => ({ ...f, q: g(f.q), a: g(f.a) })),
  }
}
