// Common Whisper mis-hearings for this domain — applied to the transcript before
// annotation / insights so downstream text is right. Add more pairs as needed.
const FIXUPS = [
  [/\bcall (cent(?:er|re)s?)\b/gi, "cost $1"],   // "call center" → "cost center"
  [/\bcode (cent(?:er|re)s?)\b/gi, "cost $1"],   // "code center" → "cost center"
  [/\bcoast (cent(?:er|re)s?)\b/gi, "cost $1"],  // "coast center" → "cost center"
]

// Whisper loops on quiet audio: "and and and and", "the list of the list of
// the list of". A phrase of 1 to 4 words said 3+ times in a row is kept once.
const LOOP = /\b((?:[\w'-]+\s+){0,3}[\w'-]+)(?:[\s,.]+\1\b){2,}/gi

export function fixTranscriptText(text) {
  let t = text || ""
  for (const [re, rep] of FIXUPS) t = t.replace(re, rep)
  for (let i = 0, prev = ""; i < 3 && prev !== t; i++) { prev = t; t = t.replace(LOOP, "$1") }
  return t
}

const same = (a, b) => (a || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === (b || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

// …and repeats whole lines: "I am not sure." 27 times, one per second. A line
// that only repeats the line before it is dropped (the first one stays).
export function fixTranscriptChunks(chunks) {
  const out = []
  for (const c of chunks || []) {
    const text = fixTranscriptText(c.text)
    if (out.length && same(text, out[out.length - 1].text)) continue
    out.push({ ...c, text })
  }
  return out
}
