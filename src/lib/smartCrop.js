// Smart screenshots: find WHERE the action happened by diffing the frame just
// before a step against the step's evidence frame, then return a zoomed crop of
// the changed region with a highlight box. Runs entirely on canvas — no model.
//
// The reader gets "click exactly HERE", which is what makes a document beat
// rewatching the video. Conservative by design: when the whole screen changed
// (navigation, new page) or nothing measurable changed, it returns null and the
// caller keeps the normal full screenshot.

const GRID_W = 48, GRID_H = 27          // diff resolution (16:9-ish cells)
const CELL_THRESHOLD = 14               // mean luminance delta for a "changed" cell
const MIN_CELLS = 3                     // fewer → noise, no crop
const MAX_CELL_FRACTION = 0.45          // more → scene change, full frame is right
const PAD_FRACTION = 0.16               // context margin around the changed region
const MIN_CROP_W = 320                  // never crop tighter than this (px, source scale)

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function luminanceGrid(img, canvas) {
  canvas.width = GRID_W; canvas.height = GRID_H
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, GRID_W, GRID_H)
  const { data } = ctx.getImageData(0, 0, GRID_W, GRID_H)
  const g = new Float32Array(GRID_W * GRID_H)
  for (let i = 0; i < GRID_W * GRID_H; i++) {
    g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return g
}

// Returns { dataUrl } or null when a zoom crop would not help.
export async function smartCrop(beforeDataUrl, afterDataUrl) {
  if (!beforeDataUrl || !afterDataUrl || beforeDataUrl === afterDataUrl) return null
  try {
    const [before, after] = await Promise.all([loadImage(beforeDataUrl), loadImage(afterDataUrl)])
    const work = document.createElement("canvas")
    const a = luminanceGrid(before, work)
    const b = luminanceGrid(after, work)

    // Changed cells + their bounding box
    let minX = GRID_W, minY = GRID_H, maxX = -1, maxY = -1, changed = 0
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      const i = y * GRID_W + x
      if (Math.abs(a[i] - b[i]) >= CELL_THRESHOLD) {
        changed++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    if (changed < MIN_CELLS) return null                          // nothing localised happened
    if (changed > GRID_W * GRID_H * MAX_CELL_FRACTION) return null // whole screen changed

    // Map grid box → source pixels, pad for context, clamp
    const W = after.width, H = after.height
    const cellW = W / GRID_W, cellH = H / GRID_H
    let x0 = minX * cellW, y0 = minY * cellH
    let x1 = (maxX + 1) * cellW, y1 = (maxY + 1) * cellH
    const padX = Math.max((x1 - x0) * PAD_FRACTION, W * 0.03)
    const padY = Math.max((y1 - y0) * PAD_FRACTION, H * 0.03)
    x0 = Math.max(0, x0 - padX); y0 = Math.max(0, y0 - padY)
    x1 = Math.min(W, x1 + padX); y1 = Math.min(H, y1 + padY)
    // Keep a readable minimum size (tiny crops of dense UIs are useless)
    if (x1 - x0 < MIN_CROP_W) {
      const cx = (x0 + x1) / 2
      x0 = Math.max(0, cx - MIN_CROP_W / 2); x1 = Math.min(W, x0 + MIN_CROP_W)
    }
    const minH = (x1 - x0) * 0.5
    if (y1 - y0 < minH) {
      const cy = (y0 + y1) / 2
      y0 = Math.max(0, cy - minH / 2); y1 = Math.min(H, y0 + minH)
    }
    // If the crop still covers >60% of the original image it adds no value over
    // the main screenshot — the "zoomed" label would be misleading. Return null
    // and let the caller show only the full frame.
    if ((x1 - x0) * (y1 - y0) > W * H * 0.60) return null

    // Draw the crop and the highlight box around the ORIGINAL (unpadded) change
    const out = document.createElement("canvas")
    const scale = Math.min(2, 900 / (x1 - x0)) // upscale small crops for readability, cap 2x
    out.width = Math.round((x1 - x0) * scale)
    out.height = Math.round((y1 - y0) * scale)
    const ctx = out.getContext("2d")
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(after, x0, y0, x1 - x0, y1 - y0, 0, 0, out.width, out.height)

    const hx = (minX * cellW - x0) * scale
    const hy = (minY * cellH - y0) * scale
    const hw = ((maxX + 1 - minX) * cellW) * scale
    const hh = ((maxY + 1 - minY) * cellH) * scale
    ctx.strokeStyle = "rgba(245,158,11,0.95)" // amber, readable on light and dark UIs
    ctx.lineWidth = Math.max(2, out.width * 0.004)
    ctx.strokeRect(hx, hy, hw, hh)

    return { dataUrl: out.toDataURL("image/jpeg", 0.8) }
  } catch { return null } // never let a crop failure block annotation
}
