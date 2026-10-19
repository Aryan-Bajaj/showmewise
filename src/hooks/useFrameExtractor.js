import { useRef, useCallback } from "react"
import { detectContentBox } from "../lib/contentBox"

export default function useFrameExtractor() {
  const canvasRef = useRef(document.createElement("canvas"))

  // Heavy screen recordings are expensive to DECODE in-browser. Seeking to a
  // small number of points decodes only NEAR those points, so sampling = much
  // faster than full playback. The sampling DENSITY flexes with the video length
  // (see below) so a 2-minute clip and a 2-hour recording are both covered well.
  // MAX_W keeps on-screen text legible for OCR / vision.
  //
  // Adaptive sampling: aim for one frame roughly every TARGET_SPACING seconds,
  // but never fewer than MIN_FRAMES (so short clips stay detailed) and never more
  // than MAX_FRAMES (so OCR time + memory stay bounded on long recordings).
  // A frame every ~3 s: a dialog that is open for a few seconds must be seen.
  // (At 10 s a whole selection screen or popup slipped between two frames.)
  const TARGET_SPACING = 3  // seconds between frames we aim for
  const MIN_FRAMES = 12     // floor — even a 30s clip gets real coverage
  const MAX_FRAMES = 300    // ceiling — 15 min keeps 3 s, a 30-min recording a frame every 6 s; ~60 MB of JPEGs
  const MAX_W = 1920        // full HD always: small UI labels must stay readable for OCR and markers
  const SEEK_TIMEOUT = 4000 // ms — skip a stalled seek instead of hanging

  // onProgress(done, total)
  const extractFrames = useCallback((videoFile, intervalSecs = 5, onProgress) => {
    return new Promise((resolve) => {
      const video = document.createElement("video")
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const frames = []

      video.src = URL.createObjectURL(videoFile)
      video.muted = true
      video.preload = "auto"

      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        try { URL.revokeObjectURL(video.src) } catch { /* noop */ }
        resolve(frames)
      }
      video.addEventListener("error", finish)

      video.addEventListener("loadedmetadata", async () => {
        const dur = video.duration
        if (!dur || !isFinite(dur)) { finish(); return }
        // Meeting recordings: cut every frame to the shared screen (no margins,
        // no webcam tile). null = the recording fills the frame.
        const seekTo = (t) => new Promise((res) => {
          const tm = setTimeout(() => { video.removeEventListener("seeked", ok); res(false) }, SEEK_TIMEOUT)
          const ok = () => { clearTimeout(tm); res(true) }
          video.addEventListener("seeked", ok, { once: true })
          video.currentTime = t
        })
        let crop = null
        try { crop = await detectContentBox(video, seekTo) } catch { /* use the full frame */ }
        const C = crop || { x: 0, y: 0, w: video.videoWidth, h: video.videoHeight }
        // Pick a frame count that scales with duration, clamped to [MIN, MAX],
        // then derive the interval from it — so density flexes with the video.
        // Short how-tos get a frame every ~2 s (up to 60) so every click has a
        // screenshot to point at; long recordings keep the ~10 s spacing.
        const dense = Math.min(60, Math.ceil(dur / 2))
        const targetFrames = Math.max(MIN_FRAMES, dense, Math.min(MAX_FRAMES, Math.round(dur / TARGET_SPACING)))
        const interval = dur / targetFrames
        const scale = Math.min(1, MAX_W / C.w)
        canvas.width = Math.round(C.w * scale)
        canvas.height = Math.round(C.h * scale)

        const timestamps = []
        for (let t = 0; t < dur; t += interval) timestamps.push(parseFloat(t.toFixed(2)))
        const total = timestamps.length
        let index = 0

        const next = () => {
          if (settled) return
          if (index >= total) { finish(); return }
          onProgress?.(index, total)

          let handled = false
          let timer = null
          const handle = (ok) => {
            if (handled) return
            handled = true
            clearTimeout(timer)
            video.removeEventListener("seeked", onSeeked)
            if (ok) {
              try {
                ctx.drawImage(video, C.x, C.y, C.w, C.h, 0, 0, canvas.width, canvas.height)
                frames.push({
                  timestamp: timestamps[index],
                  imageData: canvas.toDataURL("image/jpeg", 0.7),
                  width: canvas.width,
                  crop, // the part of the video this frame shows (null = all of it)
                  label: formatTime(timestamps[index]),
                })
              } catch { /* skip unreadable frame */ }
            }
            index++
            next()
          }
          const onSeeked = () => handle(true)
          video.addEventListener("seeked", onSeeked)
          timer = setTimeout(() => handle(false), SEEK_TIMEOUT)
          video.currentTime = timestamps[index]
        }

        next()
      })
    })
  }, [])

  return { extractFrames }
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0")
  const s = Math.floor(secs % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}
