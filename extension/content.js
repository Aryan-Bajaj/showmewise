// Runs only on the VideoDoc website. Passes the plugin's commands into the page
// and the page's status back out (the page side is src/lib/bridge.js).
// It can be injected twice (installed while the tab was open): the second time does nothing.
(() => {
if (window.__videodocBridge) return
window.__videodocBridge = true
const IN = "videodoc-ext", OUT = "videodoc-app"

chrome.runtime.onMessage.addListener((msg, _from, reply) => {
  if (msg?.to !== "page") return
  const { to, ...rest } = msg
  window.postMessage({ source: IN, ...rest }, location.origin)
  reply({ ok: true })
})

window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== OUT) return
  const { source, ...data } = e.data
  chrome.runtime.sendMessage({ from: "page", ...data }).catch(() => {})
})

// say hello, so the plugin knows this tab can do the work
window.postMessage({ source: IN, type: "hello" }, location.origin)
})()
