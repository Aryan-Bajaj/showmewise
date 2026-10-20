import { useCallback } from "react"
import {
  PROCEDURE_PROMPT, VISION_ADDENDUM, buildContextPrompt, parseProcedureStep, isMeetingNoise,
  IDENTIFY_APP_PROMPT, parseAppName, appContextPrefix, isLogisticsStep,
  resemblesParticipant, scrubParticipantStep,
  STEP_JSON_SCHEMA, JSON_ADDENDUM, cleanTranscriptText, hasActionWords, RECALL_ADDENDUM,
  SEGMENT_PROMPT, SEGMENT_SCHEMA, isScreenlessFrame, groundStepInEvidence,
} from "../lib/skillPrompt"
import { callOllama, callWebLLM, callLocalEngine, WEBLLM_NO_VISION } from "../lib/llm"
import { smartCrop } from "../lib/smartCrop"
import { ocrNear } from "./useOCR"
import { keyTerms, missingTerms, worthRetry, COVERAGE_ADDENDUM, spokenActions, missingActions, tidyActions, tidyNote, screenCounts, screenSpelling } from "../lib/coverage"

// ── Screen-share start detection ──
// A meeting recording often opens with minutes of webcams only — transcript but
// no application on screen. Any step written from that speech alone is fabricated
// ("Open About Page" from someone TALKING about a page). Find the first moment
// the screen shows a text-rich application and refuse to write steps before it.
// Two nearby rich frames are required so one lucky OCR hit on a webcam/desktop
// frame can't open the gate early. No rich frames at all → gate off (a video
// where OCR failed everywhere should still be documented from the transcript).
const RICH_OCR_LEN = 60
export function screenShareStart(ocrFrameTexts, participants = []) {
  // "Rich" must mean a real application screen — NOT a webcam frame whose only text
  // is the burned-in speaker-name captions ("Lastname, Firstname (ORG, CODE)"),
  // which alone can exceed 60 chars and used to open the gate at second 10 over a
  // pure webcam. isScreenlessFrame strips the captions before judging.
  const rich = (ocrFrameTexts || []).filter(
    (f) => (f.text || "").replace(/\s+/g, " ").trim().length >= RICH_OCR_LEN
      && !isScreenlessFrame(f.text, participants),
  )
  if (!rich.length) return null
  for (let i = 0; i + 1 < rich.length; i++) {
    if (rich[i + 1].timestamp - rich[i].timestamp <= 120) return rich[i].timestamp
  }
  return rich[0].timestamp
}

// ── Scene-change segmentation ──
// Steps should align with what HAPPENED, not with the clock. A boundary is placed
// wherever the on-screen text turns over hard (new dialog, tab, screen, app) —
// measured as token overlap between consecutive OCR frames. A long static screen
// stays one window; a dense config minute splits into several.
function tokenSet(t) {
  return new Set((t || "").toLowerCase().match(/[a-z0-9]{3,}/g) || [])
}
function ocrSimilarity(a, b) {
  const A = tokenSet(a), B = tokenSet(b)
  if (!A.size || !B.size) return 1 // unreadable frame → never invent a boundary
  let inter = 0
  for (const w of A) if (B.has(w)) inter++
  return inter / Math.min(A.size, B.size)
}
const SCENE_SIM_THRESHOLD = 0.35 // below this overlap the screen "changed"
const SCENE_MIN_GAP = 12         // s — a fast transition burst is ONE change
// Short videos pack a step every few seconds, so the spacing shrinks with length
// (a 1-minute how-to gets ~4 s, anything past 3 minutes keeps the full 12 s).
const minGapFor = (span) => Math.min(SCENE_MIN_GAP, Math.max(4, span / 15))

// ── Speech activity boundaries — the EARS of segmentation ──
// One LLM call over the timestamped transcript proposes where new activities
// start. Unioned with the pixel cuts (the eyes): this splits same-screen work
// pixels can't see ("set the row height… now add the dimension" in one dialog).
// Best-effort: any failure returns [] and segmentation falls back to pixels.
async function speechBoundaries(chunks, maxT, aiMode, model, onStatus) {
  const clean = (chunks || []).filter((c) => c.text?.trim())
  if (clean.length < 8) return []
  let lines = clean.map((c) => `[${formatTS(c.timestamp?.[0] ?? 0)}] ${c.text.trim()}`)
  if (lines.length > 120) { // cap the prompt on long recordings, sampled evenly
    const step = lines.length / 120
    lines = Array.from({ length: 120 }, (_, i) => lines[Math.floor(i * step)])
  }
  const msg = lines.join("\n").slice(0, 7000)
  try {
    onStatus?.("Reading the whole narration to find where each task starts (one AI pass, a few minutes on a slow computer)…")
    const opts = { schema: SEGMENT_SCHEMA, maxTokens: 400, temperature: 0.1 }
    const raw = aiMode === "ollama"
      ? await callOllama(msg, SEGMENT_PROMPT, model, opts)
      : aiMode === "local"
      ? await callLocalEngine(msg, SEGMENT_PROMPT, null, opts)
      : await callWebLLM(msg, SEGMENT_PROMPT, null, { ...opts, model })
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return []
    const o = JSON.parse(m[0])
    const bs = (Array.isArray(o.boundaries) ? o.boundaries : [])
      .filter((n) => typeof n === "number" && isFinite(n) && n > 5 && n < maxT - 5)
      .sort((x, y) => x - y)
      .slice(0, 30)
    const spaced = []
    const gap = minGapFor(maxT)
    for (const b of bs) if (!spaced.length || b - spaced[spaced.length - 1] >= gap) spaced.push(b)
    return spaced
  } catch { return [] }
}

function sceneBoundaries(ocrFrameTexts, t0, maxT) {
  const fr = (ocrFrameTexts || []).filter(
    (f) => f.timestamp > t0 + 5 && f.timestamp < maxT - 5 && (f.text || "").trim(),
  )
  if (fr.length < 6) return null // too little OCR to segment on → caller falls back to time
  const cuts = []
  for (let i = 1; i < fr.length; i++) {
    if (ocrSimilarity(fr[i - 1].text, fr[i].text) < SCENE_SIM_THRESHOLD) {
      if (!cuts.length || fr[i].timestamp - cuts[cuts.length - 1] >= minGapFor(maxT - t0)) {
        cuts.push(fr[i].timestamp)
      }
    }
  }
  return cuts
}

// Assemble [start,end] windows. Boundary sources, best first:
//   1. PIXEL scene cuts (from the keyframe fingerprint pass) — robust on blurry
//      recordings where OCR text is garbage.
//   2. OCR-token similarity cuts — fallback when no pixel cuts were provided.
//   3. Fixed time slicing — last resort.
// Long segments split (dense work → separate steps), tiny ones merged.
const MIN_WINDOW = 25, MAX_WINDOW = 70
export function buildSegments(ocrFrameTexts, maxT, shareStart, sceneCuts = [], speechCuts = []) {
  const t0 = shareStart ?? 0
  const span = maxT - t0
  // Window sizes scale down for short recordings: the 25-70 s range suits long
  // sessions, but it squeezed a 1-minute how-to into a single step.
  const MIN_WINDOW = Math.min(25, Math.max(6, span / 10))
  const MAX_WINDOW = Math.min(70, Math.max(15, span / 4))
  const SCENE_MIN_GAP = minGapFor(span)
  if (span <= MIN_WINDOW) return span > 1 ? [[t0, maxT]] : []
  // Pixel cuts: clamp into range, enforce spacing (a fast transition burst = one change).
  const pixel = []
  for (const c of [...(sceneCuts || [])].sort((a, b) => a - b)) {
    if (c <= t0 + 5 || c >= maxT - 5) continue
    if (!pixel.length || c - pixel[pixel.length - 1] >= SCENE_MIN_GAP) pixel.push(c)
  }
  // UNION of eyes and ears: add a speech boundary only where no pixel cut is
  // already nearby — the pixel cut wins ties because it aligns screenshots best.
  const union = [...pixel]
  for (const c of speechCuts || []) {
    if (c <= t0 + 5 || c >= maxT - 5) continue
    if (union.every((u) => Math.abs(u - c) >= SCENE_MIN_GAP)) union.push(c)
  }
  union.sort((a, b) => a - b)
  const cuts = union.length >= 3 ? union : sceneBoundaries(ocrFrameTexts, t0, maxT)
  let edges
  if (cuts?.length) {
    edges = [t0, ...cuts, maxT]
  } else {
    const step = Math.min(MAX_WINDOW, Math.max(Math.min(35, MAX_WINDOW), span / 50))
    edges = [t0]
    for (let t = t0 + step; t < maxT - 1; t += step) edges.push(t)
    edges.push(maxT)
  }
  // Split over-long segments evenly…
  const split = []
  for (let i = 0; i + 1 < edges.length; i++) {
    const a = edges[i], b = edges[i + 1]
    const n = Math.max(1, Math.ceil((b - a) / MAX_WINDOW))
    const w = (b - a) / n
    for (let k = 0; k < n; k++) split.push([a + k * w, k === n - 1 ? b : a + (k + 1) * w])
  }
  // …and fold under-short ones into their predecessor (unless that makes a giant).
  const merged = []
  for (const s of split) {
    const prev = merged[merged.length - 1]
    if (prev && s[1] - s[0] < MIN_WINDOW && s[1] - prev[0] <= MAX_WINDOW + MIN_WINDOW) prev[1] = s[1]
    else merged.push([...s])
  }
  return merged
}

// Every window is one LLM call, and on a weak office laptop a call can take
// 30-60s. Cap the call count by device memory (browsers report at most 8, so
// ≤4 is genuinely low-end) by folding the shortest neighbouring windows together
// — a long video still gets full COVERAGE, just in coarser slices.
function capSegments(segs, maxN) {
  const out = segs.map((s) => [...s])
  while (out.length > maxN) {
    let bi = 0, best = Infinity
    for (let i = 0; i + 1 < out.length; i++) {
      const len = out[i + 1][1] - out[i][0]
      if (len < best) { best = len; bi = i }
    }
    out[bi] = [out[bi][0], out[bi + 1][1]]
    out.splice(bi + 1, 1)
  }
  return out
}

// Pick the screenshot for a window that most likely shows the APPLICATION (the
// frame whose OCR captured the most text), not a webcam / photo / desktop.
function pickFrame(frames, ocrFrameTexts, a, b, center) {
  let bestTs = null, bestLen = 0
  for (const f of ocrFrameTexts || []) {
    if (f.timestamp >= a && f.timestamp < b) {
      const len = (f.text || "").length
      if (len > bestLen) { bestLen = len; bestTs = f.timestamp }
    }
  }
  return nearestFrame(frames, bestTs ?? center)
}

// Up to 3 frames for one part: near its start, the most readable one, near
// its end, in time order. One picture of a 60 s part hid every click between.
function pickFrames(frames, best, a, b) {
  const inWin = (frames || []).filter((f) => f.timestamp >= a && f.timestamp < b)
  if (inWin.length <= 3) return inWin.length ? inWin : best ? [best] : []
  const at = (t) => nearestFrame(inWin, t)
  const picks = [at(a + (b - a) * 0.12), best || at((a + b) / 2), at(b - (b - a) * 0.12)]
  return [...new Map(picks.filter(Boolean).map((f) => [f.timestamp, f])).values()].sort((x, y) => x.timestamp - y.timestamp)
}

// Flatten a parsed procedure step back into plain text — used by the doc chat /
// RAG so it can still search the procedure content.
function stepToText(step) {
  if (!step) return ""
  return [
    step.title,
    ...(step.steps || []).map((s, i) => `${i + 1}. ${s}`),
    step.result ? `Result: ${step.result}` : "",
    step.note ? `Note: ${step.note}` : "",
  ].filter(Boolean).join("\n")
}

function formatTS(secs) {
  if (!secs && secs !== 0) return "00:00"
  return `${Math.floor(secs / 60).toString().padStart(2, "0")}:${Math.floor(secs % 60).toString().padStart(2, "0")}`
}

function nearestFrame(frames, timestamp) {
  if (!frames?.length) return null
  return frames.reduce((best, f) =>
    Math.abs(f.timestamp - timestamp) < Math.abs(best.timestamp - timestamp) ? f : best
  , frames[0])
}

export default function useAnnotator() {
  // ocrFrameTexts: [{timestamp, text}] from useOCR — gives the model real on-screen UI text.
  // onDraft(docsSoFar) fires after every completed window so the UI can show
  // steps appearing live instead of a bare progress bar. `participants` are
  // names harvested from webcam tiles — blocked from becoming artifact names.
  const annotate = useCallback(async (
    chunks, frames, aiMode, onProgress, onStatus, sections, ollamaModel, ocrFrameTexts = [],
    shouldCancel = () => false, useVision = false, sceneCuts = [], onDraft = null, participants = [],
  ) => {
    // Build windows across the WHOLE video timeline (not just where someone spoke),
    // so silent stretches are still documented from the on-screen (OCR) text.
    const lastChunk = chunks?.length ? (chunks[chunks.length - 1].timestamp?.[1] ?? chunks[chunks.length - 1].timestamp?.[0] ?? 0) : 0
    const lastFrame = frames?.length ? frames[frames.length - 1].timestamp : 0
    const maxT = Math.max(lastChunk, lastFrame, 1)

    // 1) Gate: nothing before the screen-share actually starts can become a step.
    // Distrust a LATE detection: on blurry recordings (Teams downscales hard)
    // Tesseract fails on most frames, and the first frame that happens to OCR
    // well can be deep into the video — gating there would erase real work
    // (this exact failure collapsed a 32-min session to one step). If the
    // "start" lands past 40% of the timeline, fall back to the first frame with
    // ANY readable text.
    let shareStart = screenShareStart(ocrFrameTexts, participants)
    if (shareStart != null && shareStart > maxT * 0.4) {
      const anyOcr = (ocrFrameTexts || []).find(
        (f) => (f.text || "").trim().length >= 20 && !isScreenlessFrame(f.text, participants),
      )
      if (anyOcr && anyOcr.timestamp < shareStart) shareStart = anyOcr.timestamp
    }
    // 2) Segment on SCREEN CHANGES + SPEECH ACTIVITY CHANGES — eyes and ears
    // together, like a person taking notes (fixed slicing only as last resort).
    const speechCuts = await speechBoundaries(chunks, maxT, aiMode, ollamaModel, onStatus)
    let segments = buildSegments(ocrFrameTexts, maxT, shareStart, sceneCuts, speechCuts)
    // 3) …bounded by what this machine can chew through in reasonable time.
    // The cap SCALES with video length (one window per ~45s of recording) so a
    // 60-minute video gets proportionally more steps than a 30-minute one —
    // detail must grow with the video, not get squeezed into a fixed budget.
    // Low-memory machines get a lower ceiling; they trade some step granularity
    // for actually finishing.
    const mem = navigator.deviceMemory || 8
    const span = maxT - (shareStart ?? 0)
    const wanted = Math.max(12, Math.ceil(span / 45))
    segments = capSegments(segments, Math.min(wanted, mem <= 4 ? 48 : 96))

    const windows = []
    for (const [a, b] of segments) {
      const center = a + (b - a) / 2
      // Scrub meeting chatter / filler / ASR repeats from the narration BEFORE it
      // reaches any prompt — junk talk can't become a step it was never part of.
      const text = cleanTranscriptText((chunks || [])
        .filter((c) => { const s = c.timestamp?.[0] ?? 0; return s >= a && s < b })
        .map((c) => c.text.trim()).join(' ').trim())
      const ocr = ocrNear(ocrFrameTexts, center, Math.max((b - a) / 2 + 6, 12), 1500)
      // Keep the window when ANY evidence channel is live. OCR regularly fails
      // wholesale on blurry meeting recordings, so an empty `ocr` must NEVER
      // drop a window on its own — with vision the model still SEES the screen,
      // and the share gate above already removed the webcam-only intro.
      if (!text && !ocr && !useVision) continue
      windows.push({ a, b, center, text, ocr, actions: spokenActions(text) })
    }

    // Every part that is dropped says why, in the browser console: missing
    // content must always be traceable to a rule, never a mystery.
    const why = (label, reason) => console.info(`[VideoDoc] part ${label} dropped: ${reason}`)
    console.info(`[VideoDoc] ${windows.length} parts: ${windows.map((w) => `${formatTS(w.a)}-${formatTS(w.b)}`).join(", ")}`)

    const numberVotes = screenCounts(ocrFrameTexts) // how often each number was read on screen
    const results = []
    let lastError = null
    let okCount = 0

    // With vision the model SEES the screen, so OCR text is dropped and the
    // vision instructions are added. `visionLive` can flip off mid-run if the
    // chosen vision model turns out unavailable on this machine (e.g. GPU too
    // small → text-only fallback) — from then on we annotate from OCR text
    // instead of re-attempting vision on every window.
    let visionLive = useVision

    // Identify the application from the actual screen — model-driven, works for
    // any app, nothing hardcoded. Reusable: it runs once up front, and AGAIN
    // whenever the on-screen vocabulary shifts hard mid-video (a second app or
    // window opened) so later steps are grounded in the app actually in use.
    const identifyApp = async (ocrText, frame) => {
      const idMsg = `On-screen text (OCR):\n${(ocrText || "").slice(0, 1500)}`
      const withImg = visionLive && !!frame?.imageData
      const idImages = withImg ? [frame.imageData] : undefined
      const idCall = (imgs) => aiMode === "ollama"
        ? callOllama(idMsg, IDENTIFY_APP_PROMPT, ollamaModel, { images: imgs })
        : aiMode === "local"
        ? callLocalEngine(idMsg, IDENTIFY_APP_PROMPT, null, { images: imgs })
        : callWebLLM(idMsg, IDENTIFY_APP_PROMPT, onStatus, { model: ollamaModel, images: imgs })
      try {
        let idRaw = null
        try { idRaw = await idCall(idImages) }
        catch { idRaw = await idCall(undefined) } // vision unavailable → identify from text
        return grounded(parseAppName(idRaw))
      } catch { return "" }
    }
    // Same rule as the steps: an app name must be backed by the screen or the
    // audio. A look-alike guess (a generic workspace read as a famous brand) is dropped.
    const evidence = [...(ocrFrameTexts || []).map((f) => f.text || ""), ...windows.map((w) => w.text || "")].join(" ").toLowerCase()
    const grounded = (name) => {
      const words = (name || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4)
      return words.some((t) => evidence.includes(t)) ? name : ""
    }

    let appName = ""
    try {
      const rich = [...(ocrFrameTexts || [])].sort((a, b) => (b.text || "").length - (a.text || "").length)[0]
      if (rich && (rich.text || "").trim().length > 10) {
        appName = await identifyApp(rich.text, nearestFrame(frames, rich.timestamp))
      }
    } catch { /* leave appName empty — prompts just stay generic */ }

    // Participant names from the webcam tiles: hard context so a mishearing of a
    // person's name can never become a report/table/tool name in a step.
    const peopleLine = participants?.length
      ? `PEOPLE ON THE CALL: ${participants.join(", ")}. These are participants' names shown on webcam tiles AND burned into a corner of every frame as a speaker caption — NEVER use them, or anything resembling them, as an application, report, dashboard, file, page, table, view, field, or data name.\n\n`
      : ""
    let sysPrefix = peopleLine + appContextPrefix(appName)

    // Annotate one window either WITH the screenshot (vision) or text-only (OCR).
    const runWindow = (win, frame, label, prev, next, withVision, extra = "") => {
      const useImg = withVision && !!frame?.imageData
      // JSON_ADDENDUM goes LAST so the format contract is the model's freshest
      // instruction; the schema makes the engines enforce it at the sampler.
      const prompt = sysPrefix + (useImg ? PROCEDURE_PROMPT + VISION_ADDENDUM : PROCEDURE_PROMPT) + extra + JSON_ADDENDUM
      // the actions said in this part, in order: a checklist the step must cover
      const said = win.actions?.length
        ? `\n[Actions the speaker describes, in order. Each one must become an action of the step (merge two only if they are the same click)]:\n${win.actions.map((x, n) => `${n + 1}. ${x}`).join("\n")}`
        : ""
      // The screen text goes in with the pictures too: the model shrinks each
      // picture to ~900 px, where small dense UI text is unreadable, while OCR
      // read it at full size (it used to be left out whenever vision was on).
      const userMsg = buildContextPrompt(win.text, label, prev, next, win.ocr) + said
      // up to 3 pictures of the part in time order, so the model sees the sequence
      const images = useImg ? (win.pics?.length ? win.pics : [frame]).map((f) => f.imageData) : undefined
      const schema = STEP_JSON_SCHEMA
      return aiMode === "ollama"
        ? callOllama(userMsg, prompt, ollamaModel, { images, schema })
        : aiMode === "local"
        ? callLocalEngine(userMsg, prompt, null, { images, schema })
        : callWebLLM(userMsg, prompt, onStatus, { model: ollamaModel, images, schema })
    }

    // A part whose AI call fails gets a second chance at the end of the run
    // (after the retries inside the call), instead of silently going missing.
    const order = windows.map((_, i) => i)
    const secondTry = new Set()
    for (let q = 0; q < order.length; q++) {
      const i = order[q]
      if (shouldCancel()) break // user cancelled — keep what we have so far
      const win = windows[i]
      const label = formatTS(win.a)
      const frame = pickFrame(frames, ocrFrameTexts, win.a, win.b, win.center)
      win.pics = pickFrames(frames, frame, win.a, win.b)
      const prevText = windows[i - 1]?.text ?? null
      const nextText = windows[i + 1]?.text ?? null

      onProgress?.(i, windows.length)

      // Noise gate: skip pure meeting / AV-logistics chatter (mic checks, screen
      // sharing, greetings) that has no real on-screen content, so it never turns
      // into a step. Only drops when the screen text is also empty — a window
      // that shows actual work is always sent to the model.
      const ocrLen = (win.ocr || "").replace(/\s+/g, " ").trim().length
      if (isMeetingNoise(win.text) && ocrLen < 40) { why(label, "only meeting chatter and no screen text"); continue }

      // Multi-window awareness: a HARD vocabulary turnover vs the previous
      // window's screen text means a different app/window is now in front
      // (e.g. Report Builder opened beside the main report). Re-identify the app
      // from THIS window's evidence so the grounding prefix follows the user.
      const prevOcr = windows[i - 1]?.ocr || ""
      if (win.ocr && prevOcr && ocrLen >= 80 && ocrSimilarity(prevOcr, win.ocr) < 0.15) {
        const newApp = await identifyApp(win.ocr, frame)
        if (newApp && newApp !== appName) {
          appName = newApp
          sysPrefix = peopleLine + appContextPrefix(appName)
        }
      }

      let raw = null
      try {
        const tryVision = visionLive && !!frame?.imageData
        try {
          raw = await runWindow(win, frame, label, prevText, nextText, tryVision)
        } catch (visErr) {
          if (!tryVision) throw visErr // a text-only attempt failed for real
          // Vision failed for THIS window (oversized frame, transient GPU OOM, or
          // a text-only fallback model loaded). Retry from OCR text so the step is
          // never lost. If the model simply can't do vision, stop trying it.
          if (visErr?.message === WEBLLM_NO_VISION) visionLive = false
          raw = await runWindow(win, frame, label, prevText, nextText, false)
        }
        okCount++
      } catch (e) {
        lastError = e // remember it; surfaced below if nothing succeeds
        if (!secondTry.has(i)) {
          secondTry.add(i)
          order.push(i)
          console.info(`[VideoDoc] part ${label} failed (${e?.message}), will try again at the end`)
        } else why(label, `model error, twice: ${e?.message}`)
        continue
      }

      let step = parseProcedureStep(raw)
      let fromRetry = false
      if (step.skip) {
        // Recall guard: strong evidence + a skip is more likely a model miss
        // than true noise. Strong = spoken action verbs, a text-rich screen, OR
        // (the meeting-recording reality) vision on + a screenshot + sustained
        // talk — people discuss vaguely WHILE doing concrete on-screen work.
        // ONE second look; if the model still skips, trust it.
        const strongEvidence = hasActionWords(win.text) || ocrLen >= 80
          || (visionLive && !!frame?.imageData && (win.text || "").length >= 60)
        if (!strongEvidence) { why(label, "model found no step and the evidence is thin"); continue }
        try {
          const raw2 = await runWindow(win, frame, label, prevText, nextText, visionLive && !!frame?.imageData, RECALL_ADDENDUM)
          step = parseProcedureStep(raw2)
          fromRetry = true
        } catch (e) { why(label, `second look failed: ${e?.message}`); continue }
        if (step.skip) { why(label, "model found no step, twice"); continue } // confirmed: nothing real here
      }
      if (isLogisticsStep(step)) { why(label, `meeting logistics: "${step.title}"`); continue } // meeting logistics / webcam-name tile → not a procedure step

      // Screenless-frame backstop: the frame carries no real UI text (only webcam
      // + speaker captions), so a step here is built on a virtual background, not
      // an application. Only applied when VISION was NOT used for this window — a
      // vision model that looked at the actual screenshot is a better judge of
      // "is this a screen" than a sparse OCR pass, and gating on OCR alone was
      // deleting real work on blurry (heavily-downscaled Teams) application frames. The
      // early webcam stretch is already handled by the screenShareStart gate.
      const sawScreen = visionLive && !!frame?.imageData
      if (!sawScreen && ocrLen < 25 && isScreenlessFrame(win.ocr, participants)) { why(label, "no application on screen"); continue }

      // A participant's name drifted into the step ("Winters Alvarez, Jamie" →
      // "Open Wintors Alvares Page"). The prompt warning alone doesn't stop small
      // vision models, so: ONE corrective re-ask naming the mistake explicitly,
      // then a deterministic scrub of whatever still leaks. A step that collapses
      // to nothing after scrubbing was never about real screen content — drop it.
      let nameSuspect = resemblesParticipant(step.title, participants)
        || (step.steps || []).some((s) => resemblesParticipant(s, participants))
        || resemblesParticipant(step.result, participants)
      if (nameSuspect) {
        try {
          const nameFix = `\n\nCORRECTION — your previous answer used a call participant's name (${participants.join(", ")}) as a file/report/dashboard/page name. That name is a PERSON shown in the recording's speaker caption and webcam tiles, NOT on-screen content. Re-emit the step describing ONLY what the application screen really shows; if you cannot read the real name of the item, describe it generically (e.g. "the dashboard", "the report").`
          const raw3 = await runWindow(win, frame, label, prevText, nextText, visionLive && !!frame?.imageData, nameFix)
          const step3 = parseProcedureStep(raw3)
          if (!step3.skip && (step3.title || step3.steps?.length)) step = step3
        } catch { /* keep the original — the scrub below still cleans it */ }
        nameSuspect = resemblesParticipant(step.title, participants)
          || (step.steps || []).some((s) => resemblesParticipant(s, participants))
          || resemblesParticipant(step.result, participants)
        if (nameSuspect && !scrubParticipantStep(step, participants)) { why(label, "only a participant name was left"); continue }
        if (isLogisticsStep(step)) { why(label, "meeting logistics after the name fix"); continue }
      }

      // Evidence grounding: strip domain nouns the vision model confabulated when
      // it couldn't read the screen ("Inventory Tag Cluster", "Sales Report
      // Builder", "Revenue Warehouse") — anything asserted that appears in
      // NEITHER the OCR nor the speech. Drops the step when its whole identity was
      // the fabrication; otherwise keeps the true remainder.
      const grounded = groundStepInEvidence(step, win.ocr, win.text)
      if (grounded.drop) { why(label, `not backed by the screen or the speech: "${step.title}"`); continue }
      const groundingEdited = grounded.changed
      step = grounded.step

      // Completeness: codes, numbers, values and said-and-shown field names of
      // this part must reach the step. Missing ones → ONE rewrite that names
      // them; kept only when it covers more and drops no action.
      // The spoken actions are checked the same way.
      const terms = keyTerms(win.text, win.ocr)
      let miss = missingTerms(step, terms)
      let missA = missingActions(step, win.actions)
      if (worthRetry(miss) || missA.length >= 2) {
        try {
          const rawC = await runWindow(win, frame, label, prevText, nextText, visionLive && !!frame?.imageData, COVERAGE_ADDENDUM(miss, missA))
          const stepC = parseProcedureStep(rawC)
          const gC = !stepC.skip && stepC.steps?.length ? groundStepInEvidence(stepC, win.ocr, win.text) : null
          if (gC && !gC.drop) {
            const missC = missingTerms(gC.step, terms), missAC = missingActions(gC.step, win.actions)
            if (missC.length + missAC.length < miss.length + missA.length && (gC.step.steps?.length || 0) >= (step.steps?.length || 0)) {
              step = gC.step; miss = missC; missA = missAC
            }
          }
        } catch { /* keep the first step */ }
      }
      step = { ...step, steps: screenSpelling(tidyActions(step.steps, win.ocr, win.text), numberVotes), note: tidyNote(step.note) }
      if (miss.length || missA.length) console.info(`[VideoDoc] part ${label} does not mention: ${[...miss, ...missA.map((a) => `"${a}"`)].join(", ")}`)

      // Confidence flag for the reviewer: a step the model first skipped, one
      // written from thin evidence (little speech AND little readable screen
      // text), one that needed the participant-name correction, or one whose text
      // was corrected by the evidence-grounding pass. Shown as a subtle marker.
      const lowConfidence = fromRetry || nameSuspect || groundingEdited
        || ((win.text || "").length < 40 && ocrLen < 40 && !(visionLive && frame?.imageData))

      // Smart screenshot: diff the frame just BEFORE this window against the
      // evidence frame → zoomed crop with a highlight box on the changed spot.
      // Null when the whole screen changed or nothing localised happened.
      let zoomFrame = null
      try {
        const beforeFrame = nearestFrame(frames, Math.max(0, win.a - 3))
        if (frame?.imageData && beforeFrame?.imageData && beforeFrame.timestamp < (frame.timestamp ?? win.center)) {
          const crop = await smartCrop(beforeFrame.imageData, frame.imageData)
          zoomFrame = crop?.dataUrl ?? null
        }
      } catch { /* zoom is a bonus, never a blocker */ }

      results.push({
        timestamp: win.a,
        endTimestamp: win.b,
        label,
        step,                       // { title, steps[], result, note }
        annotation: stepToText(step), // plain text for doc chat / RAG
        text: win.text || step.title || "",
        frame: frame?.imageData ?? null,
        zoomFrame,                  // zoomed crop of WHERE the action happened (or null)
        // The moment the evidence screenshot was taken — step clips/GIFs center
        // HERE (where the action is visible), not on the window's start edge.
        frameTimestamp: frame?.timestamp ?? win.center,
        ocrText: win.ocr || null,
        lowConfidence,
      })
      // Live draft: let the UI render steps as they are written.
      onDraft?.([...results])
    }

    // If every window errored (wrong Ollama model, WebLLM couldn't load), surface
    // the real error instead of silently returning an empty procedure.
    if (windows.length && okCount === 0 && lastError) {
      throw new Error(`Annotation failed: ${lastError.message}. Check the selected model is installed (Ollama) or try WebLLM.`)
    }

    results.sort((x, y) => x.timestamp - y.timestamp) // a part written on its second try goes back in its place
    const out = mergeDuplicateSteps(results)
    // Expose the LLM-identified app so the UI can show the real product name
    // instead of the OCR regex's broader vendor-level hit in Tools used.
    if (appName) out.appName = appName
    return out
  }, [])

  return { annotate }
}

// Merge consecutive steps that describe the same action (identical or one title
// contained in the other). Collapses runs like "Open Reports" / "Open the Reports
// Application" into a single step, keeping the first screenshot and combining
// the unique actions. Big readability win on long recordings.
function normTitle(t) {
  return (t || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()
}
function mergeInto(target, r) {
  const seen = new Set((target.step.steps || []).map((s) => s.toLowerCase().trim()))
  for (const s of r.step.steps || []) {
    const k = s.toLowerCase().trim()
    if (!seen.has(k)) { target.step.steps.push(s); seen.add(k) }
  }
  if (r.step.result) target.step.result = r.step.result
  if (r.step.note && !target.step.note) target.step.note = r.step.note
  if ((r.step.title || "").length > (target.step.title || "").length) target.step.title = r.step.title
  target.endTimestamp = r.endTimestamp
  target.annotation = stepToText(target.step)
}
function mergeDuplicateSteps(results) {
  const out = []
  const seenTitles = new Map() // exact normalized title -> index in out
  for (const r of results) {
    const b = normTitle(r?.step?.title)
    const prev = out[out.length - 1]
    const a = normTitle(prev?.step?.title)
    // 1) consecutive near-duplicate (exact OR one title contains the other)
    if (prev && a && b && (a === b || (a.length > 6 && b.length > 6 && (a.includes(b) || b.includes(a))))) {
      mergeInto(prev, r); continue
    }
    // 2) exact-title duplicate seen earlier anywhere → fold into that step
    if (b && seenTitles.has(b)) { mergeInto(out[seenTitles.get(b)], r); continue }
    seenTitles.set(b, out.length)
    out.push(r)
  }
  return out
}
