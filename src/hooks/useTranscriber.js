import { useRef, useState, useCallback } from "react"

const newWorker = () => new Worker(new URL('../workers/transcriber.worker.js', import.meta.url), { type: 'module' })

export default function useTranscriber() {
  const workerRef = useRef(null)
  const [transcribeStatus, setTranscribeStatus] = useState(null)
  const [transcribeProgress, setTranscribeProgress] = useState(null) // { stage, pct, file }

  const transcribe = useCallback((audioData, sampleRate, language = 'en', accurate = false, test = {}) => {
    return new Promise((resolve, reject) => {
      // The accurate model may need a second try on the processor (below), so
      // its audio is copied, not handed over to the worker.
      const keep = accurate ? audioData.slice() : null
      const run = (cpuOnly) => {
        if (!workerRef.current) workerRef.current = newWorker()
        workerRef.current.onmessage = ({ data }) => {
          if (data.type === 'status') {
            setTranscribeStatus(data.msg)
          } else if (data.type === 'progress') {
            setTranscribeProgress(data)
          } else if (data.type === 'gpu-failed') {
            // A graphics card that hangs while loading also blocks the AI engine
            // in that worker, so the processor try needs a fresh worker.
            workerRef.current.terminate()
            workerRef.current = null
            setTranscribeStatus('The graphics card could not load the speech model, using the processor instead (slower)...')
            run(true)
          } else if (data.type === 'result') {
            setTranscribeProgress(null)
            setTranscribeStatus(null)
            // Done with speech: close the worker so the speech model's memory
            // (up to 2 GB) goes back to the AI that writes the guide. Kept, it
            // pushed a 16 GB laptop into swapping and made writing 4x slower.
            // A next video loads the model from the browser cache in seconds.
            workerRef.current?.terminate()
            workerRef.current = null
            resolve(data.data)
          } else if (data.type === 'error') {
            setTranscribeProgress(null)
            setTranscribeStatus(null)
            workerRef.current?.terminate() // free its memory; a next try starts clean
            workerRef.current = null
            reject(new Error(data.msg))
          }
        }
        const audio = keep ? keep.slice() : audioData
        workerRef.current.postMessage({ audio, sampleRate, language, accurate, cpuOnly, debug: !!test.debug }, [audio.buffer])
      }
      run(!!test.cpuOnly)
    })
  }, [])

  // Ask the worker to stop after the current 5-minute window (cooperative cancel).
  const cancelTranscribe = useCallback(() => {
    workerRef.current?.postMessage({ type: 'cancel' })
  }, [])

  return { transcribe, cancelTranscribe, transcribeStatus, transcribeProgress }
}
