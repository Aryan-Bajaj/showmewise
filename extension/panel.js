// The side panel: record, follow the guide being written, and chat.
// All text from pages and answers is shown with textContent, never as HTML.
const $ = (id) => document.getElementById(id)
const bg = (type, extra = {}) => chrome.runtime.sendMessage({ to: "bg", type, ...extra })
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`
const time = (ms) => ms < 60000 ? `${Math.round(ms / 1000)}s` : ms < 3600000 ? `${Math.round(ms / 60000)}m` : `${Math.floor(ms / 3600000)}h ${Math.round(ms / 60000) % 60}m`

let status = null, siteUrl = "https://videodoc.netlify.app"

// ---- record + status ----------------------------------------------------------
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
  if (closed) {
    $("runTitle").textContent = "The VideoDoc tab was closed"
    $("runLine").textContent = "Nothing is lost: what was done is saved. Continue to pick up where it stopped."
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
  const ul = $("steps"); ul.textContent = ""
  for (const x of steps) {
    const li = el("li", x.status)
    li.append(el("span", "i", { done: "✓", active: "●", error: "!" }[x.status] || "○"), el("span", null, x.label))
    const d = x.status === "active" && x.step && x.total ? `${x.step} of ${x.total}` : x.status === "done" && x.ms != null ? time(x.ms) : ""
    if (d) li.append(el("em", null, d))
    if (x.status === "active" && x.detail) li.title = x.detail
    ul.append(li)
  }
  if (s.state === "settings" && s.lastAI) add(`Write it with ${s.lastAI}`, () => bg("generate"))
  if (s.state === "settings") add("Choose another AI", () => bg("focus"))
  if (s.state === "done" || s.state === "ready") add("Open the guide", () => bg("focus"))
  if (s.state === "working" || s.state === "stopped") add("Show in VideoDoc", () => bg("focus"))
}

chrome.runtime.onMessage.addListener((m) => {
  if (m?.to !== "panel") return
  if (m.type === "status") render(m.status, m.closed)
  if (m.type === "chat-status") { const a = pending.get(m.id); if (a) a.firstChild.textContent = m.label }
  if (m.type === "chat-answer") answer(m)
  if (m.type === "chat-need-pages") readLinks(m)
})

bg("state").then((st) => {
  if (st?.site) { siteUrl = st.site; $("site").href = st.site + "/"; $("privacy").href = st.site + "/#/policy" }
  render(st?.status || null)
})
chrome.storage.local.get("autoStart").then(({ autoStart }) => { $("auto").checked = autoStart !== false })
$("auto").onchange = () => chrome.storage.local.set({ autoStart: $("auto").checked })

// ---- chat --------------------------------------------------------------------
let scope = "video", doc = null
const pending = new Map() // id -> answer element
const asked = new Map()   // id -> the question message sent

for (const b of document.querySelectorAll(".tabs button")) {
  b.onclick = () => {
    scope = b.dataset.scope
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b))
    $("linksWrap").hidden = scope !== "page"
    $("ctx").textContent = scope === "video" ? "Answers come from the guide (or the speech) of your video in VideoDoc."
      : scope === "page" ? "Answers come from the page open in this window. It is read when you ask."
      : doc ? `Answers come from ${doc.name}.` : ""
    if (scope === "doc") $("file").click()
  }
}
$("ctx").textContent = "Answers come from the guide (or the speech) of your video in VideoDoc."
$("file").onchange = async () => {
  const f = $("file").files[0]; $("file").value = ""
  if (!f) return
  if (f.size > 25 * 1024 * 1024) { $("ctx").textContent = "That file is over 25 MB. Choose a smaller one."; doc = null; return }
  const buf = new Uint8Array(await f.arrayBuffer())
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  doc = { name: f.name, size: f.size, data: btoa(bin) }
  $("ctx").textContent = `Answers come from ${f.name}. Pick another with "A document".`
}

// the page open in this window: its text and its links
async function grabPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url || !/^https?:/.test(tab.url)) throw new Error("This page cannot be read. Browser pages and the web store are protected.")
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title, url: location.href,
      text: (document.body?.innerText || "").slice(0, 300000),
      links: [...document.querySelectorAll("a[href]")].slice(0, 400).map((a) => ({ text: (a.innerText || a.title || "").trim().slice(0, 100), href: a.href })),
    }),
  })
  return result
}

$("askForm").onsubmit = async (e) => {
  e.preventDefault()
  const question = $("q").value.trim()
  if (!question) return
  // reading other pages needs the user's OK once (asked inside this click)
  let allowed = true
  if (scope === "page") allowed = await chrome.permissions.request({ origins: ["<all_urls>"] }).catch(() => false)
  $("q").value = ""
  $("msgs").append(el("div", "q", question))
  const a = el("div", "a"); a.append(el("span", null, "Thinking...")); $("msgs").append(a); a.scrollIntoView({ block: "end" })
  const id = Math.random().toString(36).slice(2)
  pending.set(id, a)
  try {
    const chat = { id, question, scope, followLinks: $("links").checked }
    if (scope === "page") {
      if (!allowed) throw new Error("To read pages, VideoDoc needs your OK. Ask again and press Allow.")
      chat.page = await grabPage()
    }
    if (scope === "doc") { if (!doc) throw new Error("Choose a document first (A document)."); chat.doc = doc }
    asked.set(id, chat)
    const r = await bg("chat", { chat })
    if (!r?.ok) throw new Error(r?.error || "VideoDoc did not answer.")
  } catch (err) { answer({ id, error: err.message }) }
}

function answer(m) {
  const a = pending.get(m.id); if (!a) return
  pending.delete(m.id); asked.delete(m.id)
  a.textContent = m.error ? `⚠️ ${m.error}` : m.answer
  if (m.readPages?.length) a.append(el("small", null, "I also read: " + m.readPages.map((p) => p.title || p.url).join(" · ")))
  for (const s of m.sources || []) {
    if (!s.url && s.timestamp == null) continue
    const sm = el("small")
    if (s.url) { const link = el("a", null, s.label || s.url); link.href = s.url; link.target = "_blank"; link.rel = "noopener"; sm.append("From: ", link) }
    else sm.textContent = `From the video at ${mmss(s.timestamp * 1000)}${s.title ? `: ${s.title}` : ""}`
    a.append(sm)
  }
  if (m.model) a.append(el("small", null, `Answered on your computer by ${m.model}`))
  a.scrollIntoView({ block: "end" })
}

// the answer may be on a linked page: read those (same site) and ask again
async function readLinks(m) {
  const a = pending.get(m.id), chat = asked.get(m.id); if (!a || !chat) return
  a.firstChild.textContent = `Not on this page. Reading ${m.links.length} linked page${m.links.length > 1 ? "s" : ""}...`
  const pages = []
  for (const l of m.links) {
    try {
      const html = await fetch(l.href, { credentials: "include" }).then((r) => r.ok && /html|text/.test(r.headers.get("content-type") || "") ? r.text() : "")
      if (!html) continue
      const d = new DOMParser().parseFromString(html, "text/html")
      d.querySelectorAll("script,style,noscript,svg,template,nav,footer").forEach((x) => x.remove())
      d.querySelectorAll("p,div,li,tr,h1,h2,h3,h4,br,section,article").forEach((x) => x.append("\n"))
      pages.push({ url: l.href, title: d.title || l.text, text: (d.body?.textContent || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").slice(0, 200000) })
    } catch { /* that page could not be read */ }
  }
  if (!pages.length) return answer({ id: m.id, error: "It is not on this page, and the linked pages could not be read." })
  const r = await bg("chat", { chat: { ...chat, pages } })
  if (!r?.ok) answer({ id: m.id, error: r?.error || "VideoDoc did not answer." })
}
