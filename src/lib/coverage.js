// Completeness check: the facts a step must not lose. Taken from the part's own
// evidence (what was said and what the screen showed), never invented:
//   • codes said or shown: transaction / screen codes like ME21N, VA01, MM03
//   • numbers of 3+ digits: account numbers, company codes, years
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
  const both = `${spoken} ${screen}`
  const out = new Map() // squashed → shown form
  const add = (t) => { const k = squash(t); if (k.length >= 3 && !out.has(k)) out.set(k, t.trim()) }
  // codes: the screen's spelling first; a spoken code one letter away from a
  // screen code is the same code misheard ("MN21N" said, "ME21N" shown)
  const codes = []
  for (const m of (screen || "").matchAll(CODE)) { const c = m[0].toUpperCase(); if (!codes.includes(c)) { codes.push(c); add(c) } }
  for (const m of (spoken || "").matchAll(CODE)) {
    const c = m[0].toUpperCase()
    const twin = codes.find((x) => x.length === c.length && near(x, c))
    if (twin) { if (twin !== c && !out.get(squash(twin)).includes("|")) out.set(squash(twin), `${twin}|${c}`) } else { codes.push(c); add(c) }
  }
  // a number heard and the same number read off the screen often differ by a
  // digit (7731520 / 7731320): one fact, either form counts
  const nums = []
  for (const m of both.matchAll(NUMBER)) {
    const n = m[0]
    if (/^(19|20)\d\d$/.test(n) && both.split(n).length <= 2) continue // a lone year is rarely a step value
    const twin = nums.find((x) => Math.abs(x.length - n.length) <= 1 && near(x, n))
    if (twin) { if (twin !== n) out.set(squash(twin), `${out.get(squash(twin))}|${n}`) } else { nums.push(n); add(n) }
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

export const COVERAGE_ADDENDUM = (missing) => `

YOUR STEP LEAVES OUT THINGS THE USER DID OR SAID in this part: ${missing.map((t) => `"${t.split("|").join('" or "')}"`).join(", ")}.
Rewrite the step so each of them appears in the action where it belongs (the code typed, the value entered, the field filled, the option chosen). Write a value the way the screen shows it when it is visible, otherwise as it was said. Keep every action you already had, keep them in the order they happened, and add nothing that was not said or shown.`
