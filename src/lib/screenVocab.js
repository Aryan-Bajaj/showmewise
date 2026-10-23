// The screen as a dictionary for the transcript. Speech recognition does not
// know an app's abbreviations and codes, so "KBI report" is heard for the
// "KPI Report" on screen, "gel account" for "G/L Account", "mn21n" for "ME21N".
// Where a spoken phrase sounds like such a term read on screen, it takes the
// screen's spelling.
// Safety: only terms that hold a real abbreviation or code (2+ capitals in a
// row, "G/L", or letters with digits) are used, seen on 2+ frames, so ordinary
// words are never "corrected" into an OCR misread. (Tested on a real recording:
// a looser rule turned "from" into the OCR noise "FromF".)

const SPECIAL = /\b[A-Z]{2,}[A-Z0-9]*\b|\b[A-Z]\/[A-Z]\b|\b(?=\w*\d)(?=\w*[A-Za-z])\w{3,}\b/ // KPI, G/L, ME21N
const TOKEN = /[A-Za-z0-9/]+/g

// sound-alike letters count as one: g/j, c/k/q, s/z, v/w, ph/f
const canon = (t) => (t || "").toLowerCase().replace(/ph/g, "f").replace(/[^a-z0-9]/g, "")
  .replace(/[gj]/g, "g").replace(/[ckq]/g, "k").replace(/[sz]/g, "s").replace(/[vw]/g, "v")

function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = t
    }
  }
  return d[b.length]
}

// OCR frames → special terms (1 to 3 words) seen on at least 2 frames
export function screenVocab(frameTexts) {
  const seen = new Map()
  for (const f of frameTexts || []) {
    const inFrame = new Set()
    for (const line of (f.text || "").split(/\n|\s{2,}|[:;|()[\]]/)) {
      const w = line.match(TOKEN) || []
      for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= w.length; i++) {
        const term = w.slice(i, i + n).join(" ")
        if (!SPECIAL.test(term) || !/[A-Za-z]{2}/.test(term) || canon(term).length < 3) continue
        if (n > 1 && w.slice(i, i + n).some((x) => x.length < 2)) continue
        inFrame.add(term)
      }
    }
    for (const t of inFrame) seen.set(t, (seen.get(t) || 0) + 1)
  }
  return [...seen].filter(([, c]) => c >= 2).map(([t]) => t)
}

// One transcript line → the line with sound-alike phrases replaced
// loose (the user's own key words): a code may also be one digit off ("ME211N" heard for ME21N)
export function fixWithVocab(text, vocab, { loose = false } = {}) {
  if (!text || !vocab?.length) return text
  const terms = vocab.map((t) => ({ t, c: canon(t), n: t.split(" ").length }))
  const words = text.split(/(\s+)/) // keep the spaces
  const idx = words.map((w, i) => (w.trim() ? i : -1)).filter((i) => i >= 0)
  const out = [...words]
  for (let k = 0; k < idx.length; k++) {
    for (let n = 3; n >= 1; n--) {
      if (k + n > idx.length) continue
      const span = idx.slice(k, k + n)
      const said = span.map((i) => words[i]).join(" ")
      const c = canon(said)
      if (c.length < (loose ? 2 : 3) || /\d/.test(said) !== /\d/.test(c)) continue
      let best = null
      for (const term of terms) {
        // the same word: skipped, unless it is the user's word in other capitals
        if (term.n !== n || (term.c === c && !(loose && said.replace(/[^A-Za-z0-9 ]/g, "") !== term.t))) continue
        if (term.c[0] !== c[0]) continue // the first sound must match
        if (/\d/.test(term.c) && term.c.replace(/\D/g, "") !== c.replace(/\D/g, "") && !(loose && lev(term.c.replace(/\D/g, ""), c.replace(/\D/g, "")) <= 1)) continue // codes keep their digits
        const d = lev(c, term.c)
        if (d <= Math.min(2, Math.floor(Math.max(c.length, term.c.length) / 4)) && (!best || d < best.d)) best = { term, d }
      }
      if (!best) continue
      const last = words[span[n - 1]]
      const tail = (last.match(/['"’”).,!?]+$/) || [""])[0]
      const lead = (words[span[0]].match(/^['"‘“(]+/) || [""])[0]
      const plural = /[a-z]s[.,!?]*$/.test(last) && !/s$/i.test(best.term.t) ? "s" : ""
      out[span[0]] = lead + best.term.t + plural + tail
      for (let j = 1; j < n; j++) { out[span[j]] = ""; out[span[j] - 1] = "" }
      k += n - 1
      break
    }
  }
  const fixed = out.join("").replace(/\s{2,}/g, " ")
  return out.some((w, i) => w !== words[i]) ? fixed : text
}

export function fixChunksWithScreen(chunks, frameTexts, userTerms = []) {
  const vocab = screenVocab(frameTexts)
  if (!vocab.length && !userTerms.length) return chunks
  // the user's own words first (looser), then the screen's
  return (chunks || []).map((c) => ({ ...c, text: fixWithVocab(userTerms.length ? fixWithVocab(c.text, userTerms, { loose: true }) : c.text, vocab) }))
}
