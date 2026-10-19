import { buildGuide, renderGuideShots, figureCaption } from "./guideModel"

// Process manual layout: cover with a details table, contents, then numbered
// sections. Steps are Part A, B, C… with A1, A2 badges and marked-up screenshots.
const C = {
  ink: [27, 22, 64], body: [52, 48, 78], muted: [120, 115, 150], line: [222, 218, 240],
  accent: [109, 74, 255], accentDark: [75, 47, 209], tint: [243, 240, 255], tint2: [250, 249, 255],
  ok: [15, 140, 100], tip: [34, 150, 190], tipBg: [234, 247, 252], warn: [200, 130, 10], warnBg: [255, 247, 230],
}

// jsPDF's built-in fonts only cover WinAnsi: map the rest to safe look-alikes.
const safe = (t) => String(t ?? "")
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[→➜]/g, "->")
  .replace(/[✓✔]/g, "").replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "")

export async function exportPDF(docs, videoName, meta = {}) {
  const { default: jsPDF } = await import("jspdf")
  const g = buildGuide(docs, meta)
  await renderGuideShots(g, { maxW: 1400 })
  const pdf = new jsPDF({ unit: "mm", format: "a4" })
  const W = 210, H = 297, M = 18, CW = W - M * 2, TOP = 24, BOTTOM = H - 20
  let y = TOP

  const font = (size, style = "normal", color = C.body) => { pdf.setFontSize(size); pdf.setFont("helvetica", style); pdf.setTextColor(...color) }
  const newPage = () => { pdf.addPage(); y = TOP }
  const ensure = (h) => { if (y + h > BOTTOM) newPage() }
  const lines = (text, w) => pdf.splitTextToSize(safe(text), w)
  const para = (text, { size = 10, style = "normal", color = C.body, x = M, w = CW, lh = 4.8, after = 2 } = {}) => {
    font(size, style, color)
    for (const ln of lines(text, w)) { ensure(lh); pdf.text(ln, x, y); y += lh }
    y += after
  }
  let sec = 0
  // keep: room for the heading AND what must follow it on the same page
  const section = (title, keep = 24) => {
    ensure(keep); y += 4
    sec++
    font(15, "bold", C.accent); pdf.text(`${sec}  ${safe(title)}`, M, y); y += 8
  }

  // A table with a coloured header row; rows grow with their text.
  const table = (cols, rows, { header = true, labelCol = false } = {}) => {
    const widths = cols.map((c) => c.w * CW)
    const pad = 2.6, lh = 4.4
    const drawRow = (cells, isHead, shade) => {
      font(isHead ? 9 : 9.3, isHead ? "bold" : "normal", isHead ? [255, 255, 255] : C.body)
      const wrapped = cells.map((c, i) => lines(c, widths[i] - pad * 2))
      const h = Math.max(...wrapped.map((w) => w.length)) * lh + pad * 2 - 1
      ensure(h)
      let x = M
      wrapped.forEach((wl, i) => {
        if (isHead) pdf.setFillColor(...C.accent)
        else if (labelCol && i === 0) pdf.setFillColor(...C.tint)
        else pdf.setFillColor(...(shade ? C.tint2 : [255, 255, 255]))
        pdf.rect(x, y, widths[i], h, "F")
        pdf.setDrawColor(...C.line); pdf.setLineWidth(0.2); pdf.rect(x, y, widths[i], h, "S")
        font(isHead ? 9 : 9.3, isHead || (labelCol && i === 0) ? "bold" : "normal", isHead ? [255, 255, 255] : labelCol && i === 0 ? C.ink : C.body)
        wl.forEach((ln, k) => pdf.text(ln, x + pad, y + pad + 3 + k * lh))
        x += widths[i]
      })
      y += h
    }
    if (header) drawRow(cols.map((c) => c.label), true, false)
    rows.forEach((r, i) => drawRow(r, false, i % 2 === 1))
    y += 4
  }

  const callout = (kind, text) => {
    const [bar, bg, label] = kind === "tip" ? [C.tip, C.tipBg, "Tip"] : [C.warn, C.warnBg, "Important"]
    font(9.3, "normal", C.body)
    const wl = lines(text, CW - 10)
    const h = wl.length * 4.4 + 10
    ensure(h)
    pdf.setFillColor(...bg); pdf.rect(M, y, CW, h, "F")
    pdf.setFillColor(...bar); pdf.rect(M, y, 1.4, h, "F")
    font(9, "bold", bar); pdf.text(label, M + 5, y + 5.5)
    font(9.3, "normal", C.body)
    wl.forEach((ln, k) => pdf.text(ln, M + 5, y + 10 + k * 4.4))
    y += h + 4
  }

  const badge = (id, x, yy) => {
    pdf.setFillColor(...C.accent); pdf.roundedRect(x, yy - 4.2, 10, 6, 1.2, 1.2, "F")
    font(8.5, "bold", [255, 255, 255]); pdf.text(id, x + 5, yy - 0.2, { align: "center" })
  }

  const image = (rendered, caption) => {
    if (!rendered?.dataUrl) return
    const aspect = rendered.height / rendered.width
    let w = CW, h = w * aspect
    const maxH = BOTTOM - TOP - 12
    if (h > maxH) { h = maxH; w = h / aspect }
    ensure(h + 9)
    pdf.setDrawColor(...C.line); pdf.setLineWidth(0.3)
    try { pdf.addImage(rendered.dataUrl, "JPEG", M + (CW - w) / 2, y, w, h) } catch { return }
    pdf.rect(M + (CW - w) / 2, y, w, h, "S")
    y += h + 4
    if (caption) { font(8.5, "italic", C.muted); pdf.text(lines(caption, CW), W / 2, y, { align: "center" }); y += 7 }
  }

  // ── Cover ──
  font(30, "bold", C.accent)
  const tl = lines(g.title, CW)
  y = 92 - (tl.length - 1) * 6
  tl.forEach((ln) => { pdf.text(ln, M, y); y += 12 })
  if (g.subtitle) { font(12.5, "normal", C.ink); for (const ln of lines(g.subtitle, CW)) { pdf.text(ln, M, y); y += 6 } }
  font(10.5, "normal", C.muted); pdf.text("Process guide", M, y + 2); y += 14
  table([{ label: "", w: 0.3 }, { label: "", w: 0.7 }], g.details, { header: false, labelCol: true })

  // ── Contents ──
  newPage()
  font(15, "bold", C.accent); pdf.text("Contents", M, y); y += 9
  const toc = ["Purpose", ...(g.needs.length ? ["Before you start"] : []), "Process at a glance", "Step by step",
    "Checklist", ...(g.quickRef.some((q) => q.entries) ? ["Quick reference"] : []), ...(g.faqs.length ? ["Questions and answers"] : []),
    ...(g.flowImage?.dataUrl ? ["Process flow"] : [])]
  toc.forEach((t, i) => {
    font(10.5, "bold", C.ink); pdf.text(`${i + 1}  ${t}`, M, y); y += 6
    if (t === "Step by step") g.parts.forEach((p) => { font(9.5, "normal", C.muted); pdf.text(safe(`Part ${p.letter}: ${p.title}`), M + 7, y); y += 5 })
  })
  y += 6

  // ── 1 Purpose ──
  section("Purpose")
  g.purpose.forEach((t) => para(t, { size: 10.5 }))
  if (g.parts.length) {
    para("The process covers the following tasks:", { size: 10.5, after: 1 })
    g.parts.forEach((p) => para(`•  ${p.title}`, { x: M + 3, w: CW - 3, after: 0.5 }))
    y += 2
  }
  if (g.summary.length) { y += 1; para("In short", { size: 10.5, style: "bold", color: C.ink, after: 1 }); g.summary.forEach((t) => para(t)) }

  // ── 2 Before you start ──
  if (g.needs.length) {
    section("Before you start", 45) // heading, intro line and the first rows
    para("Have the following ready before you begin.", { after: 2 })
    if (g.needs.some((n) => n.detail)) table([{ label: "What", w: 0.32 }, { label: "Details", w: 0.68 }], g.needs.map((n) => [n.what, n.detail || "-"]), { labelCol: true })
    else table([{ label: "What you need", w: 1 }], g.needs.map((n) => [n.what]))
  }

  // ── 3 Process at a glance ──
  section("Process at a glance", 58) // heading, intro line and the first row of cards
  para(`The process has ${g.parts.length} part${g.parts.length === 1 ? "" : "s"}.`, { after: 3 })
  {
    const perRow = Math.min(4, Math.max(1, g.parts.length)), gap = 4
    const cw = (CW - gap * (perRow - 1)) / perRow, ch = 30
    g.parts.forEach((p, i) => {
      const col = i % perRow
      if (col === 0) ensure(ch + 4)
      const x = M + col * (cw + gap)
      pdf.setFillColor(...C.tint2); pdf.setDrawColor(...C.line); pdf.roundedRect(x, y, cw, ch, 2, 2, "FD")
      pdf.setFillColor(...C.accent); pdf.circle(x + 6.5, y + 6.5, 3.6, "F")
      font(9, "bold", [255, 255, 255]); pdf.text(p.letter, x + 6.5, y + 7.8, { align: "center" })
      font(9, "bold", C.ink); lines(p.title, cw - 6).slice(0, 2).forEach((ln, k) => pdf.text(ln, x + 3, y + 15 + k * 4))
      font(7.8, "normal", C.muted); lines(p.first, cw - 6).slice(0, 2).forEach((ln, k) => pdf.text(ln, x + 3, y + 24 + k * 3.4))
      if (col === perRow - 1 || i === g.parts.length - 1) y += ch + gap
    })
    y += 2
  }
  table([{ label: "Part", w: 0.1 }, { label: "Task", w: 0.32 }, { label: "What you do", w: 0.58 }],
    g.parts.map((p) => [p.letter, p.title, p.first]))

  // ── 4 Step by step ──
  // height of a group: its actions plus the screenshot that shows them
  const groupH = (p, grp) => {
    const r = grp.shotIdx >= 0 ? p.shots[grp.shotIdx].rendered : null
    return grp.subs.length * 7.5 + (r ? Math.min(CW * (r.height / r.width), BOTTOM - TOP - 12) + 14 : 0)
  }
  // a part heading moves to the next page together with its first group
  const partKeep = (p) => {
    const first = p?.groups[0] ? groupH(p, p.groups[0]) + 10 : 0
    return first > 60 && first < BOTTOM - TOP - 14 ? first : 60
  }
  section("Step by step", 14 + partKeep(g.parts[0]))
  for (const p of g.parts) {
    ensure(partKeep(p))
    font(12, "bold", C.ink); pdf.text(safe(`Part ${p.letter}: ${p.title}`), M, y)
    font(8, "normal", C.muted); pdf.text(safe(p.label), W - M, y, { align: "right" }); y += 7
    for (const grp of p.groups) {
      // keep the actions on the same page as the screenshot that shows them
      const need = groupH(p, grp)
      if (grp.shotIdx >= 0 && need < BOTTOM - TOP) ensure(need)
      for (const s of grp.subs) {
        font(10, "normal", C.body)
        const wl = lines(s.text, CW - 15)
        ensure(wl.length * 4.8 + 3)
        badge(s.id, M, y)
        font(10, "normal", C.body)
        wl.forEach((ln, k) => pdf.text(ln, M + 14, y + k * 4.8))
        y += wl.length * 4.8 + 2.5
      }
      y += 1
      if (grp.shotIdx >= 0) { const shot = p.shots[grp.shotIdx]; image(shot.rendered, figureCaption(p, shot)) }
    }
    if (p.result) {
      font(9.5, "normal", C.body)
      const wl = lines(p.result, CW - 20)
      ensure(wl.length * 4.6 + 4)
      font(9.5, "bold", C.ok); pdf.text("Result", M, y)
      font(9.5, "normal", C.body); wl.forEach((ln, k) => pdf.text(ln, M + 17, y + k * 4.6))
      y += wl.length * 4.6 + 3
    }
    if (p.tip) callout(p.lowConfidence ? "warn" : "tip", p.tip)
    y += 5
  }

  // ── Checklist ──
  section("Checklist", 45)
  para("Print this page or copy it into your notes, and tick each item.", { after: 3 })
  {
    const cols = [0.08, 0.92].map((w) => w * CW)
    g.checklist.forEach((c, i) => {
      font(9.5, "normal", C.body)
      const wl = lines(c.text, cols[1] - 6)
      const h = wl.length * 4.4 + 5
      ensure(h)
      pdf.setFillColor(...(i % 2 ? C.tint2 : [255, 255, 255])); pdf.rect(M, y, CW, h, "F")
      pdf.setDrawColor(...C.line); pdf.rect(M, y, CW, h, "S")
      pdf.setDrawColor(...C.accent); pdf.setLineWidth(0.4); pdf.rect(M + 4, y + h / 2 - 2.2, 4.4, 4.4, "S"); pdf.setLineWidth(0.2)
      wl.forEach((ln, k) => pdf.text(ln, M + cols[0], y + 4.6 + k * 4.4))
      y += h
    })
    y += 5
  }

  // ── Quick reference ──
  if (g.quickRef.some((q) => q.entries)) {
    section("Quick reference", 45)
    table([{ label: "Part", w: 0.1 }, { label: "Task", w: 0.4 }, { label: "Key entries", w: 0.5 }],
      g.quickRef.map((q) => [q.part, q.title, q.entries || "-"]))
  }

  // ── Questions and answers ──
  if (g.faqs.length) {
    section("Questions and answers", 40)
    g.faqs.forEach((f) => {
      ensure(14)
      para(f.q, { size: 10.3, style: "bold", color: C.ink, after: 1 })
      para(f.a, { after: 4 })
    })
  }

  // ── Process flow ──
  if (g.flowImage?.dataUrl) {
    const fi = { dataUrl: g.flowImage.dataUrl, width: g.flowImage.width || 600, height: g.flowImage.height || 300 }
    section("Process flow", Math.min(BOTTOM - TOP - 4, 16 + Math.min(CW * (fi.height / fi.width), BOTTOM - TOP - 12))) // heading moves with the diagram
    image(fi, "")
  }

  // Header + footer on every page but the cover
  const total = pdf.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    if (i > 1) {
      font(8, "normal", C.muted); pdf.text(safe(`${g.title}  |  Process guide`), W - M, 12, { align: "right" })
      pdf.setDrawColor(...C.accent); pdf.setLineWidth(0.5); pdf.line(M, 14.5, W - M, 14.5); pdf.setLineWidth(0.2)
    }
    font(8, "normal", C.muted)
    pdf.text("Made with VideoDoc", M, H - 10)
    pdf.text(`Page ${i} of ${total}`, W - M, H - 10, { align: "right" })
  }

  pdf.save(`${g.title}-docs.pdf`)
}
