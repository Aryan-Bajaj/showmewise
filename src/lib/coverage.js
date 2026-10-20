// Completeness check: the facts a step must not lose. Taken from the part's own
// evidence (what was said and what the screen showed), never invented:
//   • codes that were SAID: transaction / screen codes like ME21N, VA01, MM03
//   • numbers of 3+ digits that were SAID: account numbers, company codes
//   (the screen gives the right spelling of what was said)
//   • "period 3", "step 2" style values
//   • two-word names that are BOTH said and on screen ("Processing Type",
//     "Partial Capitalization", "Test Run"): strong evidence of a real field
// missingTerms() lists those a written step leaves out, so the step can be asked
// for again with exactly what it missed.

const CODE = /\b(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z]{1,5}\d{1,4}[a-z]?\b/gi
const NUMBER = /\b\d{3,}\b/g
const PERIOD = /\b(?:period|step|version|level)\s+\d{1,3}\b/gi
const WORD = /^[a-z][a-z/.-]{2,}$/
const STOP = new Set(["the", "and", "then", "this", "that", "with", "from", "into", "have", "will", "here", "there", "what", "when", "your", "our", "you", "are", "was", "for", "can", "not", "all", "now", "see", "go", "we", "it", "is", "to", "of", "in", "on", "at", "so", "if", "or", "be", "do", "a", "an"])

const squash = (t) => (t || "").toLowerCase().replace(/[^a-z0-9|]/g, "")
// same length ±1 and at most one digit different / missing
function near(a, b) {
  if (a === b) return true
  let i = 0, j = 0, e = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++e > 1) return false
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++ }
  }
  return e + (a.length - i) + (b.length - j) <= 1
}

export function keyTerms(spoken = "", screen = "") {
  const out = new Map() // squashed → shown form
  const add = (t) => { const k = squash(t); if (k.length >= 3 && !out.has(k)) out.set(k, t.trim()) }
  // codes: the screen's spelling first; a spoken code one letter away from a
  // screen code is the same code misheard ("MN21N" said, "ME21N" shown)
  // only codes that were SAID count; the screen gives their right spelling
  const shownCodes = [...new Set([...(screen || "").matchAll(CODE)].map((m) => m[0].toUpperCase()))]
  for (const m of (spoken || "").matchAll(CODE)) {
    const c = m[0].toUpperCase()
    const twin = shownCodes.find((x) => x.length === c.length && near(x, c))
    if (!twin || twin === c) add(c)
    else if (!out.has(squash(twin))) out.set(squash(twin), `${twin}|${c}`)
  }
  // a number heard and the same number read off the screen often differ by a
  // digit (7731520 / 7731320): one fact, either form counts
  // only numbers that were SAID count: a number only on screen is table data,
  // not a step (a line-item list put 40 amounts into one part's "missing" list
  // in a real test)
  const shownNums = [...new Set([...(screen || "").matchAll(NUMBER)].map((m) => m[0]))]
  for (const m of (spoken || "").matchAll(NUMBER)) {
    const n = m[0]
    if (/^(19|20)\d\d$/.test(n)) continue // a year said in passing is rarely a step value
    const twin = shownNums.find((x) => x !== n && Math.abs(x.length - n.length) <= 1 && near(x, n))
    if (!out.has(squash(n))) out.set(squash(n), twin ? `${n}|${twin}` : n)
  }
  for (const m of spoken.matchAll(PERIOD)) add(m[0].toLowerCase())
  // two-word names on the screen that were also said
  const said = ` ${spoken.toLowerCase().replace(/[^a-z0-9/ ]+/g, " ").replace(/\s+/g, " ")} `
  // pairs never cross a label edge: "Processing Type: Partial" is two names
  for (const piece of (screen || "").split(/[:;|,()[\]\n]+/)) {
    const words = piece.replace(/[^A-Za-z0-9/.\- ]+/g, " ").split(/\s+/).filter(Boolean)
    for (let i = 0; i + 1 < words.length; i++) {
      const a = words[i].toLowerCase(), b = words[i + 1].toLowerCase()
      if (!WORD.test(a) || !WORD.test(b) || STOP.has(a) || STOP.has(b)) continue
      if (said.includes(` ${a} ${b} `)) add(`${words[i]} ${words[i + 1]}`)
    }
  }
  return [...out.values()]
}

const stepText = (step) => [step?.title, ...(step?.steps || []), step?.result, step?.note].filter(Boolean).join(" ")

export function missingTerms(step, terms) {
  const have = squash(stepText(step))
  return (terms || []).filter((t) => !t.split("|").some((alt) => have.includes(squash(alt))))
}

// Ask again only when something real is missing: any code or number, or two
// or more said-and-shown names.
export function worthRetry(missing) {
  const hard = missing.filter((t) => /\d/.test(t))
  return hard.length >= 1 || missing.length >= 2
}

export const COVERAGE_ADDENDUM = (missing, actions = []) => `

YOUR STEP LEAVES OUT THINGS THE USER DID OR SAID in this part: ${[...missing.map((t) => `"${t.split("|").join('" or "')}"`), ...actions.map((t) => `the action "${t}"`)].join(", ")}.
Rewrite the step so each of them appears in the action where it belongs (the code typed, the value entered, the field filled, the option chosen). Write a value the way the screen shows it when it is visible, otherwise as it was said. Keep every action you already had, keep them in the order they happened, and add nothing that was not said or shown.`

// ── Actions said, in order ──
// The narration lists the clicks ("add the column, search it, click it, select
// the column, subtotal"). A model writing a long part tends to keep two of them.
// Pulled out here in code and handed over as a checklist; afterwards each one
// must be found in the written step.
const ACT = /\b(?:click|double[- ]?click|right[- ]?click|open|select|choose|go to|go back|navigate|type|enter|put|fill|set|add|remove|delete|drag|move|bring|copy|paste|execute|run|save|submit|tick|untick|uncheck|check|search|close|release|change|edit|press|confirm)\b/i
const FILLER = new Set([...STOP, "here", "this", "that", "them", "will", "then", "after", "now", "also", "just", "one", "some", "need", "should", "first", "next", "which", "where", "like", "always", "because", "going", "want"])

export function spokenActions(text) {
  const out = []
  for (const piece of (text || "").split(/[.;!?]+|,\s*|\b(?:and then|after that|after this|then)\b/i)) {
    const c = piece.trim().replace(/\s+/g, " ")
    if (c.length < 6 || !ACT.test(c)) continue
    const short = c.split(" ").slice(0, 14).join(" ")
    if (!out.some((o) => o.toLowerCase() === short.toLowerCase())) out.push(short)
    if (out.length >= 12) break
  }
  return out
}

// the words that make an action specific ("KPI", "column"), verbs and filler left out
const actionKey = (a) => a.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
  .filter((w) => w.length >= 3 && !FILLER.has(w) && !ACT.test(w))

export function missingActions(step, actions) {
  const have = stepText(step).toLowerCase()
  return (actions || []).filter((a) => { const k = actionKey(a); return k.length && !k.some((w) => have.includes(w.slice(0, 5))) })
}

// One step, cleaned: two actions that differ only by a number heard vs read
// ("enter 7731520" / "enter 7731320") keep the one the screen shows; a bare
// remark that something "is displayed" is not an action.
export function tidyActions(steps, screen = "") {
  const skeleton = (a) => a.toLowerCase().replace(/\d+/g, "#").replace(/[^a-z# ]/g, "").replace(/\s+/g, " ").trim()
  const nums = (a) => a.match(/\d{3,}/g) || []
  const out = []
  for (const a of steps || []) {
    if (/^(?:note|notice|observe|see)\b.*\b(?:is|are) (?:displayed|shown|visible|open)\b/i.test(a) && (steps || []).length > 1) continue
    const twin = out.findIndex((b) => skeleton(b) === skeleton(a) && nums(a).length && nums(a).every((n, i) => near(n, nums(b)[i] || "")))
    if (twin < 0) { out.push(a); continue }
    if (nums(a).every((n) => (screen || "").includes(n)) && !nums(out[twin]).every((n) => (screen || "").includes(n))) out[twin] = a
  }
  return out
}
