// Where is the actual screen in the recording? Meeting apps (Teams, Zoom, Meet)
// show the shared screen inside black margins with webcam tiles beside it. We
// find that rectangle once and cut every frame to it, so the OCR, the AI, the
// screenshots and the clips all see the app at full size, and never the webcam
// tile or a participant's name. A normal full-screen recording is left as is.

// One small frame (W x H luma) → { x0, y0, x1, y1 } as fractions.
function boxOf(luma, W, H) {
  const on = (x, y) => luma[y * W + x] > 14 // brighter than a black margin
  // the longest run of indices whose "on" share is above `lim`
  const run = (n, frac, lim = 0.35) => {
    let best = [0, 0], s = -1
    for (let i = 0; i <= n; i++) {
      const v = i < n ? frac(i) : 0
      if (v > lim && s < 0) s = i
      if (v <= lim && s >= 0) { if (i - s > best[1] - best[0]) best = [s, i]; s = -1 }
    }
    return best
  }
  const [x0, x1] = run(W, (x) => { let c = 0; for (let y = 0; y < H; y++) c += on(x, y); return c / H })
  if (x1 <= x0) return null
  const [y0, y1] = run(H, (y) => { let c = 0; for (let x = x0; x < x1; x++) c += on(x, y); return c / (x1 - x0) })
  if (y1 <= y0) return null
  return { x0: x0 / W, y0: y0 / H, x1: x1 / W, y1: y1 / H }
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

// Read `samples` frames from the video, return the crop in video pixels
// { x, y, w, h }, or null when the recording already fills the frame.
export async function detectContentBox(video, seek, samples = 8) {
  const W = 240, H = 135
  const c = document.createElement("canvas")
  c.width = W; c.height = H
  const ctx = c.getContext("2d", { willReadFrequently: true })
  const boxes = []
  for (let k = 1; k <= samples; k++) {
    if (!(await seek(video.duration * (k / (samples + 1))))) continue
    try {
      ctx.drawImage(video, 0, 0, W, H)
      const d = ctx.getImageData(0, 0, W, H).data
      const luma = new Uint8Array(W * H)
      for (let i = 0; i < W * H; i++) luma[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000
      const b = boxOf(luma, W, H)
      if (b) boxes.push(b)
    } catch { /* unreadable sample */ }
  }
  if (boxes.length < Math.ceil(samples / 2)) return null
  const b = { x0: median(boxes.map((q) => q.x0)), y0: median(boxes.map((q) => q.y0)), x1: median(boxes.map((q) => q.x1)), y1: median(boxes.map((q) => q.y1)) }
  const w = b.x1 - b.x0, h = b.y1 - b.y0
  // only cut when there is a real margin and the screen is most of the frame
  if (w * h < 0.35 || (w > 0.97 && h > 0.97)) return null
  const VW = video.videoWidth, VH = video.videoHeight
  const x = Math.round(b.x0 * VW), y = Math.round(b.y0 * VH)
  return { x, y, w: Math.round(b.x1 * VW) - x, h: Math.round(b.y1 * VH) - y }
}

export { boxOf }
