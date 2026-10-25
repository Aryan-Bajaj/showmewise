// Draws step markers onto a screenshot: a box around the exact control, a
// numbered badge, and a label bubble ("1  Click + New dashboard") joined to the
// box by a short leader line. One drawing routine for stills, clips and GIFs,
// so every export marks the screen the same way.

export const MARK = {
  accent: "#6d4aff",   // ShowMeWise violet, readable on light and dark UIs
  accentDark: "#4b2fd1",
  text: "#ffffff",
  halo: "rgba(109,74,255,0.18)",
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// callouts: [{ n, label, box: {x0,y0,x1,y1} }] in SOURCE pixels; sx/sy scale them
// onto the canvas. W/H = canvas size. alpha fades markers in clips.
// inkAt(rect) → 0..1: how much text or detail lies under a rect of the picture
// (optional; without it the first free spot is taken, as for clip overlays).
export function drawCallouts(ctx, callouts, { sx = 1, sy = 1, W, H, alpha = 1, inkAt = null } = {}) {
  if (!callouts?.length) return
  const u = Math.max(0.7, Math.min(2.2, W / 1050)) // marker size follows the image size
  const placed = []
  ctx.save()
  ctx.globalAlpha = alpha
  for (const c of callouts) {
    const pad = 6 * u
    const bx = c.box.x0 * sx - pad, by = c.box.y0 * sy - pad
    const bw = (c.box.x1 - c.box.x0) * sx + pad * 2, bh = (c.box.y1 - c.box.y0) * sy + pad * 2
    placed.push({ x: bx, y: by, w: bw, h: bh })

    // soft halo + crisp outline around the control
    ctx.fillStyle = MARK.halo
    roundRect(ctx, bx, by, bw, bh, 6 * u); ctx.fill()
    ctx.lineWidth = 3 * u; ctx.strokeStyle = MARK.accent
    roundRect(ctx, bx, by, bw, bh, 6 * u); ctx.stroke()

    // label bubble: right of the box if it fits, else left, else below
    const fs = Math.round(15 * u)
    ctx.font = `600 ${fs}px "Segoe UI", system-ui, sans-serif`
    const r = 11 * u
    const tw = ctx.measureText(c.label).width
    const pw = r * 2 + 10 * u + tw + 14 * u, ph = Math.max(r * 2 + 8 * u, fs + 14 * u)
    const gap = 26 * u
    const opts = [
      { x: bx + bw + gap, y: by + bh / 2 - ph / 2 },
      { x: bx - gap - pw, y: by + bh / 2 - ph / 2 },
      { x: bx, y: by + bh + gap * 0.6 },
      { x: bx, y: by - gap * 0.6 - ph },
      { x: bx + bw + gap, y: by + bh + gap * 0.6 },
      { x: bx + bw + gap, y: by - gap * 0.6 - ph },
      { x: bx - gap - pw, y: by + bh + gap * 0.6 },
      { x: bx - gap - pw, y: by - gap * 0.6 - ph },
    ].map((p) => ({ ...p, w: pw, h: ph }))
    const fits = opts.filter((p) => p.x >= 4 && p.x + p.w <= W - 4 && p.y >= 4 && p.y + p.h <= H - 4 && !placed.some((q) => overlaps(p, q)))
    // A label never covers what the reader needs: with the picture at hand,
    // take the spot with the least text or detail under it (in this order of
    // preference when spots are equally empty); else the first spot that fits.
    const best = inkAt && fits.length > 1
      ? fits.map((p, i) => ({ p, s: inkAt(p) + i * 0.01 })).sort((a, b) => a.s - b.s)[0].p
      : fits[0]
    let pill = best
      || { ...opts[0], x: Math.max(4, Math.min(W - pw - 4, opts[0].x)), y: Math.max(4, Math.min(H - ph - 4, opts[0].y)) }
    for (let k = 0; k < 6 && placed.some((q) => overlaps(pill, q)); k++) pill = { ...pill, y: Math.min(H - ph - 4, pill.y + ph + 6 * u) }
    placed.push(pill)

    // leader line from the box edge to the bubble
    const fromX = pill.x > bx + bw ? bx + bw : pill.x + pill.w < bx ? bx : bx + bw / 2
    const fromY = pill.y > by + bh ? by + bh : pill.y + pill.h < by ? by : by + bh / 2
    const toX = pill.x > bx + bw ? pill.x : pill.x + pill.w < bx ? pill.x + pill.w : pill.x + r + 4 * u
    const toY = pill.y + ph / 2
    ctx.lineWidth = 2 * u; ctx.strokeStyle = MARK.accent
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke()

    // bubble + number badge + text
    ctx.shadowColor = "rgba(20,10,60,0.35)"; ctx.shadowBlur = 8 * u; ctx.shadowOffsetY = 2 * u
    ctx.fillStyle = MARK.accent
    roundRect(ctx, pill.x, pill.y, pill.w, pill.h, ph / 2); ctx.fill()
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    const cx = pill.x + 5 * u + r, cy = pill.y + ph / 2
    ctx.fillStyle = MARK.text
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = MARK.accentDark
    ctx.font = `800 ${Math.round(13 * u)}px "Segoe UI", system-ui, sans-serif`
    ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.fillText(String(c.n), cx, cy + 0.5)
    ctx.fillStyle = MARK.text
    ctx.font = `600 ${fs}px "Segoe UI", system-ui, sans-serif`
    ctx.textAlign = "left"
    ctx.fillText(c.label, cx + r + 8 * u, cy + 0.5)
  }
  ctx.restore()
}

// Share of sampled pixels under a rect that differ clearly from that rect's
// usual background: text, icons and borders count, a plain panel does not.
// Read once from the clean picture, before any marker is drawn on it.
export function inkMeter({ data, width, height }) {
  const lum = (i) => data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  return (r) => {
    const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y))
    const x1 = Math.min(width, Math.ceil(r.x + r.w)), y1 = Math.min(height, Math.ceil(r.y + r.h))
    const vals = []
    for (let y = y0; y < y1; y += 3) for (let x = x0; x < x1; x += 3) vals.push(lum((y * width + x) * 4))
    if (!vals.length) return 1
    const bg = [...vals].sort((a, b) => a - b)[vals.length >> 1] // the median is the background
    return vals.filter((v) => Math.abs(v - bg) > 28).length / vals.length
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Still screenshot with its markers burned in → JPEG data URL (+ size).
export async function renderShot(imageData, callouts, { maxW = 1600 } = {}) {
  const img = await loadImage(imageData)
  const scale = Math.min(maxW / img.width, 1.5)
  const W = Math.round(img.width * scale), H = Math.round(img.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext("2d")
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, W, H)
  drawCallouts(ctx, callouts, { sx: scale, sy: scale, W, H, inkAt: inkMeter(ctx.getImageData(0, 0, W, H)) })
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), width: W, height: H }
}

// Which markers belong on screen at video time t? Each shot's markers show from
// just before its frame until the next shot (at most 4 s), fading in.
export function calloutsAt(shots, t, srcW, canvasW) {
  if (!shots?.length) return null
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i]
    const end = Math.min(shots[i + 1]?.ts ?? Infinity, s.ts + 4)
    if (t >= s.ts - 0.6 && t < end) {
      const alpha = Math.min(1, (t - (s.ts - 0.6)) / 0.35)
      return { shot: s, callouts: s.callouts, alpha, scale: canvasW / (s.srcW || srcW || canvasW) }
    }
  }
  return null
}

// Clip/GIF overlay: draws the active shot's markers and takes them down the
// moment the screen changes (the click opened a dialog, a new page loaded), so
// a marker never points at a screen it no longer belongs to.
export function markerOverlay(shots, srcW, W, H) {
  if (!shots?.length) return null
  const g = document.createElement("canvas")
  g.width = 32; g.height = 18
  const gx = g.getContext("2d", { willReadFrequently: true })
  const grid = (canvas) => {
    gx.drawImage(canvas, 0, 0, 32, 18)
    const d = gx.getImageData(0, 0, 32, 18).data, out = new Float32Array(32 * 18)
    for (let i = 0; i < out.length; i++) out[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
    return out
  }
  const state = shots.map(() => ({ ref: null, ended: false }))
  return (ctx, t) => {
    const on = calloutsAt(shots, t, srcW, W)
    if (!on) return
    const i = shots.indexOf(on.shot)
    const st = state[i]
    if (st.ended) return
    const now = grid(ctx.canvas)
    if (!st.ref) st.ref = now
    else {
      let diff = 0
      for (let k = 0; k < now.length; k++) diff += Math.abs(now[k] - st.ref[k])
      if (diff / now.length > 12) { st.ended = true; return }
    }
    drawCallouts(ctx, on.callouts, { sx: on.scale, sy: on.scale, W, H, alpha: on.alpha })
  }
}
