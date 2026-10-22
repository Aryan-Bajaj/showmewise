// Finds the mouse pointer (the standard white arrow) in a frame, and names what
// was clicked when a new window opens right after. The tools do this, not the
// AI: the screen shows where the pointer was and which window opened.
//
// Two looks: the white arrow on a dark area (dark apps, toolbars), and the
// black edge of the arrow on a light page (most apps). No pointer found means
// nothing is added (never a guess).

// gray: luminance 0..255 per pixel (Uint8Array, row by row), w × h.
// Returns { x, y } of the arrow tip, or null.
export function findPointer(gray, w, h, opts = {}) {
  return findPointers(gray, w, h, opts)[0] || null
}

// Every arrow-shaped spot, best first ({ x, y, score }).
export function findPointers(gray, w, h, opts = {}) {
  const all = [...findWhiteArrows(gray, w, h, opts), ...findArrowEdges(gray, w, h)]
  return all.filter((p, i) => all.findIndex((q) => Math.abs(q.x - p.x) <= 3 && Math.abs(q.y - p.y) <= 3) === i).sort((a, b) => b.score - a.score)
}

// The arrow on a light page: its black edge is one thin dark patch. Straight
// left side, a slanted right side that widens evenly from the tip, light inside.
// Letters fail one of these ("k" widens in a jump, "A" has no straight side).
function findArrowEdges(gray, w, h, dark = 95) {
  const seen = new Uint8Array(w * h)
  const stack = []
  const found = []
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || gray[start] > dark) continue
    const px = []
    stack.push(start); seen[start] = 1
    while (stack.length) {
      const p = stack.pop()
      if (px.length <= 500) px.push(p)
      const x = p % w, y = (p - x) / w
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && !seen[q] && gray[q] <= dark) { seen[q] = 1; stack.push(q) }
      }
    }
    if (px.length < 30 || px.length > 400) continue
    let x0 = w, y0 = h, x1 = 0, y1 = 0
    for (const p of px) { const x = p % w, y = (p - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1
    if (bh < 12 || bh > 44 || bw < 8 || bw > 30 || bh / bw < 1.2 || bh / bw > 2.6) continue
    if (px.length / (bw * bh) > 0.5) continue // an edge, not a filled shape
    const left = new Array(bh).fill(w), right = new Array(bh).fill(-1)
    for (const p of px) { const x = p % w, r = (p - x) / w - y0; if (x < left[r]) left[r] = x; if (x > right[r]) right[r] = x }
    const top = Math.floor(bh * 0.6)
    let lmin = w, lmax = 0
    for (let r = 0; r < top; r++) { if (left[r] < lmin) lmin = left[r]; if (left[r] > lmax) lmax = left[r] }
    if (lmax - lmin > 2 || right[0] - left[0] > 3) continue
    // the right side: about the same step every row (a straight slant)
    const slope = (right[top - 1] - right[0]) / Math.max(1, top - 1)
    if (slope < 0.45 || slope > 1.2) continue
    let off = 0
    for (let r = 0; r < top; r++) off = Math.max(off, Math.abs(right[r] - (right[0] + slope * r)))
    if (off > 2.5) continue
    // light inside, between the two sides
    let inside = 0, n = 0
    for (let r = 3; r < top; r++) for (let x = left[r] + 2; x < right[r] - 1; x++) { inside += gray[(y0 + r) * w + x]; n++ }
    if (n < 8 || inside / n < 170) continue
    found.push({ x: left[0], y: y0, score: Math.round((inside / n) * 0.7 - off * 10) })
  }
  return found
}

function findWhiteArrows(gray, w, h, { bright = 190 } = {}) {
  const seen = new Uint8Array(w * h)
  const stack = []
  const found = []
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || gray[start] < bright) continue
    // one patch of bright pixels (gives up when it is larger than any pointer)
    const px = []
    stack.push(start); seen[start] = 1
    while (stack.length) {
      const p = stack.pop()
      if (px.length <= 400) px.push(p)
      const x = p % w, y = (p - x) / w
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && !seen[q] && gray[q] >= bright) { seen[q] = 1; stack.push(q) }
      }
    }
    if (px.length < 25 || px.length > 300) continue
    let x0 = w, y0 = h, x1 = 0, y1 = 0
    for (const p of px) { const x = p % w, y = (p - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1
    if (bh < 9 || bh > 34 || bw < 5 || bw > 22 || bh / bw < 1.25 || bh / bw > 2.6) continue
    const fill = px.length / (bw * bh)
    if (fill < 0.28 || fill > 0.7) continue
    // row by row: a straight left edge, narrow at the top, widening downwards
    const left = new Array(bh).fill(w), right = new Array(bh).fill(-1)
    for (const p of px) { const x = p % w, r = (p - x) / w - y0; if (x < left[r]) left[r] = x; if (x > right[r]) right[r] = x }
    const top = Math.max(3, Math.floor(bh * 0.6))
    let lmin = w, lmax = 0
    for (let r = 0; r < top; r++) { if (left[r] < lmin) lmin = left[r]; if (left[r] > lmax) lmax = left[r] }
    if (lmax - lmin > 2) continue
    const width = (r) => (right[r] >= left[r] ? right[r] - left[r] + 1 : 0)
    if (width(0) > 3 || width(Math.floor(bh * 0.55)) < bw * 0.5) continue
    // a solid triangle, not the stroke of a letter ("S" on a blue button):
    // the rows of the head are filled from edge to edge and grow downwards
    const rowCount = new Array(bh).fill(0)
    for (const p of px) rowCount[Math.floor(p / w) - y0]++
    let solid = true
    for (let r = 0; r < top; r++) {
      if (rowCount[r] < width(r) * 0.85 || (r >= 2 && width(r) < width(r - 2) - 1)) { solid = false; break }
    }
    if (!solid) continue
    // it stands out: the ring around it is clearly darker
    let ring = 0, n = 0
    for (let y = Math.max(0, y0 - 2); y <= Math.min(h - 1, y1 + 2); y++) {
      for (let x = Math.max(0, x0 - 2); x <= Math.min(w - 1, x1 + 2); x++) {
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue
        ring += gray[y * w + x]; n++
      }
    }
    if (!n || ring / n > 140) continue
    const score = (1 - Math.abs(fill - 0.45)) * (255 - ring / n)
    found.push({ x: left[0], y: y0, score: Math.round(score) })
  }
  return found
}

// Luminance from canvas RGBA pixels.
export function toGray(rgba, w, h) {
  const g = new Uint8Array(w * h)
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8
  return g
}

// What the pointer was on: the OCR word under or right next to the tip
// (words: [{ t, x0, y0, x1, y1 }] in the same pixel space), else null.
export function wordAt(words, pt, reach = 14) {
  let best = null, bd = Infinity
  for (const wd of words || []) {
    const dx = pt.x < wd.x0 ? wd.x0 - pt.x : pt.x > wd.x1 ? pt.x - wd.x1 : 0
    const dy = pt.y < wd.y0 ? wd.y0 - pt.y : pt.y > wd.y1 ? pt.y - wd.y1 : 0
    const d = Math.hypot(dx, dy)
    if (d <= reach && d < bd && /[a-z]{2,}/i.test(wd.t)) { best = wd; bd = d }
  }
  return best ? best.t : null
}

// The step line for a click that opened a window.
export function clickLine(pt, words, title, height) {
  const word = wordAt(words, pt)
  if (word && word.toLowerCase() !== title.toLowerCase()) return `Click '${word}' to open the '${title}' window.`
  if (word) return `Click '${title}'.`
  return pt.y < height * 0.2 ? `Click the toolbar icon that opens the '${title}' window.` : `Click the icon that opens the '${title}' window.`
}

// Spots that look like a pointer but never move (a logo, a webcam tile) are
// not the pointer. pts: candidate lists from several frames across the video.
export function staticSpots(lists, share = 0.4) {
  const all = lists.flat()
  return all.filter((p, i) => all.findIndex((q) => Math.abs(q.x - p.x) <= 3 && Math.abs(q.y - p.y) <= 3) === i)
    .filter((p) => lists.filter((l) => l.some((q) => Math.abs(q.x - p.x) <= 3 && Math.abs(q.y - p.y) <= 3)).length >= Math.max(2, lists.length * share))
}

export const notStatic = (cands, spots) => cands.filter((c) => !spots.some((s) => Math.abs(s.x - c.x) <= 3 && Math.abs(s.y - c.y) <= 3))

// Browser only: a frame (JPEG data URL) as gray pixels.
export async function grayFromDataUrl(url) {
  const bmp = await createImageBitmap(await (await fetch(url)).blob())
  const c = new OffscreenCanvas(bmp.width, bmp.height)
  const ctx = c.getContext("2d")
  ctx.drawImage(bmp, 0, 0)
  const { width: w, height: h } = bmp
  bmp.close?.() // free the picture at once (300 frames on a 10-minute video)
  const { data } = ctx.getImageData(0, 0, w, h)
  return { gray: toGray(data, w, h), w, h }
}

// Did the screen change around the pointer between two frames (the pointer
// itself left out)? A click on a tick box, a tab or a row changes the area
// right around it. r: half the box looked at, skip: the pointer's own area.
export function changedNear(g1, g2, w, h, pt, r = 110, skip = 30) {
  let diff = 0, n = 0
  for (let y = Math.max(0, pt.y - r); y < Math.min(h, pt.y + r); y += 2) {
    for (let x = Math.max(0, pt.x - r); x < Math.min(w, pt.x + r); x += 2) {
      if (x >= pt.x - 4 && x < pt.x + skip && y >= pt.y - 4 && y < pt.y + skip * 1.4) continue
      const i = y * w + x
      if (Math.abs(g1[i] - g2[i]) > 40) diff++
      n++
    }
  }
  return { count: diff, frac: n ? diff / n : 0 }
}

// Clicks where no window opens: the pointer rests on the same spot in two
// frames in a row while the area around it changes, and a word is under it.
// frames: [{ t, gray, w, h, pts }] in time order; wordsAt(t) gives OCR words.
export function restClicks(frames, wordsAt, spots = []) {
  const out = []
  for (let i = 0; i + 1 < frames.length; i++) {
    const a = frames[i], b = frames[i + 1]
    const pa = notStatic(a.pts, spots)[0], pb = notStatic(b.pts, spots)[0]
    if (!pa || !pb || Math.abs(pa.x - pb.x) > 6 || Math.abs(pa.y - pb.y) > 6 || a.w !== b.w) continue
    const ch = changedNear(a.gray, b.gray, a.w, a.h, pa)
    if (ch.count < 20 || ch.frac > 0.5) continue // a small change near it, not a new page
    const word = wordAt(wordsAt(a.t), pa)
    if (!word || word.length < 3) continue
    if (out.length && out[out.length - 1].word === word && b.t - out[out.length - 1].t < 6) continue
    out.push({ t: b.t, word, line: `Click '${word}'.` })
  }
  return out
}
