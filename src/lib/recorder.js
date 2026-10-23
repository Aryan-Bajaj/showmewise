// Screen recorder: the whole screen, one app window or a browser tab, with the
// microphone (the narration) and, where the browser offers it, the computer's
// sound. Used by the "Record your screen" button and by the browser plugin,
// which hands over a stream id from chrome.desktopCapture instead.
//
// Every second of video is written to this browser's storage while recording,
// so a crash or a closed tab does not lose the recording: the next visit
// offers it back (recoverRecording). Nothing leaves the computer.
import fixWebmDuration from "fix-webm-duration"

const DB = "videodoc-recording", STORE = "chunks"
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { autoIncrement: true })
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const run = async (mode, fn) => {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE)
    const req = fn(s)
    t.oncomplete = () => { db.close(); res(req?.result) }
    t.onerror = () => { db.close(); rej(t.error) }
  })
}
const clearSaved = () => run("readwrite", (s) => s.clear()).catch(() => {})

// small, clear video: text on screen stays sharp at 15 frames a second
const TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
const pickType = () => TYPES.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ""

export const canRecord = () => !!(navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder)

async function screenStream(streamId) {
  if (!streamId) {
    return navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 15, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: true, systemAudio: "include", selfBrowserSurface: "exclude", surfaceSwitching: "include", monitorTypeSurfaces: "include",
    })
  }
  // the plugin chose the screen with chrome.desktopCapture; ask with its sound first
  const video = { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: streamId, maxWidth: 1920, maxHeight: 1080, maxFrameRate: 15 } }
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: streamId } } })
  } catch {
    return navigator.mediaDevices.getUserMedia({ video })
  }
}

// Start recording. Resolves when recording runs; stop() gives the video file.
// onEnd(file) also fires when the user ends it from the browser's own
// "Stop sharing" bar. Throws a plain-language error if nothing can be recorded.
// `meta`: the options of this recording (key words, language), kept with it for Continue
export async function startRecording({ streamId = null, mic = true, onEnd, onTick, meta = null } = {}) {
  let screen
  try { screen = await screenStream(streamId) } catch (e) {
    if (e?.name === "NotAllowedError") throw new Error("Recording was not started: nothing was chosen to share, or sharing was blocked.")
    throw new Error("This browser cannot record the screen here. Use Chrome, Edge or Firefox on a computer.")
  }
  let voice = null, micNote = null
  if (mic) {
    try { voice = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }) }
    catch { micNote = "The microphone is blocked, so your voice is not recorded. Allow the microphone for this site to talk while you record." }
  }
  // screen sound and voice mixed into one track
  const ctx = new AudioContext()
  const mix = ctx.createMediaStreamDestination()
  for (const s of [screen, voice]) if (s?.getAudioTracks().length) ctx.createMediaStreamSource(s).connect(mix)
  const hasSound = !!(voice || screen.getAudioTracks().length)
  const tracks = [...screen.getVideoTracks(), ...(hasSound ? mix.stream.getAudioTracks() : [])]
  const type = pickType()
  const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: type || undefined, videoBitsPerSecond: 1_500_000 })
  await clearSaved()
  rec.ondataavailable = (e) => { if (e.data?.size) run("readwrite", (s) => s.add({ type: rec.mimeType, blob: e.data })).catch(() => {}) }
  const t0 = Date.now()
  const tick = setInterval(() => onTick?.(Date.now() - t0), 1000)
  let done = null
  const finish = () => {
    if (done) return done
    done = new Promise((resolve) => {
      rec.onstop = async () => {
        clearInterval(tick)
        for (const s of [screen, voice]) s?.getTracks().forEach((t) => t.stop())
        ctx.close().catch(() => {})
        // the last piece is written by ondataavailable just before onstop
        await new Promise((r) => setTimeout(r, 300))
        const file = await assemble(Date.now() - t0, meta)
        resolve(file); onEnd?.(file)
      }
      if (rec.state !== "inactive") rec.stop(); else rec.onstop()
    })
    return done
  }
  // "Stop sharing" in the browser bar, or the shared window was closed
  screen.getVideoTracks()[0]?.addEventListener("ended", finish)
  rec.start(1000)
  return { stop: finish, micNote, startedAt: t0 }
}

// the saved pieces as one video file with its length written in
async function assemble(durationMs, meta) {
  const items = await run("readonly", (s) => s.getAll()).catch(() => [])
  if (!items?.length) return null
  const type = items[0].type || "video/webm"
  let blob = new Blob(items.map((i) => i.blob), { type })
  if (/webm/.test(type) && durationMs) blob = await fixWebmDuration(blob, durationMs, { logger: false }).catch(() => blob)
  // local date and time, e.g. "Screen recording 23 Oct 2026, 21-16" (no ":" in file names)
  const d = new Date()
  const stamp = `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`
  const file = new File([blob], `Screen recording ${stamp}.${/mp4/.test(type) ? "mp4" : "webm"}`, { type: type.split(";")[0], lastModified: Date.now() })
  await keepFinal(file, meta)
  return file
}

// The finished recording stays saved until its guide is done (App calls
// discardSavedRecording then). A closed tab or crash in between: the same
// file is offered again, so the run picks up where it stopped.
async function keepFinal(file, meta = null) {
  await clearSaved()
  await run("readwrite", (s) => s.add({ final: true, name: file.name, type: file.type, lastModified: file.lastModified, blob: file, meta })).catch(() => {})
}

// A recording cut short by a crash: its pieces are still saved. The length is
// unknown then, so it is measured from the file itself.
export async function recoverRecording() {
  const items = await run("readonly", (s) => s.getAll()).catch(() => [])
  if (!items?.length) return null
  const fin = items.find((i) => i.final)
  if (fin) return Object.assign(new File([fin.blob], fin.name, { type: fin.type, lastModified: fin.lastModified }), { vdOpts: fin.meta || null })
  const type = items[0].type || "video/webm"
  const blob = new Blob(items.map((i) => i.blob), { type })
  const ms = await measure(blob)
  const fixed = /webm/.test(type) && ms ? await fixWebmDuration(blob, ms, { logger: false }).catch(() => blob) : blob
  const file = new File([fixed], `Recovered recording.${/mp4/.test(type) ? "mp4" : "webm"}`, { type: type.split(";")[0], lastModified: Date.now() })
  await keepFinal(file)
  return file
}
// "cut": pieces of a recording that never finished; "unfinished": a recording whose guide is not done
export async function savedRecording() {
  const items = await run("readonly", (s) => s.getAll()).catch(() => [])
  return !items?.length ? null : items.some((i) => i.final) ? "unfinished" : "cut"
}
export const discardSavedRecording = clearSaved

// a WebM without a length reports Infinity until it is seeked to the end
function measure(blob) {
  return new Promise((res) => {
    const v = document.createElement("video"); v.muted = true; v.preload = "metadata"
    const url = URL.createObjectURL(blob)
    const done = (ms) => { URL.revokeObjectURL(url); res(ms) }
    v.onloadedmetadata = () => {
      if (isFinite(v.duration)) return done(v.duration * 1000)
      v.ondurationchange = () => { if (isFinite(v.duration)) done(v.duration * 1000) }
      v.currentTime = 1e9
    }
    v.onerror = () => done(0)
    setTimeout(() => done(0), 15000)
    v.src = url
  })
}
