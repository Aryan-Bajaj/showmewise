// Key words the user types before a run ("FS10N, CJ88, Weekly Overview").
// They fix how speech recognition heard them (CJ888 → CJ88), are spelled
// exactly like this in the guide, and a part where one is said or shown must
// mention it. Everything else in the guide still comes from the video.
import { fixWithVocab } from "./screenVocab.js"

export const parseTerms = (s) => [...new Set(String(s || "").split(/[,;\n]/).map((x) => x.trim().replace(/\s+/g, " ")).filter((x) => x.length >= 2 && x.length <= 60))].slice(0, 40)

const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "")

// the user's words that occur in this text (said or on screen)
export const termsIn = (text, terms) => {
  const t = squash(text)
  return (terms || []).filter((w) => squash(w).length >= 2 && t.includes(squash(w)))
}

// a line with near-misses of the user's words in their spelling
export const userSpelling = (line, terms) => (terms?.length && typeof line === "string" ? fixWithVocab(line, terms, { loose: true }) : line)
