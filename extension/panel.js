// The plugin's window: the small popup under the toolbar icon (or the side
// panel, if the user opens it there). Record, follow the guide being written,
// and chat. The background worker does the work and keeps the chat, so the
// popup can close any time without losing anything.
// All text from pages and answers is shown with textContent, never as HTML.
const $ = (id) => document.getElementById(id)
const bg = (type, extra = {}) => chrome.runtime.sendMessage({ to: "bg", type, ...extra })
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`
const time = (ms) => ms < 60000 ? `${Math.round(ms / 1000)}s` : ms < 3600000 ? `${Math.round(ms / 60000)}m` : `${Math.floor(ms / 3600000)}h ${Math.round(ms / 60000) % 60}m`
const POPUP = new URLSearchParams(location.search).has("popup")
document.body.classList.toggle("popup", POPUP)
if (!POPUP) $("side").hidden = true

// open on the side of this window (Chrome 116+)
$("side").onclick = async () => {
  const w = await chrome.windows.getCurrent()
  await chrome.sidePanel.open({ windowId: w.id }).catch(() => {})
  window.close()
}

// ---- record + status ----------------------------------------------------------
let status = null
$("recBtn").onclick = async () => {
  $("recErr").hidden = true
  const r = status?.state === "recording" ? await bg("stop") : await bg("record")
  if (!r?.ok) { $("recErr").textContent = r?.error || "Something went wrong."; $("recErr").hidden = false }
}

function render(s, closed) {
  status = s
  const rec = s?.state === "recording"
  $("recCard").classList.toggle("live", rec)
  $("recLabel").textContent = rec ? `Stop recording · ${mmss(s.ms || 0)}` : "Record your screen"
  $("recBtn").disabled = s?.state === "working"
  if (s?.error && s.state === "upload") { $("recErr").textContent = s.error; $("recErr").hidden = false }

  const show = s && ["working", "settings", "done", "stopped", "ready"].includes(s.state)
  $("runCard").hidden = !show && !closed
  const btns = $("runBtns"); btns.textContent = ""
  const add = (label, fn) => { const b = el("button", null, label); b.onclick = fn; btns.append(b) }
  if (closed && !show) {
    $("runTitle").textContent = "The VideoDoc tab was closed"
    $("runLine").textContent = "Nothing is lost: what was done is saved. Continue picks up where it stopped."
    $("steps").textContent = ""; $("runBar").style.width = "0"
    add("Continue", () => bg("recover"))
    return
  }
  if (!show) return
  $("runTitle").textContent = s.title || "Your guide"
  const steps = s.steps || []
  const doneN = steps.filter((x) => x.status === "done").length
  $("runBar").style.width = steps.length ? `${Math.round((doneN / steps.length) * 100)}%` : "0"
  const w = steps.find((x) => x.id === "annotate")
  let left = ""
  if (w?.status === "active" && w.step > 1 && w.ms) { const per = w.ms / (w.step - 1); const ms = per * (w.total - w.step + 1) + per * 3; left = ms < 90000 ? "About a minute left" : `About ${Math.round(ms / 60000)} minutes left` }
  $("runLine").textContent = {
    working: left || "Working on it. Keep the computer on; it stays awake by itself.",
    settings: s.lastAI ? "Ready to write." : "Choose the AI in the VideoDoc tab to write the guide.",
    done: "Your guide is ready.",
    stopped: s.error || "It stopped. Open the VideoDoc tab to see why.",
    ready: "The guide is there. Open it to read and save it.",
  }[s.state] || ""
  // compact: in the popup only the step being worked on and the counts
  const ul = $("steps"); ul.textContent = ""
  const list = POPUP ? steps.filter((x) => x.status === "active" || x.status === "error") : steps
  for (const x of list) {
    const li = el("li", x.status)
    li.append(el("span", "i", { done: "✓", active: "●", error: "!" }[x.status] || "○"), el("span", null, x.label))
    const d = x.status === "active" && x.step && x.total ? `${x.step} of ${x.total}` : x.status === "done" && x.ms != null ? time(x.ms) : ""
    if (d) li.append(el("em", null, d))
    if (x.status === "active" && x.detail) li.title = x.detail
    ul.append(li)
  }
  if (POPUP && steps.length) ul.append(el("li", null, `${doneN} of ${steps.length} jobs done`))
  if (s.state === "settings" && s.lastAI) add(`Write it with ${s.lastAI}`, () => bg("generate"))
  if (s.state === "settings") add("Choose another AI", () => bg("focus"))
  if (s.state === "done" || s.state === "ready") add("Open the guide", () => bg("focus"))
  if (s.state === "working" || s.state === "stopped") add("Show in VideoDoc", () => bg("focus"))
}

chrome.runtime.onMessage.addListener((m) => { if (m?.to === "panel" && m.type === "status") render(m.status, m.closed) })
bg("state").then((st) => {
  if (st?.site) { $("site").href = st.site + "/"; $("privacy").href = st.site + "/#/policy" }
  render(st?.status || null, st?.closed)
})
chrome.storage.local.get("autoStart").then(({ autoStart }) => { $("auto").checked = autoStart !== false })
$("auto").onchange = () => chrome.storage.local.set({ autoStart: $("auto").checked })

// ---- chat --------------------------------------------------------------------
let scope = "video", doc = null
const CTX = {
  video: () => "Vidi answers from your video in VideoDoc.",
  page: () => "Vidi answers from the page you are on.",
  help: () => "Ask Vidi anything about VideoDoc: how to use it, its limits, the plugin.",
  doc: () => doc ? `Vidi answers from ${doc.name}.` : "Choose a PDF, Word, web page or text file for Vidi to read.",
}
function setScope(s) {
  scope = s
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x.dataset.scope === s))
  $("linksWrap").hidden = s !== "page"
  $("ctx").textContent = CTX[s]()
  chrome.storage.session.set({ scope: s })
}
for (const b of document.querySelectorAll(".tabs button")) b.onclick = () => { setScope(b.dataset.scope); if (b.dataset.scope === "doc") $("file").click() }
chrome.storage.session.get("scope").then(({ scope: s }) => setScope(s && s !== "doc" ? s : "video"))

$("file").onchange = async () => {
  const f = $("file").files[0]; $("file").value = ""
  if (!f) return
  if (f.size > 25 * 1024 * 1024) { $("ctx").textContent = "That file is over 25 MB. Choose a smaller one."; doc = null; return }
  if (!/\.(pdf|docx|html?|txt|md|csv|json)$/i.test(f.name)) { $("ctx").textContent = "This file type does not work here. Choose a PDF, Word, web page or text file."; doc = null; return }
  const buf = new Uint8Array(await f.arrayBuffer())
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  doc = { name: f.name, size: f.size, data: btoa(bin) }
  $("ctx").textContent = CTX.doc()
}

// reading other pages needs the user's OK once
$("allow").onclick = async () => {
  const ok = await chrome.permissions.request({ origins: ["<all_urls>"] }).catch(() => false)
  if (ok) { $("allow").hidden = true; $("ctx").textContent = "Thanks. Ask your question again." }
}

$("askForm").onsubmit = async (e) => {
  e.preventDefault()
  const question = $("q").value.trim()
  if (!question) return
  if (scope === "doc" && !doc) { $("ctx").textContent = "Choose a document first."; $("file").click(); return }
  $("q").value = ""
  await bg("chat", { chat: { question, scope, followLinks: $("links").checked, doc: scope === "doc" ? doc : null } })
}

function showChat(log = []) {
  const box = $("msgs"); box.textContent = ""
  for (const m of log) {
    box.append(el("div", "q", m.q))
    const a = el("div", "a")
    if (!m.done) a.append(el("span", null, m.label && m.label !== "Thinking..." ? `Vidi: ${m.label}` : "Vidi is thinking..."))
    else {
      a.append(el("span", null, m.error ? `⚠️ ${m.error}` : m.answer))
      if (m.readPages?.length) a.append(el("small", null, "Vidi also read: " + m.readPages.map((p) => p.title || p.url).join(" · ")))
      for (const s of m.sources || []) {
        if (s.url) { const sm = el("small", null, "From: "); const link = el("a", null, s.label || s.url); link.href = s.url; link.target = "_blank"; link.rel = "noopener"; sm.append(link); a.append(sm) }
        else if (s.timestamp != null) a.append(el("small", null, `From the video at ${mmss(s.timestamp * 1000)}${s.title ? `: ${s.title}` : ""}`))
      }
      if (m.model) a.append(el("small", null, `Vidi answered on your computer (${m.model})`))
      // text not enough? Vidi offers to mark it on the page (only when pressed)
      if (!m.error && (m.scope === "page" || m.scope === "help")) {
        if (m.showing) a.append(el("small", null, m.showing))
        else if (!m.shot && !m.shotNote) {
          const lost = /where|can.?t find|cannot find|don.?t see|not (working|there|visible)|show me|kaha|kahan|dikha/i.test(m.q)
          const b = el("button", "showme", lost ? "Want me to show you on the page? Show me" : "Show me on the page")
          b.style.cssText = "display:block;margin-top:8px;font-size:12px;padding:5px 10px"
          b.onclick = async () => { b.disabled = true; const r = await bg("showme", { id: m.id }); if (!r?.ok) { b.disabled = false; b.textContent = r?.error || "That did not work." } }
          a.append(b)
        }
        if (m.shot) {
          const img = el("img"); img.src = m.shot; img.alt = "The page with Vidi's marks"
          img.style.cssText = "display:block;width:100%;margin-top:8px;border-radius:8px;border:1px solid rgba(124,92,255,.5);cursor:zoom-in"
          img.onclick = () => img.style.width = img.style.width === "100%" ? "200%" : "100%"
          a.append(img)
        }
        if (m.shotNote) a.append(el("small", null, m.shotNote))
      }
    }
    box.append(a)
  }
  $("allow").hidden = !log.some((m) => m.needOk) || !log.length || !log[log.length - 1].needOk
  box.lastElementChild?.scrollIntoView({ block: "end" })
}
chrome.storage.session.get("chat").then(({ chat }) => showChat(chat))
chrome.storage.onChanged.addListener((ch, area) => { if (area === "session" && ch.chat) showChat(ch.chat.newValue) })
