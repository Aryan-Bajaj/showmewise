import { useState, useEffect, useRef } from "react"

function formatTime(ms) {
  if (!ms || ms < 0) return "0s"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatETA(ms) {
  if (!ms || ms < 2000) return null
  const s = Math.round(ms / 1000)
  return s < 60 ? `~${s}s left` : `~${Math.ceil(s / 60)}m left`
}

function StepIcon({ status }) {
  if (status === 'done') return (
    <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-600 flex items-center justify-center shrink-0">
      <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
  if (status === 'active') return (
    <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin shrink-0" />
  )
  if (status === 'error') return (
    <div className="w-5 h-5 rounded-full bg-red-500/15 border border-red-600 flex items-center justify-center shrink-0 text-red-400 text-sm leading-none">
      ×
    </div>
  )
  return <div className="w-5 h-5 rounded-full border border-zinc-700 shrink-0" />
}

export default function PipelineStatus({ steps, etaHint = null }) {
  const [now, setNow] = useState(Date.now())
  // Highest overall % shown so far this run — the headline bar must only ever
  // move forward. WebLLM's loader reports progress that resets between phases
  // (download → compile shaders), which would otherwise jerk the bar backwards.
  const maxPctRef = useRef(0)

  // Tick every second while any step is active. Keyed on the boolean, not on
  // steps: progress updates arrive many times a second and would restart the
  // timer before it ever fired (the elapsed time froze at 0s).
  const hasActive = !!steps?.some(s => s.status === 'active')
  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasActive])

  if (!steps?.length) return null

  // Overall progress = completed steps + the active step's own fraction, each
  // step weighted equally. Gives the user one headline number to watch.
  const totalSteps = steps.length
  let doneCount = 0
  let activeFrac = 0
  for (const s of steps) {
    if (s.status === 'done') doneCount++
    else if (s.status === 'active') {
      const fp = s.pct != null ? s.pct : (s.step != null && s.total ? (s.step / s.total) * 100 : 0)
      activeFrac = Math.max(0, Math.min(1, fp / 100))
    }
  }
  const anyError = steps.some(s => s.status === 'error')
  const allDone = steps.every(s => s.status === 'done')
  const rawPct = allDone ? 100 : Math.min(99, Math.round(((doneCount + activeFrac) / totalSteps) * 100))
  // Clamp to be monotonic within a run; reset when a fresh run begins (all steps
  // back to pending) so the next video starts from 0 again.
  if (steps.every(s => s.status === 'pending')) maxPctRef.current = 0
  const overallPct = Math.max(maxPctRef.current, rawPct)
  maxPctRef.current = overallPct

  // Time left for the whole run, from the speed measured on THIS computer: the
  // average time per part so far × the parts still to write, plus the check
  // (one shorter call per part) and the summary (a few calls) still to come.
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]))
  let leftMs = null
  const perPart = (s) => (s?.status === 'active' && s.startedAt && s.step > 1 ? (now - s.startedAt) / (s.step - 1) : null)
  const w = byId.annotate, v = byId.verify, ins = byId.insights
  const pw = perPart(w), pv = perPart(v)
  if (pw) leftMs = pw * (w.total - w.step + 1) + (v?.status === 'pending' ? pw * 0.6 * w.total : 0) + (ins?.status === 'pending' ? pw * 3 : 0)
  else if (pv) leftMs = pv * (v.total - v.step + 1) + (ins?.status === 'pending' ? pv * 5 : 0)
  const leftText = leftMs == null ? null : leftMs < 90000 ? 'About a minute left' : `About ${Math.round(leftMs / 60000)} minutes left`

  return (
    <div className="bg-[#120c2c]/95 border border-violet-400/15 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(10,5,40,0.45)]">
      {/* Overall progress header */}
      <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-violet-500/10 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold uppercase tracking-widest ${anyError ? 'text-red-400' : allDone ? 'text-emerald-400' : 'text-zinc-300'}`}>
            {anyError ? 'Stopped' : allDone ? 'Complete' : `Processing · step ${Math.min(doneCount + 1, totalSteps)} of ${totalSteps}`}
          </span>
          <span className="text-lg font-bold tabular-nums bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">{overallPct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_0_14px_rgba(124,92,255,0.7)]" style={{ width: `${overallPct}%` }} />
        </div>
        {/* Whole-run expectation, shown from the very first second so nobody
            wonders if the app hung. Refined per backend in the AI settings. */}
        {leftText && !allDone && !anyError ? (
          <p className="text-[11px] text-zinc-400 mt-2"><b className="text-zinc-200">{leftText}</b>, measured on this computer from the parts written so far. Keep this tab open and in front so the computer stays awake.</p>
        ) : etaHint && !allDone && !anyError && (
          <p className="text-[11px] text-zinc-500 mt-2">{etaHint}</p>
        )}
      </div>

      {steps.map((step, i) => {
        const isActive = step.status === 'active'
        const isDone   = step.status === 'done'
        const isError  = step.status === 'error'

        const elapsed = step.startedAt
          ? (step.endedAt ?? now) - step.startedAt
          : null

        // Determine fill %
        const fillPct = step.pct != null
          ? step.pct
          : (step.step != null && step.total)
            ? Math.round((step.step / step.total) * 100)
            : undefined

        // Determine ETA
        let eta = null
        if (isActive) {
          if (step.etaMs) {
            eta = formatETA(step.etaMs)
          } else if (fillPct > 0 && elapsed) {
            const totalEst = elapsed / (fillPct / 100)
            eta = formatETA(totalEst - elapsed)
          }
        }

        return (
          <div key={step.id} className={`px-5 py-3 transition-colors ${i > 0 ? 'border-t border-white/5' : ''} ${isActive ? 'bg-violet-500/[0.06]' : ''}`}>
            {/* Main row */}
            <div className="flex items-center gap-3">
              <StepIcon status={step.status} />

              <span className={`text-sm font-medium ${
                isActive ? 'text-white' :
                isDone   ? 'text-zinc-400' :
                isError  ? 'text-red-400' :
                           'text-zinc-600'
              }`}>
                {step.label}
              </span>

              {/* Right-side badges */}
              <div className="ml-auto flex items-center gap-3 text-xs shrink-0">
                {isActive && step.step != null && step.total != null && (
                  <span className="text-zinc-400">{step.step}/{step.total}</span>
                )}
                {isActive && fillPct != null && (
                  <span className="text-violet-300 font-semibold tabular-nums">{fillPct}%</span>
                )}
                {isActive && elapsed != null && (
                  <span className="text-zinc-500">{formatTime(elapsed)}</span>
                )}
                {isActive && eta && (
                  <span className="text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">{eta}</span>
                )}
                {(isDone || isError) && step.detail && (
                  <span className={`${isError ? 'text-red-400' : 'text-zinc-500'} max-w-xs truncate`}>
                    {step.detail}
                  </span>
                )}
                {(isDone || isError) && elapsed != null && (
                  <span className="text-zinc-600 tabular-nums">{formatTime(elapsed)}</span>
                )}
              </div>
            </div>

            {/* Detail text (active only) — wrap fully so long progress
                messages like the WebLLM cache download aren't cut off */}
            {isActive && step.detail && (
              <p className="text-xs text-zinc-500 mt-1.5 ml-8 break-words leading-relaxed">{step.detail}</p>
            )}

            {/* Progress bar (active only) */}
            {isActive && (
              <div className="mt-2 ml-8 space-y-1.5">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  {fillPct != null ? (
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  ) : (
                    <div className="h-full w-1/3 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full animate-[indeterminate_1.4s_ease-in-out_infinite]" />
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
