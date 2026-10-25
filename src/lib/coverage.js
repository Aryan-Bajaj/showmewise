// Completeness check: the facts a step must not lose. Taken from the part's own
// evidence (what was said and what the screen showed), never invented:
//   • codes that were SAID: transaction / screen codes like QX21N, QV01, QM03
//   • numbers of 3+ digits that were SAID: account numbers, company codes
//   (the screen gives the right spelling of what was said)
//   • "period 3", "step 2" style values
//   • two-word names that are BOTH said and on screen ("Processing Type",
//     "Posting Type", "Test Run"): strong evidence of a real field
// missingTerms() lists those a written step leaves out, so the step can be asked
// for again with exactly what it missed.

const CODE = /\b(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z]{1,5}\d{1,4}[a-z]?\b/gi
const NUMBER = /\b\d{3,}\b/g
const PERIOD = /\b(?:period|step|version|level)\s+\d{1,3}\b/gi
const WORD = /^[a-z][a-z/.-]{2,}$/
const QUOTED = /['"‘’“”]([^'"‘’“”]{1,48})['"‘’“”]/g
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
  // screen code is the same code misheard ("QN21N" said, "QX21N" shown)
  // only codes that were SAID count; the screen gives their right spelling
  const shownCodes = [...new Set([...(screen || "").matchAll(CODE)].map((m) => m[0].toUpperCase()))]
  for (const m of (spoken || "").matchAll(CODE)) {
    const c = m[0].toUpperCase()
    const twin = shownCodes.find((x) => x.length === c.length && near(x, c))
    if (!twin || twin === c) add(c)
    else if (!out.has(squash(twin))) out.set(squash(twin), `${twin}|${c}`)
  }
  // a number heard and the same number read off the screen often differ by a
  // digit (4502188 / 4502168): one fact, either form counts
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

// a code or value only in the title is not followable: it must be in an action
export function missingTerms(step, terms) {
  const have = squash([...(step?.steps || []), step?.result].filter(Boolean).join(" "))
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
const ACT = /\b(?:click|double[- ]?click|right[- ]?click|open|select|choose|go to|go back|navigate|type|enter|put|fill|set|add|remove|delete|drag|move|bring|copy|paste|execute|run|save|submit|tick|untick|uncheck|check|search|close|release|change|edit|press|confirm|ask|get|request|wait|approve|send|repeat|do this|do the same|until)\b/i
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
export const actionKey = (a) => a.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
  .filter((w) => w.length >= 3 && !FILLER.has(w) && !ACT.test(w))

// A suggestion that another part's step already has is not missing from the
// guide: an action said at the edge of a part ("Finally, click Share" just
// before the Share part) or a key word used where it belongs.
export function inOtherPart(suggestion, docs, i) {
  const term = suggestion.match(/^Use '(.+)'\.$/)?.[1]
  return docs.some((o, j) => j !== i && o.step && (term ? !missingTerms(o.step, [term]).length : !missingActions(o.step, [suggestion.replace(/\.$/, "")]).length))
}

export function missingActions(step, actions) {
  const have = stepText(step).toLowerCase()
  return (actions || []).filter((a) => { const k = actionKey(a); return k.length && !k.some((w) => have.includes(w.slice(0, 5))) })
}

// One step, cleaned: two actions that differ only by a number heard vs read
// ("enter 4502188" / "enter 4502168") keep the one the screen shows. A remark
// like "the error message is displayed" STAYS: it can be the check a user needs.
const bag = (a) => [...new Set(a.toLowerCase().match(/[a-z]{3,}/g) || [])].filter((w) => !["the", "and", "then", "into"].includes(w)).sort().join(" ")

// Two lines that ask for the same thing. Same meaning words (type = enter,
// choose/pick = select, press = click; "button", "field", "the" left out), or
// the same verb with every quoted name of the later line in the earlier one.
const SAME_VERB = { type: "enter", choose: "select", pick: "select", press: "click", tap: "click", hit: "click" }
const MEANING_STOP = new Set(["the", "and", "then", "into", "button", "field", "option", "tab", "from", "with", "for", "its", "this", "that", "your", "dialog", "window"])
const verbOf = (a) => { const v = (a.toLowerCase().match(/[a-z]+/) || [""])[0]; return SAME_VERB[v] || v }
const meaning = (a) => [...new Set((a.toLowerCase().match(/[a-z]{3,}/g) || []).map((w) => SAME_VERB[w] || w).filter((w) => !MEANING_STOP.has(w)))].sort().join(" ") + (/\bas\W*$/i.test(a) ? " +as" : "") // "Save as" is not "Save"
const quoted = (a) => [...a.matchAll(/['"‘“]([^'"’”]{2,60})['"’”]/g)].map((m) => m[1].toLowerCase().trim())
export function sameAction(a, b) {
  if (!a || !b) return false
  if (meaning(a) && meaning(a) === meaning(b)) return true
  // "Click Share" and "Click Share to open the dialog": the same click with its
  // purpose added (but "Click Save" and "Click Save as" are two different ones)
  const norm = (s) => s.toLowerCase().replace(/['"‘’“”.,!]/g, "").replace(/\s+/g, " ").trim().replace(/^[a-z]+/, (v) => SAME_VERB[v] || v)
  const [short, long] = norm(a).length <= norm(b).length ? [norm(a), norm(b)] : [norm(b), norm(a)]
  if (short.split(" ").length >= 2 && long.startsWith(short) && /^(\s+(to|so|and|in order)\b.*)?$/.test(long.slice(short.length))) return true
  const qa = quoted(a), qb = quoted(b)
  return qb.length > 0 && verbOf(a) === verbOf(b) && qb.every((q) => qa.includes(q))
}

// A part that repeats what the part before it ends with (the model wrote the
// same moment twice): those actions are dropped; a part with nothing new left
// is dropped. docs: [{ step: { steps } }] in order.
export function dropRepeatedParts(docs) {
  const out = []
  for (const d of docs || []) {
    const prev = [...out].reverse().find((x) => x.step)?.step?.steps || []
    if (!d.step || !prev.length) { out.push(d); continue }
    const keep = (d.step.steps || []).filter((a) => !prev.some((b) => sameAction(b, a)))
    if (!keep.length) continue
    out.push(keep.length === d.step.steps.length ? d : { ...d, step: { ...d.step, steps: keep } })
  }
  return out
}

export function tidyActions(steps, screen = "", spoken = "") {
  // "again" / "(repeated)": the model's way of writing the line above twice
  const skeleton = (a) => a.toLowerCase().replace(/\(?\b(again|repeated)\b\)?/g, "").replace(/\d+/g, "#").replace(/[^a-z# ]/g, "").replace(/\s+/g, " ").trim()
  const nums = (a) => a.match(/\d{3,}/g) || []
  const out = []
  for (const a of steps || []) {
    // the same action twice in a row, only the quote marks differ ("Click the
    // 'Create' button", "Click the "Create" button"): seen on a real run
    if (out.length && !nums(a).length && skeleton(out[out.length - 1]) === skeleton(a)) continue
    // the same words in another order, back to back ("Select and edit the
    // investment." / "Select the investment and edit it."), or a plain line
    // with no value written again later in the part ("Enter the asset number.")
    if (out.length && !nums(a).length && bag(out[out.length - 1]) === bag(a)) continue
    if (!/\d|'|"/.test(a) && out.some((b) => skeleton(b) === skeleton(a))) continue
    // the same action said again in other words later in the part ("Type
    // 'Weekly Overview' into the name field" after "Enter 'Weekly Overview'
    // in the 'Name' field", "Click the Create button" after "Click 'Create'")
    // (the same words again later is a real second click and stays)
    if (!nums(a).length && out.some((b) => skeleton(b) !== skeleton(a) && sameAction(b, a))) continue
    const twin = out.findIndex((b) => skeleton(b) === skeleton(a) && nums(a).length && nums(a).every((n, i) => near(n, nums(b)[i] || "")))
    if (twin < 0) { out.push(a); continue }
    if (nums(a).every((n) => (screen || "").includes(n)) && !nums(out[twin]).every((n) => (screen || "").includes(n))) out[twin] = a
  }
  return dropDescriptions(dropScreenLists(dropFieldTour(dropSpokenValues(out, screen)), spoken))
}

// "Observe the Account Number field", "Observe the Company Code field", ...:
// 3+ in a row is the model reading the screen out, not something the user does
// (seen on a real run). One such line alone can be a real check, so it stays.
const LOOK = /^(observe|note|see|look at|review|identify|view|check)\s+the\s+.{1,60}\b(field|button|checkbox|check box|tab|menu|column|option|icon|link|dropdown)s?\b\W*$/i
// "View the available options: Home, Reports, Settings, ...": the screen
// read out as a list, not something to do (seen on a real run).
const LOOK_LIST = /^(observe|note|see|look at|review|identify|view|check)\s+(the\s+)?[^:]{1,50}:\s*[^,]+(,[^,]+){2,}$/i
// "The dashboard displays a table with columns ...": a description of the
// screen, not an action (seen on a real run). Dropped when the part has real
// actions; a part with only descriptions keeps them, so it is not left empty.
const DESCRIBES = /^(the|there|this|it|its)\b[^.]{0,90}?\b(shows?|displays?|is|are|provides?|compares?|prompts?|contains?|lists?|indicates?|appears?)\b/i
function dropDescriptions(steps) {
  const acts = steps.filter((s) => !DESCRIBES.test(s))
  return acts.length ? acts : steps
}

// "Select the 'Dam 0' option. Select the 'Segment' option. Select the ...":
// the screen's options read out in one line (seen on a real run)
const ONE_LINE_TOUR = (s) => (String(s).match(/(^|[.;]\s*)(select|click|choose|open|observe|view|review|note)\s+the\s+['"‘“][^'"’”]{1,40}['"’”]/gi) || []).length >= 4

function dropFieldTour(steps) {
  const out = []
  for (let i = 0; i < steps.length;) {
    let j = i
    while (j < steps.length && LOOK.test(steps[j])) j++
    if (j - i >= 3) { i = j; continue }
    if (LOOK_LIST.test(steps[i]) || ONE_LINE_TOUR(steps[i])) { i++; continue }
    out.push(steps[i]); i++
  }
  return out
}

// "Enter 'For example put this enter press put this' into the field": a spoken
// sentence taken as the value (seen on a real run). A long value none of whose
// words is on the screen is dropped; short values and values seen on screen stay.
const SPOKEN_FILLER = new Set("put this that here there it we you have to for the a an and so now just like ok okay example press enter click".split(" "))
function dropSpokenValues(steps, screen = "") {
  const seen = (screen || "").toLowerCase()
  return steps.filter((a) => {
    // "I already have one report open": the speaker, never an instruction
    if (/^I\s+(?!\.)/.test(a)) return false
    const v = a.match(/^(?:enter|type|put|input|write)\s+['"‘“]([^'"’”]+)['"’”]/i)?.[1]
    if (!v) return true
    // "put this", "We have to Fill for period": speech, not something to type
    const words = v.toLowerCase().match(/[a-z]+/g) || []
    if (words.length >= 2 && (/^(we|you|i|it)$/.test(words[0]) || words.every((w) => SPOKEN_FILLER.has(w)))) return false
    if (words.length < 5 || !seen) return true
    return (v.toLowerCase().match(/[a-z]{4,}/g) || []).some((w) => seen.includes(w))
  })
}

// A run of 4+ actions that differ only in a quoted name ("Expand the 'X' node"
// for every folder in a menu tree), none of whose names was said, is the model
// reading a list off the screen, not what the user did. Seen on a real run; a
// prompt rule alone did not stop it. For opening tree folders ("Expand",
// "Collapse") 3 are enough: a later run read just 3 folders off the menu tree.
const TREE = /^(expand|collapse)\b/
function dropScreenLists(steps, spoken = "") {
  // a part with no speech is checked too, but only long runs (5+) count there
  const said = (spoken || "").toLowerCase()
  const silent = !said.trim()
  const shape = (a) => a.replace(QUOTED, "'_'").toLowerCase().replace(/\s+/g, " ").trim()
  const name = (a) => ([...a.matchAll(QUOTED)][0]?.[1] || "").toLowerCase()
  const out = []
  for (let i = 0; i < steps.length;) {
    let j = i + 1
    while (j < steps.length && name(steps[i]) && shape(steps[j]) === shape(steps[i])) j++
    const run = steps.slice(i, j)
    const listed = run.length >= (silent ? 5 : TREE.test(shape(steps[i])) ? 3 : 4) && run.every((a) => name(a) && !said.includes(name(a)))
    if (!listed) out.push(...run)
    i = j
  }
  // The same tree, written without quote marks and in mixed words ("Open the
  // Favorites panel. | Expand the Main Menu node. | Expand the ... node"):
  // 3+ such lines in a row whose names were never said are dropped too.
  const TREE_LINE = /^(?:open|expand|collapse) the (.+?) (?:node|folder|panel)\b/i
  const kept = []
  for (let i = 0; i < out.length;) {
    let j = i
    while (j < out.length && TREE_LINE.test(out[j])) j++
    const run = out.slice(i, Math.max(j, i + 1))
    // 8 folders in a row on a real run, one of them ("Main Menu") said aloud:
    // a long run is a read-out even when one name was said
    const saidN = j - i ? run.filter((a) => said.includes(a.match(TREE_LINE)[1].replace(/['"‘’“”]/g, "").toLowerCase())).length : 0
    const tree = j - i >= 5 ? saidN <= 1 : j - i >= 3 && !silent && saidN === 0
    if (!tree) kept.push(...run)
    i += run.length
  }
  // a part that was only a read-out keeps its first line, so it is not empty
  return kept.length ? kept : out.length ? out.slice(0, 1) : steps.slice(0, 1)
}

// A note about what to ignore ("the speaker mentions a test system, which is
// irrelevant to the procedure") tells the reader nothing they can use.
// A note that only reports the talk ("The speaker mentions ...", "The presenter
// is demonstrating ...") repeats the video instead of helping the reader.
export const tidyNote = (note = "") =>
  /\b(irrelevant|not relevant|unrelated to)\b/i.test(note) || /^\W*the (speaker|presenter|narrator|host|user in the video)\b/i.test(note) ? "" : note

// ── The screen's spelling of names ──
// A quoted name that is almost what the screen shows ('date viewer' heard,
// "Data Viewer" on the button) takes the screen's spelling: every word may
// be at most one letter off (short words must match), two letters in total.
const lev = (a, b) => {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i
    for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t }
  }
  return d[b.length]
}
export function screenNames(steps, screen = "") {
  const words = (screen.match(/[A-Za-z][A-Za-z0-9&/-]*/g) || [])
  if (!words.length) return steps
  const low = screen.toLowerCase()
  const fix = (name) => {
    const w = name.split(/\s+/)
    if (w.length > 5 || name.length < 4) return name
    // only names the screen does not show as they are; one word alone must be
    // long (a 4-letter word one letter off is another word: Cost, Most)
    if (low.includes(name.toLowerCase()) || (w.length === 1 && name.length < 7)) {
      const at = low.indexOf(name.toLowerCase())
      return at >= 0 ? screen.slice(at, at + name.length) : name // the screen's capitals
    }
    let best = null
    for (let i = 0; i + w.length <= words.length; i++) {
      let total = 0
      for (let k = 0; k < w.length && total <= 2; k++) {
        const a = w[k].toLowerCase(), b = words[i + k].toLowerCase()
        const d = a === b ? 0 : a.length >= 4 && Math.abs(a.length - b.length) <= 1 ? lev(a, b) : 9
        total += d > 1 ? 9 : d
      }
      // with several words, at least one must be exactly the same
      const same = w.some((x, k) => x.toLowerCase() === words[i + k].toLowerCase())
      if (total <= 2 && (w.length === 1 || same) && (!best || total < best.total)) best = { total, text: words.slice(i, i + w.length).join(" ") }
      if (best?.total === 0) break
    }
    return best ? best.text : name
  }
  return (steps || []).map((a) => a.replace(QUOTED, (m, name) => m.replace(name, fix(name.trim()))))
}

// ── The screen's spelling of numbers ──
// A number written in an action ("4" heard as a digit, "4502188" heard for the
// "4502168" on screen) takes the form the screen shows most often across all
// frames: one OCR slip on one frame is outvoted by the frames that read it right.
// A 4-digit value that has a real year among its look-alikes is that year
// (OCR reads 2024 as 2624 or 2824 on dark screens).
export function screenCounts(frameTexts) {
  const counts = new Map()
  for (const f of frameTexts || []) {
    // dates and times are not values: the taskbar clock ("10/16/2026", "4:45 PM")
    // is in every frame and once outvoted a fiscal year
    const text = (f.text || "").replace(/\b\d{1,4}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ").replace(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/gi, " ")
    for (const n of new Set(text.match(/\b\d{3,}\b/g) || [])) counts.set(n, (counts.get(n) || 0) + 1)
  }
  return counts
}

const YEAR = /^(19[5-9]\d|20\d\d)$/
// A number read clearly on screen (2+ frames) stays as it is: only a number the
// screen does not show (heard, or misread once) takes the screen's spelling,
// same length first. (A looser vote turned "8800" into the "880" that sits in
// every item number on that screen.)
export function screenSpelling(steps, counts) {
  if (!counts?.size) return steps
  const best = (n) => {
    const twins = [...counts].filter(([x]) => x !== n && Math.abs(x.length - n.length) <= 1 && near(x, n))
    if (n.length === 4 && !YEAR.test(n)) {
      const year = twins.filter(([x]) => x.length === 4 && YEAR.test(x)).sort((a, b) => b[1] - a[1])[0]
      if (year) return year[0]
    }
    if ((counts.get(n) || 0) >= 2) return n
    const cand = twins.filter(([, k]) => k >= 2)
      .sort((a, b) => ((b[0].length === n.length) - (a[0].length === n.length)) || b[1] - a[1])[0]
    return cand ? cand[0] : n
  }
  return (steps || []).map((a) => a.replace(/\b\d{3,}\b/g, best))
}
