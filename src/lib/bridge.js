// Talks to the ShowMeWise browser plugin. The plugin uses this website as its
// engine: its helper script on this page passes commands in (record, stop,
// generate, chat) and carries the live status out to the plugin's side panel.
// Only messages from this same page are accepted (the plugin's helper script
// runs inside it); other sites and frames cannot reach it. Without the plugin
// nothing happens.

const OUT = "showmewise-app", IN = "showmewise-ext"
let last = null

export function post(type, data = {}) {
  const msg = { source: OUT, type, ...data }
  if (type === "status") last = msg
  window.postMessage(msg, location.origin)
}

// a step list small enough to send often
export const compactSteps = (steps) => (steps || []).map((s) => ({
  id: s.id, label: s.label, status: s.status, detail: s.detail || "",
  step: s.step ?? null, total: s.total ?? null,
  ms: s.startedAt ? Math.max(0, (s.endedAt ?? Date.now()) - s.startedAt - (s.slept || 0)) : null,
}))

// the guide open in this tab, for the plugin's chat (set by App)
let docsNow = []
export const setVideoDocs = (d) => { docsNow = d || [] }
export const videoDocs = () => docsNow

let started = false
export function listen() {
  if (started) return
  started = true
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin || e.data?.source !== IN) return
    const { type, ...data } = e.data
    if (type === "hello") { post("hello", { version: 1, page: location.hash }); window.postMessage(last || { source: OUT, type: "status", state: "idle", steps: [] }, location.origin); return }
    // the page parts that can act listen for these
    window.dispatchEvent(new CustomEvent(`showmewise:${type}`, { detail: data }))
  })
}
