import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Uploader from "./components/Uploader"
import VideoPlayer from "./components/VideoPlayer"
import DocPreview from "./components/DocPreview"
import ExportBar from "./components/ExportBar"
import FrameStrip from "./components/FrameStrip"
import AISettings from "./components/AISettings"
import DocChat from "./components/DocChat"
import PipelineStatus from "./components/PipelineStatus"
import InsightsPanel from "./components/InsightsPanel"
import VideoDocLogo from "./components/VideoDocLogo"
import ErrorBoundary from "./components/ErrorBoundary"
import useFrameExtractor from "./hooks/useFrameExtractor"
import useAudioExtractor from "./hooks/useAudioExtractor"
import useTranscriber from "./hooks/useTranscriber"
import useAnnotator from "./hooks/useAnnotator"
import useOCR from "./hooks/useOCR"
import { webLLMLabel, isWebLLMVision, ollamaModelHasVision } from "./lib/llm"
import { generateInsights } from "./lib/insights"
import { flowFromDocs, flowToMermaid } from "./lib/flow"
import { consolidateProcedure, verifyProcedure, sanitizeDocs } from "./lib/refine"
import { scrubSensitive, tidyLine } from "./lib/skillPrompt"
import { fixTranscriptChunks } from "./lib/transcriptFixups"
import { fixChunksWithScreen } from "./lib/screenVocab"
import { userSpelling } from "./lib/terms"
import { runKey, loadRun, saveRun } from "./lib/resume"
import { post, compactSteps, setVideoDocs } from "./lib/bridge"
import { discardSavedRecording } from "./lib/recorder"
import { screenCounts, screenSpelling, screenNames, tidyActions, tidyNote, dropRepeatedParts, inOtherPart } from "./lib/coverage"
import { buildStepShots } from "./lib/stepShots"

const INITIAL_STEPS = [
  { id: 'frames',     label: 'Extract Frames',   status: 'pending', detail: null },
  { id: 'audio',      label: 'Extract Audio',     status: 'pending', detail: null },
  { id: 'transcribe', label: 'Transcribe Audio',  status: 'pending', detail: null, pct: null },
  { id: 'ocr',        label: 'Read Screen (OCR)', status: 'pending', detail: null, pct: null, step: null, total: null },
  { id: 'loadmodel',  label: 'Load AI Model',     status: 'pending', detail: null, pct: null },
  { id: 'annotate',   label: 'Write Procedure Steps', status: 'pending', detail: null, pct: null, step: null, total: null, etaMs: null },
  { id: 'verify',     label: 'Self-Verify Steps', status: 'pending', detail: null, pct: null, step: null, total: null, etaMs: null },
  { id: 'consolidate',label: 'Consolidate Procedure', status: 'pending', detail: null },
  { id: 'insights',   label: 'Purpose · Summary · FAQ · Flow', status: 'pending', detail: null },
]

export default function App() {
  const [videoFile, setVideoFile] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0) // seconds; drives the upfront time estimate

  // Whole-run expectation shown in the processing card from the FIRST second
  // after a drop. The backend isn't chosen yet, so span the fast end (Ollama)
  // to the slow end (in-browser model); the AI settings dialog refines it.
  const runEtaHint = useMemo(() => {
    if (!videoDuration) return null
    // No guessed number: run time differs ten-fold between computers and models.
    // The time left is measured live once the AI has written its first part.
    return "How long this takes depends on your computer and the AI model you pick. The time left appears as soon as the AI has written its first part, measured on this computer. Steps appear live as they are written. Keep this tab open and in front: then the computer stays awake until it is done."
  }, [videoDuration])
  const [frames, setFrames] = useState([])
  const [activeFrame, setActiveFrame] = useState(null)
  const [seekTo, setSeekTo] = useState(null)
  const [transcriptChunks, setTranscriptChunks] = useState([])
  const [annotatedDocs, setAnnotatedDocs] = useState([])
  const [showAISettings, setShowAISettings] = useState(false)
  const [pipelineSteps, setPipelineSteps] = useState(null)
  const [error, setError] = useState(null)
  const [ocrFrameTexts, setOcrFrameTexts] = useState([])
  // Marked-up screenshots: each action pinned to its spot on screen. Rebuilt
  // whenever a step is edited, so markers always match the written actions.
  const markedDocs = useMemo(() => {
    if (!annotatedDocs?.length) return annotatedDocs
    try {
      const shots = buildStepShots(annotatedDocs, ocrFrameTexts, frames, transcriptChunks)
      return annotatedDocs.map((d, i) => ({ ...d, shots: shots[i].shots, marks: shots[i].marks }))
    } catch (e) {
      // markers are a bonus: a failure here must never cost the written guide
      console.error("marked screenshots skipped", e)
      return annotatedDocs
    }
  }, [annotatedDocs, ocrFrameTexts, frames, transcriptChunks])

  const [toolsUsed, setToolsUsed] = useState([])
  const [sceneCuts, setSceneCuts] = useState([]) // pixel-level screen-change timestamps (step boundaries)
  const [participants, setParticipants] = useState([]) // names from webcam tiles — blocked from becoming artifact names
  const [docTitle, setDocTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [insights, setInsights] = useState(null)
  const termsRef = useRef([]) // the key words the user typed for this video
  const runRef = useRef({ key: null, saved: null }) // pick up where it stopped (lib/resume.js)
  const [aiMode, setAiMode] = useState(null)
  const [aiModel, setAiModel] = useState(null)

  const annotateStartRef = useRef(null)
  const cancelRef = useRef(false)

  const { extractFrames } = useFrameExtractor()
  const { extractAudio } = useAudioExtractor()
  const { transcribe, cancelTranscribe, transcribeProgress } = useTranscriber()
  const { annotate } = useAnnotator()
  const { runOCR } = useOCR()

  const updateStep = useCallback((id, updates) => {
    setPipelineSteps(prev =>
      prev?.map(s => {
        if (s.id !== id) return s
        // a finished step ignores late progress (counts, %, detail); only a
        // real new status, like a new run, may change it again
        if ((s.status === 'done' || s.status === 'error') && !('status' in updates)) return s
        return { ...s, ...updates }
      }) ?? null
    )
  }, [])

  const handleCancel = useCallback(() => {
    cancelRef.current = true
    cancelTranscribe()
    setError("Processing cancelled. Whatever finished is kept below.")
    setPipelineSteps(prev => prev?.map(s =>
      s.status === 'active' ? { ...s, status: 'error', detail: 'Cancelled', endedAt: Date.now() } : s
    ) ?? null)
  }, [cancelTranscribe])

  // A run takes up to an hour, and a laptop left alone falls asleep (often after
  // 30 minutes), which cut two test runs in half. While anything is processing,
  // ask the browser to keep the screen and so the computer awake; let go after.
  const busy = !!pipelineSteps?.some(s => s.status === 'active')
  // Sleep shows up as a jump of the clock. Hidden tabs tick only once a minute,
  // so a gap counts as sleep from 90 s; it is kept off the running steps' time.
  useEffect(() => {
    if (!busy) return
    let last = Date.now()
    const id = setInterval(() => {
      const t = Date.now(), gap = t - last - 1000; last = t
      if (gap > 90000) setPipelineSteps(prev => prev?.map(s => s.status === 'active' ? { ...s, slept: (s.slept || 0) + gap } : s) ?? null)
    }, 1000)
    return () => clearInterval(id)
  }, [busy])
  useEffect(() => {
    if (!busy || !navigator.wakeLock) return
    let lock = null, live = true
    const grab = async () => {
      try { if (live && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen') } catch { /* not allowed here: the note below still helps */ }
    }
    grab()
    document.addEventListener('visibilitychange', grab) // the lock drops when the tab is hidden; take it back
    return () => { live = false; document.removeEventListener('visibilitychange', grab); lock?.release().catch(() => {}) }
  }, [busy])

  // Closing or reloading the tab mid-run throws away up to an hour of work
  // without a word; the browser's own "Leave site?" question stops that.
  useEffect(() => {
    if (!busy) return
    const stay = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', stay)
    return () => window.removeEventListener('beforeunload', stay)
  }, [busy])

  const handleNewVideo = () => {
    if (annotatedDocs.length > 0 && !window.confirm('Start a new video? This guide is cleared, so export it first if you want to keep it.')) return
    setVideoFile(null)
    setPipelineSteps(null)
    setError(null)
    setAnnotatedDocs([])
    setTranscriptChunks([])
    setFrames([])
    setOcrFrameTexts([])
    setToolsUsed([])
    setInsights(null)
    setDocTitle("")
  }

  useEffect(() => {
    if (!transcribeProgress) return
    setPipelineSteps(prev => prev?.map(s => {
      if (s.id !== 'transcribe') return s
      // a late progress message must never reopen a finished step (it showed
      // "Transcribe Audio" spinning next to the next step)
      if (s.status === 'done' || s.status === 'error') return s
      if (transcribeProgress.stage === 'downloading') {
        const mb = transcribeProgress.mb
        const detail = mb ? `Downloading the speech model: ${mb[0]} of ${mb[1]} MB (first run only, kept for next time)` : 'Downloading the speech model (first run only, kept for next time)'
        return { ...s, status: 'active', detail, pct: transcribeProgress.pct, startedAt: s.startedAt ?? Date.now() }
      }
      if (transcribeProgress.stage === 'transcribing') {
        const { pct, window, windows, heard, of } = transcribeProgress
        const detail = heard != null ? `Listening to the audio: minute ${heard} of ${of}`
          : windows > 1 ? `Transcribing… part ${window}/${windows}` : 'Running speech-to-text...'
        return { ...s, status: 'active', detail, pct: pct ?? null, startedAt: s.startedAt ?? Date.now() }
      }
      return s
    }) ?? null)
  }, [transcribeProgress])

  const handleVideoSelect = async (file, opts = {}) => {
    setError(null)
    cancelRef.current = false
    setAnnotatedDocs([])
    setTranscriptChunks([])
    setFrames([])
    setOcrFrameTexts([])
    setToolsUsed([])
    setDocTitle("")
    setInsights(null)
    setVideoFile(file)
    // Duration from metadata only (instant, no decode) — powers the upfront
    // "this will take about X minutes" estimate in the AI settings dialog.
    setVideoDuration(0)
    try {
      const v = document.createElement("video")
      v.preload = "metadata"
      v.onloadedmetadata = () => {
        if (isFinite(v.duration)) setVideoDuration(v.duration)
        URL.revokeObjectURL(v.src)
      }
      v.src = URL.createObjectURL(file)
    } catch { /* estimate simply not shown */ }
    setPipelineSteps(INITIAL_STEPS.map((s, i) =>
      i === 0 ? { ...s, status: 'active', startedAt: Date.now() } : s
    ))

    try {
      const extracted = await extractFrames(file, 5, (i, total) =>
        updateStep('frames', { detail: `${i}/${total} frames`, pct: total ? Math.round((i / total) * 100) : null })
      )
      // a renamed text file or a broken download gives no pictures at all
      if (!extracted.length) throw new Error("This file could not be read as a video. Choose a screen recording in MP4, MOV or WEBM.")
      setFrames(extracted)
      updateStep('frames', { status: 'done', detail: `${extracted.length} frames`, pct: 100, endedAt: Date.now() })

      // the same video and settings as an unfinished run: reuse its transcript
      // and screen text instead of doing them again
      const key = runKey(file, opts)
      const saved = await loadRun(key)
      runRef.current = { key, saved }
      const s1 = saved?.stage1
      if (s1 && s1.frameCount === extracted.length) {
        const again = 'kept from the last try'
        updateStep('audio', { status: 'done', detail: again, startedAt: Date.now(), endedAt: Date.now() })
        updateStep('transcribe', { status: 'done', detail: `${s1.chunks.length} segments, ${again}`, startedAt: Date.now(), endedAt: Date.now() })
        updateStep('ocr', { status: 'done', detail: `${s1.frameTexts.length} frames read, ${again}`, startedAt: Date.now(), endedAt: Date.now() })
        setTranscriptChunks(s1.chunks)
        setOcrFrameTexts(s1.frameTexts)
        termsRef.current = opts.terms || []
        setTranscriptChunks(fixChunksWithScreen(s1.chunks, s1.frameTexts, termsRef.current))
        setSceneCuts(s1.cuts || [])
        setParticipants(s1.people || [])
        setToolsUsed(s1.tools || [])
        setShowAISettings(true)
        return
      }

      // The speech of the same video is reused even when a frame or two came out
      // differently this time (a slow seek on a busy computer skips a frame):
      // only the screen is read again then.
      let chunks
      if (s1?.chunks) {
        const again = 'kept from the last try'
        updateStep('audio', { status: 'done', detail: again, startedAt: Date.now(), endedAt: Date.now() })
        updateStep('transcribe', { status: 'done', detail: `${s1.chunks.length} segments, ${again}`, startedAt: Date.now(), endedAt: Date.now() })
        chunks = s1.chunks
        setTranscriptChunks(chunks)
      } else {
        updateStep('audio', { status: 'active', detail: 'Reading audio track...', startedAt: Date.now() })
        // Many screen recorders save no sound at all. The pictures are fine, so
        // the guide is then written from the screen alone instead of stopping.
        const sound = await extractAudio(file).catch(() => null)
        updateStep('audio', { status: 'done', detail: sound ? `${sound.sampleRate / 1000}kHz mono` : 'No sound in this video (or it could not be read)', endedAt: Date.now() })

        updateStep('transcribe', { status: 'active', detail: sound ? 'Loading model...' : 'Skipped', startedAt: Date.now() })
        const result = sound ? await transcribe(sound.audio, sound.sampleRate, opts.language || 'en', !!opts.accurate) : { chunks: [] }
        chunks = fixTranscriptChunks(result?.chunks ?? [])           // correct known domain mis-hearings
          .map(c => ({ ...c, text: scrubSensitive(c.text) }))               // scrub ASR mis-hears like "Hitler" before anything sees them
        setTranscriptChunks(chunks)
        if (cancelRef.current || result?.cancelled) {
          updateStep('transcribe', { status: 'error', detail: `Cancelled · ${chunks.length} segments kept`, endedAt: Date.now() })
          return
        }
        updateStep('transcribe', { status: 'done', detail: chunks.length ? `${chunks.length} segments found` : 'No speech: the guide is written from the screen only', endedAt: Date.now() })
      }

      // OCR: read on-screen text from frames → captures exact UI labels + detects tools used
      updateStep('ocr', { status: 'active', detail: 'Reading on-screen text...', startedAt: Date.now() })
      const transcriptText = chunks.map(c => c.text).join(' ')
      const { frameTexts, tools, sceneCuts: cuts, participants: people } = await runOCR(extracted, transcriptText,
        (i, total) => updateStep('ocr', { step: i + 1, total }))
      setOcrFrameTexts(frameTexts)
      // the screen spells the app's abbreviations right: "KBI report" heard,
      // "KPI Report" shown → the transcript takes the screen's spelling
      termsRef.current = opts.terms || []
      setTranscriptChunks(fixChunksWithScreen(chunks, frameTexts, termsRef.current))
      setSceneCuts(cuts || [])
      setParticipants(people || [])
      setToolsUsed(tools)
      updateStep('ocr', { status: 'done', detail: tools.length ? `Tools: ${tools.join(', ')}` : `${frameTexts.length} frames read`, endedAt: Date.now() })
      saveRun(key, { stage1: { frameCount: extracted.length, chunks, frameTexts, tools, cuts: cuts || [], people: people || [] }, ...(s1 ? {} : { annot: null }) }) // a run that had begun keeps its written parts

      setShowAISettings(true)
    } catch (e) {
      setPipelineSteps(prev =>
        prev?.map(s =>
          s.status === 'active' ? { ...s, status: 'error', detail: e.message, endedAt: Date.now() } : s
        ) ?? null
      )
      setError(e.message)
    }
  }

  const handleStartAnnotation = async (aiMode, sections, model, title, company, refine = {}) => {
    // remembered, so the browser plugin can start the next guide the same way
    try { localStorage.setItem('vd-last-ai', JSON.stringify([aiMode, sections, model, '', '', refine])) } catch { /* private window */ }
    setShowAISettings(false)
    setError(null)
    cancelRef.current = false
    if (title) setDocTitle(title)
    setCompanyName(company || "")
    setInsights(null)
    setAiMode(aiMode)
    setAiModel(model)
    // Server-side engines (Ollama, the bundled desktop engine) load the model
    // themselves; only WebLLM streams the load into the browser.
    const isServer = aiMode === 'ollama' || aiMode === 'local'
    const isWeb = !isServer
    // Vision: does the chosen model take screenshots? Bundled gemma3 is multimodal,
    // so vision is always on for "local".
    const useVision = aiMode === 'local' ? true
      : isWeb ? isWebLLMVision(model)
      : await ollamaModelHasVision(model)
    annotateStartRef.current = null // set when token generation actually begins

    // "Load AI Model" step: tracked live for WebLLM (download → GPU → compile →
    // ready); server engines load on their own so we just mark it ready.
    if (isWeb) {
      updateStep('loadmodel', { status: 'active', detail: 'Preparing browser AI...', pct: null, startedAt: Date.now(), endedAt: null })
    } else {
      annotateStartRef.current = Date.now()
      const engineLabel = aiMode === 'local' ? 'Bundled engine' : 'Ollama'
      updateStep('loadmodel', { status: 'done', detail: `${engineLabel} · ${model || 'gemma3'}`, startedAt: Date.now(), endedAt: Date.now() })
    }

    const modelLabel = (isWeb ? `WebLLM · ${webLLMLabel(model)}` : aiMode === 'local' ? 'Bundled · gemma3' : (model || 'ollama')) + (useVision ? ' · 👁 vision' : '')
    updateStep('annotate', {
      status: isWeb ? 'pending' : 'active',
      // the real step count is only known after the narration pass: until then
      // a moving bar, not a made-up "0/100"
      step: null,
      total: null,
      pct: null,
      etaMs: null,
      detail: `${modelLabel}${sections?.length ? ` · ${sections.length} sections` : ' · auto steps'}`,
      startedAt: isWeb ? null : Date.now(),
    })

    // Flip from "loading model" to "generating" the moment the model is ready.
    const markGenStart = () => {
      if (annotateStartRef.current) return
      annotateStartRef.current = Date.now()
      updateStep('loadmodel', { status: 'done', detail: 'Model ready on WebGPU', endedAt: Date.now() })
      updateStep('annotate', { status: 'active', startedAt: Date.now() })
    }

    // pick up where it stopped: the same video, model and settings as an
    // unfinished run keep its parts (lib/resume.js)
    const rk = runRef.current
    const sig = [aiMode, model, JSON.stringify(sections || []), useVision, (termsRef.current || []).join(",")].join("|")
    const prev = rk.saved?.annot?.sig === sig ? rk.saved.annot : null
    let annot = prev || { sig, done: {} }
    const resume = rk.key ? {
      segments: prev?.segments, plan: prev?.plan, done: prev?.done || {},
      save: (patch) => { annot = { ...annot, ...patch, done: { ...annot.done, ...(patch.done || {}) } }; saveRun(rk.key, { annot }) },
    } : null
    const kept = Object.keys(resume?.done || {}).length
    if (kept) updateStep('annotate', { detail: `Picking up where it stopped: ${kept} parts already written` })

    try {
      const docs = await annotate(
        transcriptChunks,
        frames,
        aiMode,
        (i, total) => {
          const started = annotateStartRef.current
          let etaMs = null
          if (started && i > 0) {
            const avgMs = (Date.now() - started) / i
            etaMs = (total - i) * avgMs
          }
          // replace the earlier status line, so it never shows a finished stage
          updateStep('annotate', { step: i + 1, total, etaMs: etaMs > 0 ? etaMs : null,
            detail: `Writing part ${i + 1} of ${total}: the AI looks at the screen and the narration of this part${kept ? ` (${kept} part${kept > 1 ? 's' : ''} kept from the last try)` : ''}` })
        },
        // model-loading status (WebLLM): drive the Load AI Model step
        (msg, pct, phase) => {
          if (!isWeb) { updateStep('annotate', { detail: msg }); return }
          if (phase === 'ready') { markGenStart(); return }
          updateStep('loadmodel', { status: 'active', detail: msg, pct: pct ?? null })
        },
        sections,
        model,
        ocrFrameTexts,
        () => cancelRef.current,
        useVision,
        sceneCuts,
        // Live drafts: steps appear in the panel as they are written, so the
        // user watches the document grow instead of staring at a progress bar.
        (draft) => setAnnotatedDocs(draft),
        participants,
        termsRef.current,
        resume,
      )
      if (cancelRef.current) {
        setAnnotatedDocs(docs)
        updateStep('annotate', { status: 'error', detail: `Cancelled · ${docs.filter(d => d.annotation).length} done`, endedAt: Date.now() })
        return
      }
      updateStep('annotate', { status: 'done', detail: `${docs.length} entries annotated`, endedAt: Date.now() })
      if (rk.key) saveRun(rk.key, { annot: null }) // finished: a new run writes the parts again

      // The annotator's LLM app-id READ the actual screen to name the app —
      // more reliable than the OCR regex sweep, which sees a vendor name in a garbled
      // URL and reports the generic product. Put the specific name first and
      // drop the generic hit it supersedes. Local var (not state) so the
      // insights call below sees it too.
      let effectiveTools = toolsUsed
      if (docs.appName) {
        effectiveTools = [docs.appName, ...toolsUsed.filter(
          (t) => t !== docs.appName && !docs.appName.toLowerCase().startsWith(t.toLowerCase()),
        )]
        setToolsUsed(effectiveTools)
      }

      let finalDocs = docs
      // Every stage lists what each part holds, in the browser console, so a lost
      // action can always be traced to the stage that lost it.
      const trace = (stage, list) => console.info(`[VideoDoc] after ${stage}: ` + list.map((d) =>
        `${d.label} "${d.step?.title || ""}" [${(d.step?.steps || []).map((a) => a.slice(0, 50)).join(" | ")}]`).join(" ;; "))
      trace("writing", finalDocs)

      // Self-verify pass: fact-check every step against its own evidence and drop
      // anything the model can't actually support. Best-effort.
      if (refine.selfVerify && finalDocs.length > 0) {
        updateStep('verify', { status: 'active', step: 0, total: finalDocs.length, detail: 'Re-checking each step against the screen…', startedAt: Date.now() })
        const before = finalDocs.length
        try {
          finalDocs = await verifyProcedure(
            finalDocs, aiMode, model, useVision,
            (msg) => updateStep('verify', { detail: msg }),
            (i, total) => updateStep('verify', { step: i, total }),
            () => cancelRef.current,
            participants,
          )
        } catch { /* keep drafts */ }
        trace("checking", finalDocs)
        const dropped = before - finalDocs.length
        updateStep('verify', { status: 'done', detail: dropped > 0 ? `${finalDocs.length} kept · ${dropped} unsupported removed` : `${finalDocs.length} verified`, endedAt: Date.now() })
      } else {
        updateStep('verify', { status: 'done', detail: 'Skipped', endedAt: Date.now() })
      }

      // Consolidation pass: tidy titles across the whole procedure and fold
      // adjacent duplicate phases so it reads as one coherent SOP. Best-effort.
      if (refine.consolidate && finalDocs.length > 1) {
        updateStep('consolidate', { status: 'active', detail: 'Tidying titles & merging duplicates…', startedAt: Date.now() })
        try {
          finalDocs = await consolidateProcedure(finalDocs, aiMode, model, (m) => updateStep('consolidate', { detail: m }), () => cancelRef.current)
        } catch { /* keep as-is */ }
        trace("tidying", finalDocs)
        updateStep('consolidate', { status: 'done', detail: `${finalDocs.length} coherent steps`, endedAt: Date.now() })
      } else {
        updateStep('consolidate', { status: 'done', detail: 'Skipped', endedAt: Date.now() })
      }

      // Last line of defense, AFTER every LLM rewrite above: the verify and
      // consolidate passes can re-introduce meeting-logistics titles or a
      // participant's name as an artifact name. Deterministic scrub so nothing
      // poisoned reaches the document or the insights built from it.
      finalDocs = sanitizeDocs(finalDocs, participants)
      // last word on numbers: the screen's most-read spelling (no later stage may
      // bring back a heard "4502188" for the "4502168" on screen)
      const votes = screenCounts(ocrFrameTexts)
      finalDocs = finalDocs.map((d) => d.step ? { ...d, suggest: (d.suggest || []).filter((s) => { const m = s.match(/^Use '(.+)'\.$/); return !m || !JSON.stringify(d.step).toLowerCase().replace(/[^a-z0-9]/g, '').includes(m[1].toLowerCase().replace(/[^a-z0-9]/g, '')) }), step: { ...d.step, title: userSpelling(d.step.title, termsRef.current), steps: screenNames(screenSpelling(tidyActions((d.step.steps || []).map(tidyLine), d.ocrText || "", d.text || ""), votes), d.ocrText || "").map((x) => userSpelling(x, termsRef.current)), note: tidyNote(d.step.note) } } : d)
      finalDocs = dropRepeatedParts(finalDocs) // a part that only repeats the one before it
      finalDocs = finalDocs.map((d, i) => d.suggest?.length ? { ...d, suggest: d.suggest.filter((s) => !inOtherPart(s, finalDocs, i)) } : d)
      trace("final", finalDocs)

      setAnnotatedDocs(finalDocs)

      // Insights pass: facilitator summary, FAQ (incl. questions asked in the
      // meeting) and a Mermaid flow diagram. Best-effort — a failure here must
      // not lose the annotations the user already has.
      updateStep('insights', { status: 'active', detail: 'Writing summary…', startedAt: Date.now() })
      try {
        const result = await generateInsights(
          finalDocs, transcriptChunks, aiMode, model,
          (msg) => updateStep('insights', { detail: msg }),
          () => cancelRef.current,
          effectiveTools,
        )
        setInsights(result)
        const bits = [
          result.summary ? 'summary' : null,
          result.faqs?.length ? `${result.faqs.length} FAQs` : null,
          result.mermaid ? 'flow' : null,
        ].filter(Boolean)
        updateStep('insights', { status: 'done', detail: bits.length ? bits.join(' · ') : 'skipped', endedAt: Date.now() })
      } catch (e) {
        updateStep('insights', { status: 'error', detail: e.message, endedAt: Date.now() })
      }
    } catch (e) {
      updateStep('annotate', { status: 'error', detail: e.message, endedAt: Date.now() })
      if (isWeb) updateStep('loadmodel', { status: 'error', detail: e.message, endedAt: Date.now() })
      setError(e.message)
    }
  }

  const handleFrameSelect = (timestamp, index) => {
    setActiveFrame(index)
    setSeekTo(timestamp)
  }

  const handleDocSeek = (timestamp) => {
    const frameIndex = frames.reduce((bestIdx, f, i) =>
      Math.abs(f.timestamp - timestamp) < Math.abs(frames[bestIdx].timestamp - timestamp) ? i : bestIdx
    , 0)
    setActiveFrame(frameIndex)
    setSeekTo(timestamp)
  }

  // ── In-app editing (so a non-technical user can fix the AI's text & export) ──
  const stepToPlain = (step) => !step ? "" : [
    step.title,
    ...(step.steps || []).map((s, i) => `${i + 1}. ${s}`),
    step.result ? `Result: ${step.result}` : "",
    step.note ? `Note: ${step.note}` : "",
  ].filter(Boolean).join("\n")

  // The flow diagram follows the steps (renamed, moved, deleted), unless the
  // user has drawn their own boxes (insights.flow); then theirs is kept.
  const liveInsights = useMemo(() => {
    if (!insights) return insights
    const flowAuto = flowFromDocs(annotatedDocs)
    const mermaid = insights.flow ? flowToMermaid(insights.flow) : (flowAuto.length ? flowToMermaid(flowAuto) : insights.mermaid)
    return { ...insights, flowAuto, mermaid }
  }, [insights, annotatedDocs])

  // Save an edited step in place.
  const handleEditStep = useCallback((index, newStep) => {
    setAnnotatedDocs(prev => prev.map((d, i) =>
      i === index ? { ...d, step: newStep, annotation: stepToPlain(newStep) } : d))
  }, [])

  // Reorder a step (dir: -1 up, +1 down) and remove a step. The AI gets the
  // order right most of the time, but the human editing the doc has the final
  // say, and edits here flow into every export.
  const handleMoveStep = useCallback((index, dir) => {
    setAnnotatedDocs(prev => {
      const j = index + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }, [])

  const handleDeleteStep = useCallback((index) => {
    setAnnotatedDocs(prev => prev.filter((_, i) => i !== index))
  }, [])

  // One correction applied everywhere — fix a word/acronym once, it changes across
  // the whole document (whole-word, case-sensitive).
  const handleReplaceEverywhere = useCallback((find, replace) => {
    const f = (find || "").trim()
    if (!f || f === replace) return
    const re = new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")
    const fix = (s) => typeof s === "string" ? s.replace(re, replace) : s
    setAnnotatedDocs(prev => prev.map(d => {
      if (!d.step) return d
      const st = {
        ...d.step,
        title: fix(d.step.title),
        steps: (d.step.steps || []).map(fix),
        result: fix(d.step.result),
        note: fix(d.step.note),
      }
      return { ...d, step: st, annotation: stepToPlain(st) }
    }))
  }, [])

  const isAnnotating = pipelineSteps?.find(s => s.id === 'annotate')?.status === 'active'

  // Live status for the browser plugin's side panel (lib/bridge.js)
  const insightsDone = pipelineSteps?.find(s => s.id === 'insights')?.status === 'done'
  useEffect(() => { if (insightsDone) discardSavedRecording() }, [insightsDone]) // its guide is done
  // what the plugin's chat answers from: the guide, or the speech before it is written
  useEffect(() => { setVideoDocs(annotatedDocs.length ? markedDocs : transcriptChunks.map((c) => ({ label: `${Math.floor((c.timestamp?.[0] ?? 0) / 60)}:${String(Math.floor((c.timestamp?.[0] ?? 0) % 60)).padStart(2, '0')}`, text: c.text, timestamp: c.timestamp?.[0] ?? 0, frame: null, annotation: null }))) }, [annotatedDocs, markedDocs, transcriptChunks])
  const runState = !videoFile ? 'upload' : busy ? 'working' : showAISettings ? 'settings'
    : error || pipelineSteps?.some(s => s.status === 'error') ? 'stopped' : insightsDone ? 'done' : 'ready'
  useEffect(() => {
    if (runState === 'upload') return // the upload page reports recording itself
    let lastAI = null
    try { const l = JSON.parse(localStorage.getItem('vd-last-ai') || 'null'); if (l) lastAI = l[0] === 'ollama' ? `Ollama · ${l[2]}` : l[0] === 'local' ? 'Bundled engine' : `Browser AI · ${l[2]}` } catch { /* none */ }
    post('status', { state: runState, steps: compactSteps(pipelineSteps), title: docTitle || videoFile?.name || '', file: videoFile?.name || '', lastAI, error: error || '' })
  }, [runState, pipelineSteps, docTitle, videoFile, error])
  useEffect(() => { if (runState === 'upload') post('status', { state: 'upload', steps: [] }) }, [runState])

  // plugin commands: start with the last AI settings, or start a new video
  useEffect(() => {
    const gen = () => {
      if (!showAISettings) return
      try { const l = JSON.parse(localStorage.getItem('vd-last-ai') || 'null'); if (l) handleStartAnnotation(...l) } catch { /* none saved */ }
    }
    const fresh = () => { if (!busy) handleNewVideo() }
    window.addEventListener('videodoc:generate', gen); window.addEventListener('videodoc:new', fresh)
    return () => { window.removeEventListener('videodoc:generate', gen); window.removeEventListener('videodoc:new', fresh) }
  })

  return (
    <div className="min-h-screen text-white font-sans" style={{ position: 'relative', background: '#0d0d2b' }}>
      {/* Fixed background — inset:0 (not 100vw) so the vertical
          scrollbar that appears during processing can't cause horizontal overflow */}
      <div className="app-bg" />
      {/* Dark overlay for readability */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'rgba(8,5,20,0.5)', pointerEvents: 'none' }} />
      {/* Content above the background */}
      <div style={{ position: 'relative', zIndex: 1 }}>
      {showAISettings && (
        <AISettings
          onConfirm={handleStartAnnotation}
          onClose={() => setShowAISettings(false)}
          toolsUsed={toolsUsed}
          videoDuration={videoDuration}
        />
      )}

      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3 bg-[#0b0820]/95 sticky top-0 z-40">
        <button
          onClick={() => { window.location.href = '/#/' }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight group"
          title="Back to home"
        >
          <VideoDocLogo size={26} />
          <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent group-hover:from-violet-200 group-hover:to-cyan-200 transition-colors">VideoDoc</span>
        </button>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Runs on your computer
        </span>
        <a href="/#/docchat" className="text-xs text-zinc-400 hover:text-violet-300 transition-colors">Doc Chat</a>
        <a href="/#/howto" className="text-xs text-zinc-400 hover:text-violet-300 transition-colors">How to use</a>
        <a href="/#/pet-training" className="text-xs text-zinc-400 hover:text-violet-300 transition-colors">Pet training</a>
        <a href="/#/policy" className="text-xs text-zinc-400 hover:text-violet-300 transition-colors">Privacy</a>

        {videoFile && !showAISettings && !isAnnotating && frames.length > 0 && !busy && (
          <button
            onClick={() => setShowAISettings(true)}
            className="ml-auto text-xs border border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 text-zinc-400 rounded-lg px-3 py-1.5 transition-all"
          >
            {annotatedDocs.length > 0 ? "Re-annotate" : "Annotate"}
          </button>
        )}
        {/* without this, a failed or finished video could only be replaced by reloading the page */}
        {videoFile && !busy && !showAISettings && (
          <button
            onClick={handleNewVideo}
            className={`${frames.length > 0 ? '' : 'ml-auto '}text-xs border border-violet-500/50 hover:border-violet-300 hover:text-violet-200 text-violet-300 rounded-lg px-3 py-1.5 transition-all`}
          >
            New video
          </button>
        )}

        {!videoFile && (
          <button
            onClick={() => { window.location.href = '/#/' }}
            className="text-xs text-zinc-500 hover:text-zinc-300 ml-auto transition-colors"
          >
            ← Back to home
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {!videoFile ? (
          <Uploader onVideoSelect={handleVideoSelect} />
        ) : (
          <>
            {pipelineSteps && (
              <div className="space-y-2">
                <PipelineStatus steps={pipelineSteps} etaHint={runEtaHint} />
                {pipelineSteps.some(s => s.status === 'active') && (
                  <button
                    onClick={handleCancel}
                    className="text-xs border border-red-800/60 hover:border-red-500 hover:bg-red-950/30 text-red-300 rounded-lg px-3 py-1.5 transition-all"
                  >
                    ✕ Cancel processing
                  </button>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="bg-red-950/40 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <VideoPlayer file={videoFile} seekTo={seekTo} />
                <FrameStrip frames={frames} activeIndex={activeFrame} onSelect={handleFrameSelect} />
              </div>
              <div className="space-y-4">
                <ErrorBoundary name="The guide preview">
                  <DocPreview
                    transcriptChunks={transcriptChunks}
                    annotatedDocs={markedDocs}
                    onSeek={handleDocSeek}
                    onEditStep={handleEditStep}
                    onMoveStep={handleMoveStep}
                    onDeleteStep={handleDeleteStep}
                    onReplaceEverywhere={handleReplaceEverywhere}
                  />
                </ErrorBoundary>
              </div>
            </div>

            {insights && <ErrorBoundary name="Summary and FAQ"><InsightsPanel insights={liveInsights} onChange={setInsights} /></ErrorBoundary>}

            <ErrorBoundary name="Export">
            <ExportBar
              annotatedDocs={markedDocs}
              transcriptChunks={transcriptChunks}
              videoName={videoFile.name}
              videoFile={videoFile}
              docTitle={docTitle}
              companyName={companyName}
              insights={liveInsights}
              toolsUsed={toolsUsed}
              frames={frames}
              videoDuration={videoDuration}
            />
            </ErrorBoundary>

            {(annotatedDocs.length > 0 || transcriptChunks.length > 0) && (
              <ErrorBoundary name="Vid Chat">
              <DocChat
                docs={annotatedDocs.length > 0 ? markedDocs : transcriptChunks.map(c => {
                  const ts = c.timestamp?.[0] ?? 0
                  const m = Math.floor(ts / 60).toString().padStart(2, "0")
                  const s = Math.floor(ts % 60).toString().padStart(2, "0")
                  const fr = frames.length
                    ? frames.reduce((b, f) => Math.abs(f.timestamp - ts) < Math.abs(b.timestamp - ts) ? f : b, frames[0])
                    : null
                  return { label: `${m}:${s}`, text: c.text, timestamp: ts, frame: fr?.imageData ?? null, annotation: null }
                })}
                aiMode={aiMode || "webllm"}
                ollamaModel={aiModel}
                onSeek={handleDocSeek}
                allowDocs
              />
              </ErrorBoundary>
            )}
          </>
        )}
      </main>
      </div>
    </div>
  )
}
