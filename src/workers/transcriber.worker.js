import { pipeline, env } from '@huggingface/transformers'

// transformers.js points the ONNX runtime at jsdelivr by default. Serve those
// two files from our own origin instead, so running a transcript does not call
// out to a CDN. The build copies them into /ort (see vite.config.js).
if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.wasmPaths = '/ort/'

// The desktop build ships the speech model inside the app folder, so it never
// reaches Hugging Face. The hosted build still downloads it once, since nobody
// wants a 970MB web page.
if (import.meta.env.VITE_BUILD_TARGET === 'desktop') {
  env.allowRemoteModels = false
  env.localModelPath = '/models/'
}

const pipes = {}
let cancelled = false

// English recordings use whisper-small.en (most accurate for English). Any other
// language uses the multilingual whisper-small and translates the speech to
// English, so the guide is always written from an English transcript.
const MODEL_EN = 'Xenova/whisper-small.en'
const MODEL_ALL = 'Xenova/whisper-small'

async function load(onProgress, language = 'en') {
  const id = language === 'en' ? MODEL_EN : MODEL_ALL
  if (!pipes[id]) {
    // whisper-small.en — best accuracy on accented / technical speech (names,
    // jargon and product names). The transcript is the LLM's only "ears",
    // so this is the single biggest lever on documentation quality. Larger
    // (~970MB one-time download) and slower than base, but far more complete.
    pipes[id] = await pipeline('automatic-speech-recognition', id, {
      dtype: 'fp32',
      progress_callback: onProgress,
    })
  }
  return pipes[id]
}

self.onmessage = async ({ data }) => {
  // A cancel message can arrive mid-run; flip the flag and the window loop stops.
  if (data?.type === 'cancel') { cancelled = true; return }
  cancelled = false

  try {
    self.postMessage({ type: 'status', stage: 'loading', msg: 'Loading Whisper model (first run ~970MB, cached after)...' })

    const language = data.language || 'en'
    // Several model files download at once, each with its own %: report one
    // combined % (bytes so far / all bytes) so the bar never jumps between files.
    // Only the big weight files count: tiny config files hit 100% at once.
    // Post only when the whole % changes, not on every network chunk.
    const files = {}
    let last = -1
    const asr = await load((p) => {
      if (p.status === 'progress' && p.total > 5e6) {
        files[p.file] = [p.loaded || 0, p.total]
        const [got, all] = Object.values(files).reduce((s, [l, t]) => [s[0] + l, s[1] + t], [0, 0])
        const pct = Math.floor((got / all) * 100)
        if (pct !== last) { last = pct; self.postMessage({ type: 'progress', stage: 'downloading', pct, mb: [Math.round(got / 1e6), Math.round(all / 1e6)], file: p.file ?? '' }) }
      }
    }, language)
    const langOpts = language === 'en' ? {} : { task: 'translate', ...(language !== 'auto' ? { language } : {}) }

    self.postMessage({ type: 'status', stage: 'transcribing', msg: 'Transcribing audio...' })

    // Process the audio in bounded windows so a long (1hr+) recording never holds
    // huge intermediate buffers, reports real progress, and can be cancelled.
    const audio = data.audio
    const sr = data.sampleRate
    const WINDOW = 300 * sr               // 5-minute windows
    const total = audio.length
    const numWindows = Math.max(1, Math.ceil(total / WINDOW))

    const allChunks = []
    let fullText = ''

    for (let w = 0; w < numWindows; w++) {
      if (cancelled) break
      const start = w * WINDOW
      const end = Math.min(start + WINDOW, total)
      const slice = audio.subarray(start, end)
      const offset = start / sr

      // chunking options belong on the call: Whisper only hears 30 s at a time,
      // so without them each window stopped after its first 30 seconds
      // Whisper decodes 30 s pieces that step 20 s; its streamer hook ends once
      // per piece, so the bar moves every ~20 s of audio, not every 5 minutes
      const pieces = Math.max(1, Math.ceil((slice.length / sr - 10) / 20))
      let done = 0
      const streamer = { put() {}, end() {
        done = Math.min(done + 1, pieces)
        const at = Math.round((offset + (done / pieces) * (slice.length / sr)) / 60)
        self.postMessage({ type: 'progress', stage: 'transcribing', pct: Math.round(((w + done / pieces) / numWindows) * 100),
          window: w + 1, windows: numWindows, heard: at, of: Math.round(total / sr / 60) })
      } }
      const result = await asr(slice, { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5, streamer, ...langOpts })

      for (const c of (result.chunks ?? [])) {
        const ts = c.timestamp ?? [null, null]
        const s = (ts[0] ?? 0) + offset
        const e = (ts[1] ?? ts[0] ?? 0) + offset
        allChunks.push({ text: c.text, timestamp: [s, e] })
      }
      fullText += (result.text ?? '') + ' '

      self.postMessage({
        type: 'progress',
        stage: 'transcribing',
        pct: Math.round(((w + 1) / numWindows) * 100),
        window: w + 1,
        windows: numWindows,
      })
    }

    self.postMessage({ type: 'result', data: { text: fullText.trim(), chunks: allChunks, cancelled } })
  } catch (e) {
    const missing = data?.language && data.language !== 'en' && import.meta.env.VITE_BUILD_TARGET === 'desktop'
    self.postMessage({ type: 'error', msg: missing
      ? 'This copy only has the English speech model. Run the setup again with -AllLanguages to add other languages.'
      : e.message })
  }
}
