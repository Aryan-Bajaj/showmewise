import { buildGuide, renderGuideShots, figureCaption } from "./guideModel"

function dataUrlToUint8(dataUrl) {
  const b64 = dataUrl.split(",")[1] || ""
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function gifSize(bytes) {
  if (bytes.length < 10) return null
  const w = bytes[6] | (bytes[7] << 8)
  const h = bytes[8] | (bytes[9] << 8)
  return w && h ? { w, h } : null
}

const COL = { ink: "1B1640", body: "34304E", muted: "78739A", line: "DEDAF0", accent: "6D4AFF", tint: "F3F0FF", tint2: "FAF9FF", ok: "0F8C64", tip: "2296BE", tipBg: "EAF7FC", warn: "C8820A", warnBg: "FFF7E6" }

export async function exportDOCX(docs, videoName, meta = {}) {
  const d = await import("docx")
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ImageRun, Table, TableRow, TableCell,
    WidthType, ShadingType, Header, Footer, PageNumber, PageBreak, TabStopType, VerticalAlign } = d
  const g = buildGuide(docs, meta)
  await renderGuideShots(g, { maxW: 1400 })

  const IMG_W = 600 // px at 96 dpi, fits A4 with 2 cm margins
  const run = (text, o = {}) => new TextRun({ text: String(text ?? ""), font: "Segoe UI", size: 20, color: COL.body, ...o })
  const P = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], spacing: { after: 120 }, ...o })
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
  const thin = { style: BorderStyle.SINGLE, size: 4, color: COL.line }
  const borders = { top: thin, bottom: thin, left: thin, right: thin }
  const cell = (text, { fill, bold, color, w, white, keep } = {}) => new TableCell({
    children: [P(run(text, { bold, color: white ? "FFFFFF" : color || COL.body, size: 19 }), { spacing: { after: 0 }, keepNext: !!keep })],
    shading: fill ? { fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    width: w ? { size: w, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    borders,
  })
  // short tables stay on one page (every row keeps with the next); long ones may break
  const table = (cols, rows, { header = true, labelCol = false } = {}) => { const whole = rows.length <= 15; return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ...(header ? [new TableRow({ tableHeader: true, children: cols.map((c) => cell(c.label, { fill: COL.accent, bold: true, white: true, w: c.w, keep: true })) })] : []),
      ...rows.map((r, i) => new TableRow({
        children: r.map((v, k) => cell(v, {
          w: cols[k].w, keep: whole && i < rows.length - 1,
          fill: labelCol && k === 0 ? COL.tint : i % 2 ? COL.tint2 : undefined,
          bold: labelCol && k === 0, color: labelCol && k === 0 ? COL.ink : undefined,
        })),
      })),
    ],
  }) }
  const gap = (keepNext = false) => P(run(""), { spacing: { after: 60 }, keepNext })
  let sec = 0
  const H = (text) => { sec++; return P(run(`${sec}  ${text}`, { bold: true, size: 30, color: COL.accent }), { spacing: { before: 360, after: 160 }, keepNext: true }) }
  const boxPara = (label, text, bar, bg) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      children: [P(run(label, { bold: true, color: bar, size: 18 }), { spacing: { after: 40 } }), P(run(text, { size: 19 }), { spacing: { after: 0 } })],
      shading: { fill: bg, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 100, bottom: 100, left: 180, right: 140 },
      borders: { top: none, bottom: none, right: none, left: { style: BorderStyle.SINGLE, size: 24, color: bar } },
    })] })],
  })
  const picture = (rendered, caption) => {
    if (!rendered?.dataUrl) return []
    // fit the page both ways: tall (phone) screenshots shrink to the page height
    const MAX_H = 820
    let w = IMG_W, h = Math.round(w * (rendered.height / rendered.width))
    if (h > MAX_H) { w = Math.round(w * (MAX_H / h)); h = MAX_H }
    return [
      P(new ImageRun({ data: dataUrlToUint8(rendered.dataUrl), transformation: { width: w, height: h } }), { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 60 }, keepNext: !!caption }),
      ...(caption ? [P(run(caption, { italics: true, size: 17, color: COL.muted }), { alignment: AlignmentType.CENTER, spacing: { after: 200 } })] : []),
    ]
  }

  const children = []

  // ── Cover ──
  children.push(P(run(""), { spacing: { before: 2600 } }))
  children.push(P(run(g.title, { bold: true, size: 64, color: COL.accent }), { spacing: { after: 160 } }))
  if (g.subtitle) children.push(P(run(g.subtitle, { size: 26, color: COL.ink }), { spacing: { after: 80 } }))
  children.push(P(run("Process guide", { size: 21, color: COL.muted }), { spacing: { after: 480 } }))
  children.push(table([{ w: 30 }, { w: 70 }], g.details, { header: false, labelCol: true }))
  children.push(P(new PageBreak()))

  // ── Contents ──
  const toc = ["Purpose", ...(g.needs.length ? ["Before you start"] : []), "Process at a glance", "Step by step",
    "Checklist", ...(g.quickRef.some((q) => q.entries) ? ["Quick reference"] : []), ...(g.faqs.length ? ["Questions and answers"] : []),
    ...(g.flowImage?.dataUrl ? ["Process flow"] : [])]
  children.push(P(run("Contents", { bold: true, size: 30, color: COL.accent }), { spacing: { after: 200 } }))
  toc.forEach((t, i) => {
    children.push(P(run(`${i + 1}  ${t}`, { bold: true, color: COL.ink, size: 21 }), { spacing: { after: 60 } }))
    if (t === "Step by step") g.parts.forEach((p) => children.push(P(run(`Part ${p.letter}: ${p.title}`, { color: COL.muted, size: 19 }), { indent: { left: 360 }, spacing: { after: 40 } })))
  })

  // ── 1 Purpose ──
  children.push(H("Purpose"))
  g.purpose.forEach((t) => children.push(P(run(t, { size: 21 }))))
  if (g.parts.length) {
    children.push(P(run("The process covers the following tasks:", { size: 21 }), { spacing: { after: 60 } }))
    g.parts.forEach((p) => children.push(P(run(p.title, { size: 21 }), { bullet: { level: 0 }, spacing: { after: 40 } })))
  }
  if (g.summary.length) {
    children.push(P(run("In short", { bold: true, color: COL.ink, size: 21 }), { spacing: { before: 200, after: 60 } }))
    g.summary.forEach((t) => children.push(P(run(t))))
  }

  // ── 2 Before you start ──
  if (g.needs.length) {
    children.push(H("Before you start"))
    children.push(P(run("Have the following ready before you begin."), { keepNext: true }))
    children.push(g.needs.some((n) => n.detail)
      ? table([{ label: "What", w: 32 }, { label: "Details", w: 68 }], g.needs.map((n) => [n.what, n.detail || "-"]), { labelCol: true })
      : table([{ label: "What you need", w: 100 }], g.needs.map((n) => [n.what])))
  }

  // ── 3 Process at a glance ──
  children.push(H("Process at a glance"))
  children.push(P(run(`The process has ${g.parts.length} part${g.parts.length === 1 ? "" : "s"}.`), { keepNext: true }))
  children.push(table([{ label: "Part", w: 10 }, { label: "Task", w: 32 }, { label: "What you do", w: 58 }], g.parts.map((p) => [p.letter, p.title, p.first])))

  // ── 4 Step by step ──
  children.push(H("Step by step"))
  for (const p of g.parts) {
    children.push(P([run(`Part ${p.letter}: ${p.title}`, { bold: true, size: 25, color: COL.ink }), run(`\t${p.label}`, { size: 16, color: COL.muted })],
      { spacing: { before: 280, after: 120 }, keepNext: true, tabStops: [{ type: TabStopType.RIGHT, position: 9000 }] }))
    for (const grp of p.groups) {
      // the actions stay on the same page as the screenshot that shows them
      const keep = grp.shotIdx >= 0
      for (const s of grp.subs) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: [
            new TableCell({ children: [P(run(s.id, { bold: true, color: "FFFFFF", size: 18 }), { alignment: AlignmentType.CENTER, spacing: { after: 0 }, keepNext: keep })],
              shading: { fill: COL.accent, type: ShadingType.CLEAR, color: "auto" }, width: { size: 8, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER, margins: { top: 40, bottom: 40 }, borders: { top: none, bottom: none, left: none, right: none } }),
            new TableCell({ children: [P(run(s.text, { size: 20 }), { spacing: { after: 0 }, keepNext: keep })], width: { size: 92, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER, margins: { left: 160, top: 40, bottom: 40 }, borders: { top: none, bottom: none, left: none, right: none } }),
          ] })],
        }))
        children.push(gap(keep))
      }
      if (grp.shotIdx >= 0) { const shot = p.shots[grp.shotIdx]; children.push(...picture(shot.rendered, figureCaption(p, shot))) }
    }
    // no marked screenshot for this part: show the animated step instead
    if (!p.shots.length) {
      const gif = meta.gifs instanceof Map ? meta.gifs.get(p.timestamp) : null
      if (gif) {
        try {
          const bytes = dataUrlToUint8(gif), dim = gifSize(bytes)
          children.push(P(new ImageRun({ data: bytes, transformation: { width: 480, height: dim ? Math.round(480 * dim.h / dim.w) : 270 } }), { alignment: AlignmentType.CENTER }))
        } catch { /* skip */ }
      }
    }
    if (p.result) children.push(P([run("Result   ", { bold: true, color: COL.ok }), run(p.result)], { spacing: { before: 60, after: 120 } }))
    if (p.tip) { children.push(p.lowConfidence ? boxPara("Important", p.tip, COL.warn, COL.warnBg) : boxPara("Tip", p.tip, COL.tip, COL.tipBg)); children.push(gap()) }
  }

  // ── Checklist ──
  children.push(H("Checklist"))
  children.push(P(run("Print this page or copy it into your notes, and tick each item."), { keepNext: true }))
  children.push(table([{ label: "Done", w: 9 }, { label: "Item", w: 91 }], g.checklist.map((c) => ["☐", `${c.part}  ${c.text}`])))

  // ── Quick reference ──
  if (g.quickRef.some((q) => q.entries)) {
    children.push(H("Quick reference"))
    children.push(table([{ label: "Part", w: 10 }, { label: "Task", w: 40 }, { label: "Key entries", w: 50 }], g.quickRef.map((q) => [q.part, q.title, q.entries || "-"])))
  }

  // ── Questions and answers ──
  if (g.faqs.length) {
    children.push(H("Questions and answers"))
    g.faqs.forEach((f) => {
      children.push(P(run(f.q, { bold: true, color: COL.ink, size: 21 }), { spacing: { before: 160, after: 60 }, keepNext: true }))
      children.push(P(run(f.a)))
    })
  }

  // ── Process flow ──
  if (g.flowImage?.dataUrl) {
    children.push(H("Process flow"))
    const fw = g.flowImage.width || 600, fh = g.flowImage.height || 300
    const s = Math.min(1, IMG_W / fw)
    children.push(P(new ImageRun({ data: dataUrlToUint8(g.flowImage.dataUrl), transformation: { width: Math.round(fw * s), height: Math.round(fh * s) } }), { alignment: AlignmentType.CENTER }))
  }

  const document = new Document({
    creator: "ShowMeWise",
    title: g.title,
    styles: { default: { document: { run: { font: "Segoe UI", size: 20, color: COL.body } } } },
    sections: [{
      properties: { titlePage: true, page: { margin: { top: 1300, bottom: 1100, left: 1134, right: 1134 } } },
      headers: {
        default: new Header({ children: [P(run(`${g.title}  |  Process guide`, { size: 16, color: COL.muted }), {
          alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COL.accent, space: 4 } } })] }),
        first: new Header({ children: [P(run(""))] }),
      },
      footers: {
        default: new Footer({ children: [P([run("Made with ShowMeWise", { size: 16, color: COL.muted }),
          new TextRun({ children: ["\tPage ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: "Segoe UI", size: 16, color: COL.muted })],
          { tabStops: [{ type: TabStopType.RIGHT, position: 9600 }] })] }),
        first: new Footer({ children: [P(run("Made with ShowMeWise", { size: 16, color: COL.muted }))] }),
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(document)
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")
  anchor.href = url
  anchor.download = `${g.title}-docs.docx`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
