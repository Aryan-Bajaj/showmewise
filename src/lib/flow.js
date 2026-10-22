// The flow diagram as plain data, so it can follow the steps and be edited.

export function docHeading(d) {
  if (d.step) {
    if (d.step.title) return d.step.title.trim().slice(0, 90)
    if (d.step.steps?.[0]) return d.step.steps[0].trim().slice(0, 90)
  }
  if (d.annotation) return d.annotation.split(/\n/)[0].trim().slice(0, 90)
  return (d.text || "").split(/[.!?\n]/)[0].trim().slice(0, 90)
}

// Structured flow that keeps EVERY step (no info loss) but looks clean: steps
// are grouped into phases, flowing left-to-right inside each phase, phases
// stacked top-down. Deterministic, so it always renders.
// flowFromDocs gives the phases as plain data ({ name, boxes }) so the user can
// edit them; flowToMermaid draws any such list.
export function flowFromDocs(docs) {
  const titles = (docs || []).map(docHeading).filter(Boolean).filter((h, i, a) => h !== a[i - 1])
  if (!titles.length) return []
  const phases = Math.min(6, Math.max(1, Math.round(titles.length / 5)))
  const per = Math.ceil(titles.length / phases)
  const out = []
  for (let p = 0; p * per < titles.length; p++) out.push({ name: `Phase ${p + 1}`, boxes: titles.slice(p * per, (p + 1) * per) })
  return out
}

const safeLabel = (t, n) => String(t || "").replace(/["\n]/g, " ").replace(/[\[\](){}|<>#;`]/g, "").trim().slice(0, n)

export function flowToMermaid(phases) {
  const list = (phases || [])
    .map((p) => ({ name: safeLabel(p.name, 40), boxes: (p.boxes || []).map((b) => safeLabel(b, 46)).filter(Boolean) }))
    .filter((p) => p.boxes.length)
  if (!list.length) return ""
  let out = "flowchart TD\n"
  let id = 0
  const phaseIds = []
  list.forEach((ph, p) => {
    const pid = `P${p}`
    phaseIds.push(pid)
    out += `  subgraph ${pid}["${ph.name || " "}"]\n    direction LR\n`
    const ids = ph.boxes.map(() => `S${id++}`)
    ph.boxes.forEach((label, j) => { out += `    ${ids[j]}["${label}"]\n` })
    for (let j = 1; j < ids.length; j++) out += `    ${ids[j - 1]} --> ${ids[j]}\n`
    out += `  end\n`
  })
  for (let p = 1; p < phaseIds.length; p++) out += `  ${phaseIds[p - 1]} --> ${phaseIds[p]}\n`
  return out
}

