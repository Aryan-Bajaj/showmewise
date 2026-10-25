import { useRef, useEffect, useMemo } from "react"

export default function VideoPlayer({ file, seekTo }) {
  const videoRef = useRef()
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  // a recording made here exists only in this browser, so it can be saved as a file
  const recorded = /^(Screen|Recovered) recording/.test(file.name)

  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo
      videoRef.current.play()
    }
  }, [seekTo])

  return (
    <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
      <video
        ref={videoRef}
        className="w-full"
        controls
        src={url}
      />
      {recorded && (
        <a href={url} download={file.name} className="block px-4 py-2 text-sm text-violet-300 hover:text-white border-t border-zinc-800">
          ⬇ Save recording ({Math.round(file.size / 1048576)} MB)
        </a>
      )}
    </div>
  )
}
