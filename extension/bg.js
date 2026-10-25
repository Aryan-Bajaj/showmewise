// The plugin's background worker. The ShowMeWise website does the real work in a
// tab of its own (the "engine"): the same app, the same downloaded models and
// the same saved progress as on the website. This worker opens that tab when
// needed, starts recordings in it, passes chat questions to it, keeps the
// computer awake while it works and says when a guide is ready.

const SITES = ["https://showmewise.netlify.app", "http://127.0.0.1:8899"]
const site = async () => (await chrome.storage.local.get("site")).site || SITES[0]
const isSite = (url = "") => SITES.some((s) => url.startsWith(s + "/"))

// the toolbar icon opens the small popup; the side panel is optional (a button in it)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})

const getState = async () => (await chrome.storage.session.get("st")).st || { status: null, engine: null, auto: false }
const setState = async (patch) => { const st = { ...(await getState()), ...patch }; await chrome.storage.session.set({ st }); return st }
const toPanel = (msg) => chrome.runtime.sendMessage({ to: "panel", ...msg }).catch(() => {})

// the engine tab: one that already talks to us, else a ShowMeWise app tab
async function findEngine() {
  const { engine } = await getState()
  const tabs = await chrome.tabs.query({ url: SITES.map((s) => s + "/*") })
  // only a tab on the app page runs the app (the home page has no recorder)
  if (engine && tabs.some((t) => t.id === engine && /#\/app/.test(t.url || ""))) return engine
  return tabs.find((t) => /#\/app/.test(t.url || ""))?.id ?? null
}

// wait until the engine reports a state that passes `ok`
function waitFor(ok, ms = 45000) {
  return new Promise((res, rej) => {
    const on = (m) => { if (m?.from === "page" && m.type === "status" && ok(m)) { chrome.runtime.onMessage.removeListener(on); clearTimeout(t); res(m) } }
    const t = setTimeout(() => { chrome.runtime.onMessage.removeListener(on); rej(new Error("The ShowMeWise tab did not answer. Is the website open and loaded?")) }, ms)
    chrome.runtime.onMessage.addListener(on)
  })
}
// a tab still starting may not listen yet: one more try after a moment
const send = (tabId, msg) => chrome.tabs.sendMessage(tabId, { to: "page", ...msg })
  .catch(() => new Promise((r) => setTimeout(r, 1500)).then(() => chrome.tabs.sendMessage(tabId, { to: "page", ...msg })))

// many questions at once must share one ShowMeWise tab, not open one each
let opening = null
const ensureEngine = () => opening || (opening = openEngine().finally(() => { opening = null }))
async function openEngine() {
  let id = await findEngine()
  if (!id) {
    // can the website be reached at all? (otherwise the user waited 45 s for nothing)
    const ok = await fetch((await site()) + "/", { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(6000) }).then((r) => r.ok, () => false)
    if (!ok) throw new Error("The ShowMeWise website cannot be reached. Check your internet connection and try again.")
    const tab = await chrome.tabs.create({ url: (await site()) + "/#/app", active: false, pinned: true })
    id = tab.id
    await setState({ engine: id })
    await waitFor(() => true)
  } else if (!(await getState()).ready || (await getState()).engine !== id) {
    await setState({ engine: id })
    // still loading: wait until the page says it is there
    const answered = waitFor(() => true, 30000).then(() => true, () => false)
    const reached = await send(id, { type: "hello" }).then(() => true, () => false)
    if (!reached) {
      // a tab opened before the plugin was installed has no helper script yet
      const tab = await chrome.tabs.get(id)
      if (tab.status === "complete") await chrome.scripting.executeScript({ target: { tabId: id }, files: ["content.js"] }).catch(() => {})
    }
    if (!(await answered)) throw new Error("The ShowMeWise tab did not answer. Reload it and try again.")
  }
  return id
}

// ---- recording -------------------------------------------------------------
let starting = null
async function record(opts = {}) {
  const id = await ensureEngine()
  const { status } = await getState()
  if (status?.state === "working") throw new Error("ShowMeWise is still writing a guide. Record the next one when it is done.")
  if (status?.state && status.state !== "upload") {
    await send(id, { type: "new" })
    await waitFor((m) => m.state === "upload", 15000)
  }
  // the picker opens over the ShowMeWise tab; pick the whole screen, a window or a tab.
  // Afterwards the user goes straight back to the tab they were on.
  const [back] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const tab = await chrome.tabs.update(id, { active: true })
  await chrome.windows.update(tab.windowId, { focused: true })
  const streamId = await new Promise((res) => chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab", "audio"], tab, (sid) => res(sid)))
  if (!streamId) throw new Error("Recording was not started: nothing was chosen.")
  await setState({ auto: true })
  await send(id, { type: "record", streamId, opts })
  if (back && back.id !== id) chrome.tabs.update(back.id, { active: true }).catch(() => {})
}

// ---- status from the page ----------------------------------------------------
const BADGE = { recording: ["REC", "#dc2626"], working: ["…", "#5b3df5"], settings: ["!", "#d97706"], done: ["✓", "#059669"], stopped: ["!", "#dc2626"] }

async function onStatus(m, tabId) {
  const before = (await getState()).status
  const st = await setState({ status: m, engine: tabId ?? (await getState()).engine, closed: false, ready: true })
  const [text, color] = BADGE[m.state] || ["", "#5b3df5"]
  chrome.action.setBadgeText({ text }); if (text) chrome.action.setBadgeBackgroundColor({ color })
  // keep the computer awake while recording or writing; a sleeping laptop stops the work
  if (m.state === "working" || m.state === "recording") chrome.power.requestKeepAwake("system")
  else chrome.power.releaseKeepAwake()
  if (before?.state !== m.state) {
    if (m.state === "done" && before?.state === "working") notify("done", "Your guide is ready", `${m.title || "The guide"} is written. Open it to read, change and save it.`)
    if (m.state === "stopped" && before?.state === "working") notify("stopped", "ShowMeWise stopped", m.error || "Open the ShowMeWise tab to see what happened.")
    // a recording made with the plugin starts writing by itself with the last AI settings
    if (m.state === "settings" && st.auto) {
      await setState({ auto: false })
      if (m.lastAI && (await chrome.storage.local.get("autoStart")).autoStart !== false) send(tabId, { type: "generate" }).catch(() => {})
      else notify("settings", "Recording saved", "Choose the AI in the ShowMeWise tab to write the guide.")
    }
  }
  toPanel({ type: "status", status: m })
}

function notify(id, title, message) {
  chrome.notifications.create(id + Date.now(), { type: "basic", iconUrl: "icons/icon128.png", title, message, priority: 2 })
}
chrome.notifications.onClicked.addListener(() => focusEngine())

async function focusEngine() {
  const id = await findEngine()
  if (!id) return chrome.tabs.create({ url: (await site()) + "/#/app" })
  const tab = await chrome.tabs.update(id, { active: true })
  chrome.windows.update(tab.windowId, { focused: true })
}

// the engine tab was closed: say so, the work can be picked up again
// questions still waiting when the ShowMeWise tab goes away would wait forever
const failPending = (why) => edit((log) => log.forEach((x) => { if (!x.done) Object.assign(x, { done: true, error: why }) }))
chrome.tabs.onUpdated.addListener(async (id, info) => {
  // only a tab that was already working: a fresh tab loading for the first time is not a reload
  if (info.status !== "loading") return
  const st = await getState()
  if (id === st.engine && st.ready) { await setState({ ready: false }); failPending("The ShowMeWise tab was reloaded. Ask again.") }
})

chrome.tabs.onRemoved.addListener(async (id) => {
  const st = await getState()
  if (id !== st.engine) return
  failPending("The ShowMeWise tab was closed. Ask again: Vidi opens it by itself.")
  const was = st.status?.state
  const closed = was === "working" || was === "recording" || was === "settings"
  await setState({ engine: null, status: null, closed })
  chrome.power.releaseKeepAwake(); chrome.action.setBadgeText({ text: closed ? "!" : "" })
  toPanel({ type: "status", status: null, closed })
})

// ---- messages ------------------------------------------------------------------
chrome.runtime.onMessage.addListener((m, from, reply) => {
  if (m?.from === "page") {
    if (!isSite(from.url || from.tab?.url)) return
    // answers for Vidi the pet (pet/pet-bg.js)
    if (String(m.id || "").startsWith("pet-")) return void petFromEngine(m)
    if (m.type === "status") onStatus(m, from.tab?.id)
    // "Test my computer" on the website: free memory and open tabs (a website cannot read these)
    // the pet intro on the Pet training page reads and sets the pet (pet/pet-bg.js)
    else if (m.type === "pet-info") petInfo().then((info) => from.tab?.id && send(from.tab.id, { type: "pet-info", id: m.id, ...info })).catch(() => {})
    // "▶ Try it" on the Pet training page: the pet hears the sentence as if the user typed it
    else if (m.type === "pet-try" && from.tab?.id != null && /#\/pet-training/.test(from.tab.url || from.url || "")) chrome.tabs.sendMessage(from.tab.id, { to: "pet-page", type: "open" }).catch(() => {}).then(() => petHear(String(m.text || "").slice(0, 300), from.tab.id))
    else if (m.type === "pet-setup") petSetup(m.setup).then((info) => from.tab?.id && send(from.tab.id, { type: "pet-info", id: m.id, ...info })).catch(() => {})
    else if (m.type === "need-system-info") systemInfo().then((info) => from.tab?.id && send(from.tab.id, { type: "system-info", id: m.id, ...info })).catch(() => {})
    else if (m.type === "chat-status") chatUpdate(m.id, { label: m.label })
    else if (m.type === "chat-partial") chatUpdate(m.id, { partial: m.text })
    else if (m.type === "chat-answer" && String(m.id).startsWith("pick-")) showPicks(m.id.slice(5), m)
    else if (m.type === "chat-answer") chatUpdate(m.id, { done: true, answer: m.answer, error: m.error, sources: m.sources, readPages: m.readPages, model: m.model })
    else if (m.type === "chat-need-pages") readLinks(m)
    return
  }
  if (m?.to !== "bg") return
  const done = (p) => p.then((r) => reply({ ok: true, ...(r || {}) }), (e) => reply({ ok: false, error: e.message }))
  if (m.type === "state") done(getState().then(async (st) => ({ ...st, site: await site() })))
  // pressed again while the picker is still open: that press does nothing
  else if (m.type === "record") done(starting ? Promise.resolve({ busy: true }) : (starting = record(m.opts).finally(() => { starting = null })))
  else if (m.type === "stop") done(findEngine().then((id) => id && send(id, { type: "stop" })))
  // Continue after a closed tab: the same recording, then writing starts by itself again
  else if (m.type === "recover") done(setState({ auto: true }).then(ensureEngine).then((id) => send(id, { type: "recover" })))
  else if (m.type === "generate" || m.type === "new") done(ensureEngine().then((id) => send(id, { type: m.type })))
  else if (m.type === "focus") done(focusEngine())
  else if (m.type === "chat") done(chat(m.chat))
  else if (m.type === "showme") done(showMe(m.id))
  else if (m.type === "chat-clear") done(edit((log) => log.splice(0)))
  else return
  return true // answer comes later
})

// ---- chat ----------------------------------------------------------------------
// The chat lives here, not in the popup: the popup closes whenever the user
// clicks elsewhere, and answers must still arrive. The log is in session
// storage (cleared when the browser closes); the popup just shows it.
const asked = new Map() // id -> the question as sent (a document's bytes are not stored)
const getChat = async () => (await chrome.storage.session.get("chat")).chat || []
// every change to the log goes one after another, so none overwrites another
let lock = Promise.resolve()
const edit = (fn) => (lock = lock.then(async () => { const log = await getChat(); fn(log); await chrome.storage.session.set({ chat: log.slice(-30) }) }).catch(() => {}))
function chatUpdate(id, patch) {
  if (patch.done) asked.delete(id)
  return edit((log) => { const i = log.findIndex((x) => x.id === id); if (i >= 0) log[i] = { ...log[i], ...patch } })
}

// the page the user looks at: the active tab of the last used normal window
async function pageTab() {
  const tabs = (await chrome.tabs.query({ active: true, windowType: "normal" })).filter((t) => /^https?:/.test(t.url || ""))
  return tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0]
}

async function chat(c) {
  const id = Math.random().toString(36).slice(2)
  await edit((log) => log.push({ id, q: c.question, scope: c.scope, label: "Thinking..." }))
  try {
    const msg = { id, question: c.question, scope: c.scope, followLinks: c.followLinks !== false }
    if (c.scope === "page") {
      if (!(await chrome.permissions.contains({ origins: ["<all_urls>"] }))) throw Object.assign(new Error("To read the page you are on, Vidi needs your OK once."), { needOk: true })
      const tab = await pageTab()
      if (!tab) throw new Error("This page cannot be read. Browser pages and the web store are protected.")
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          title: document.title, url: location.href,
          text: (document.body?.innerText || "").slice(0, 2000000),
          links: [...document.querySelectorAll("a[href]")].slice(0, 400).map((a) => ({ text: (a.innerText || a.title || "").trim().slice(0, 100), href: a.href })),
        }),
      })
      if (!result?.text?.trim()) throw new Error("This page has no text to read.")
      msg.page = result
    }
    if (c.scope === "doc") { if (!c.doc) throw new Error("Choose a document first."); msg.doc = c.doc }
    asked.set(id, msg)
    const tab = await ensureEngine()
    await send(tab, { type: "chat", ...msg })
  } catch (e) {
    await chatUpdate(id, { done: true, error: e.message, needOk: !!e.needOk })
  }
  return { id }
}

// not on the page: read the links that match the question (same site), ask again
async function readLinks(m) {
  const msg = asked.get(m.id); if (!msg) return chatUpdate(m.id, { done: true, error: "It is not on this page." })
  await chatUpdate(m.id, { label: `Not on this page. Reading ${m.links.length} linked page${m.links.length > 1 ? "s" : ""}...` })
  const pages = []
  for (const l of m.links) {
    try {
      const r = await fetch(l.href, { credentials: "include" })
      if (r.ok && /html|text/.test(r.headers.get("content-type") || "")) pages.push({ url: l.href, title: l.text, html: (await r.text()).slice(0, 2000000) })
    } catch { /* that page could not be read */ }
  }
  if (!pages.length) return chatUpdate(m.id, { done: true, error: "It is not on this page, and the linked pages could not be read." })
  const tab = await ensureEngine()
  await send(tab, { type: "chat", ...msg, pages })
}

// ---- "Show me on the page" ------------------------------------------------------
// Only when the user presses the button under an answer. Vidi finds the buttons
// and fields the answer is about, scrolls there, marks them on the real page
// (a numbered tag beside each, with a small arrow; never on top of it) and puts
// a screenshot of the marked page into the chat. It never clicks for the user.
const showing = new Map() // chat id -> { tabId }
// the last marking of each pet answer, so "which one?" can mark the one the user tapped (the 5 newest)
const lastShown = new Map()

// what can be seen and used on a page, each with a number (data-vidi-idx); used by
// Show me on the page in the panel and by the pet
async function pageElements(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      document.querySelectorAll("[data-vidi-idx]").forEach((e) => e.removeAttribute("data-vidi-idx"))
      const out = [], els = []
      for (const e of document.querySelectorAll("a[href],button,input,select,textarea,[role=button],[role=tab],[role=menuitem],summary,label,h1,h2,h3")) {
        const r = e.getBoundingClientRect(), st = getComputedStyle(e)
        if (r.width < 4 || r.height < 4 || st.visibility === "hidden" || st.display === "none") continue
        // the Pet training's own "▶ Try" buttons are not part of the practice page (one was marked as the step)
        if (e.closest("[data-vidi-skip]")) continue
        const t = (e.innerText || e.getAttribute("aria-label") || e.placeholder || e.title || e.value || "").replace(/\s+/g, " ").trim().slice(0, 80)
        if (!t) continue
        e.setAttribute("data-vidi-idx", String(out.length))
        out.push(`${t} (${e.tagName.toLowerCase()})`)
        els.push([e, t])
        if (out.length >= 150) break
      }
      // the same button many times ("Add to cart" on every product, "Delete" on every note):
      // each gets what is written next to it, so the right one can be told apart
      const count = {}
      for (const [, t] of els) count[t.toLowerCase()] = (count[t.toLowerCase()] || 0) + 1
      els.forEach(([e, t], i) => {
        if (count[t.toLowerCase()] < 2) return
        let p = e.parentElement, near = ""
        for (let k = 0; k < 5 && p && !near; k++, p = p.parentElement) near = (p.innerText || "").replace(t, " ").replace(/\s+/g, " ").trim().slice(0, 60)
        if (near) out[i] += ` [next to: ${near}]`
      })
      return out
    },
  })
  return result
}

async function showMe(id) {
  const entry = (await getChat()).find((x) => x.id === id)
  if (!entry?.done || entry.error) throw new Error("There is no answer to show yet.")
  if (!(await chrome.permissions.contains({ origins: ["<all_urls>"] }))) throw new Error("To mark the page, Vidi needs your OK once. Press Allow Vidi to read the pages I ask about.")
  // Help answers are about ShowMeWise itself: shown on the ShowMeWise tab
  const tab = entry.scope === "help" ? await chrome.tabs.get(await ensureEngine()) : await pageTab()
  if (!tab) throw new Error("This page cannot be marked. Browser pages and the web store are protected.")
  await chrome.tabs.update(tab.id, { active: true }); await chrome.windows.update(tab.windowId, { focused: true })
  await chatUpdate(id, { showing: "Vidi is looking at the page..." })
  const elements = await pageElements(tab.id)
  if (!elements?.length) return chatUpdate(id, { showing: "", shotNote: "I could not find buttons or fields on this page to mark." })
  showing.set(id, { tabId: tab.id, windowId: tab.windowId, elements, answer: entry.answer })
  await send(await ensureEngine(), { type: "chat", id: "pick-" + id, scope: "pick", question: entry.q, answer: entry.answer, elements })
}

async function showPicks(id, m) {
  const s = showing.get(id); showing.delete(id)
  if (!s) return
  // asked by the pet: its own chat gets the picture (pet/pet-bg.js)
  const update = s.pet ? (patch) => petUpdate(id, patch) : (patch) => chatUpdate(id, patch)
  if (m.error || !m.picks?.length) return update({ showing: "", shotNote: "I could not tell which part of this page the answer is about." })
  await chrome.tabs.update(s.tabId, { active: true }).catch(() => {})
  lastShown.set(id, s); while (lastShown.size > 5) lastShown.delete(lastShown.keys().next().value)
  // "Delete (button) [next to: Gift ideas]": the button's name, and what is written next to it
  const parse = (e) => { const g = String(e).match(/^(.*?) \([a-z0-9]+\)(?: \[next to: (.*)\])?$/) || []; return { label: g[1] || String(e), near: g[2] || "" } }
  const seenLabel = new Set()
  let picks = m.picks.map((idx) => ({ idx, ...parse(s.elements[idx]) }))
    .filter((p) => !seenLabel.has(p.label.toLowerCase()) && seenLabel.add(p.label.toLowerCase()))
  // only what the answer names ("Click New board" marked Share too): the AI's first pick when none is named
  const said = String(s.answer || "").toLowerCase()
  if (picks.some((p) => said.includes(p.label.toLowerCase()))) picks = picks.filter((p) => said.includes(p.label.toLowerCase()))
  else {
    // none named: the AI's first pick only when half of its words are in the answer ("Type a name in the
    // Board name field" before the form is open marked "What is your name?", which shares only "name")
    const w = (t) => (String(t).toLowerCase().match(/[a-zà-ÿ0-9]{4,}/g) || [])
    picks = picks.slice(0, 1).filter((p) => { const lw = w(p.label); return lw.length && lw.filter((x) => said.includes(x)).length * 2 >= lw.length })
    if (!picks.length) return update({ showing: "", shotNote: "I could not find that on the page yet. It may appear after the step before." })
  }
  // a button that is on the page many times: the one next to what the user named; when they named
  // none, all of them are marked and the pet asks which one (it never guesses)
  let choose = null
  if (s.pet && picks.length === 1 && !m.one) {
    // (the same name with the same text next to it is one thing listed twice, like a field and its
    // label: "Board name" asked "which one?" with two identical choices)
    const nears = new Set()
    const same = s.elements.map((e, idx) => ({ idx, ...parse(e) })).filter((x) => x.label.toLowerCase() === picks[0].label.toLowerCase() && x.near)
      .filter((x) => !nears.has(x.near.toLowerCase()) && nears.add(x.near.toLowerCase()))
    if (same.length > 1) {
      // only the user's own words count: the AI guessed "next to Running shoes" when no product was named
      const asked = String(s.question || "").toLowerCase()
      const w = (t) => (t.toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || [])
      const named = same.map((x) => ({ x, n: w(x.near).filter((v) => asked.includes(v)).length })).sort((a, b) => b.n - a.n)
      // (the mark names what it is next to: "Add to cart · Tea kettle", so the user sees it is the right one)
      if (named[0].n > 0 && named[0].n > (named[1]?.n || 0)) picks = [{ ...named[0].x, label: `${named[0].x.label} · ${named[0].x.near.slice(0, 40)}` }]
      else { picks = same.slice(0, 6); choose = picks.map((x, i) => ({ idx: x.idx, n: i + 1, near: x.near })) }
    }
  }
  picks = picks.map((p, i) => ({ ...p, n: i + 1, label: choose ? `${p.label} · ${p.near}` : p.label }))
  await chrome.scripting.executeScript({
    target: { tabId: s.tabId },
    args: [picks],
    func: async (picks) => {
      document.getElementById("vidi-marks")?.remove()
      const els = picks.map((p) => [p, document.querySelector(`[data-vidi-idx="${p.idx}"]`)]).filter((x) => x[1])
      els[0]?.[1].scrollIntoView({ block: "center", behavior: "instant" })
      await new Promise((r) => setTimeout(r, 350))
      const root = document.createElement("div")
      root.id = "vidi-marks"
      root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:600 13px/1.3 system-ui,Segoe UI,sans-serif"
      // a spot is free when nothing readable or clickable is under it (big page backgrounds do not count)
      const placed = []
      // Is there real content at this point? Controls, links, pictures, or a
      // letter of text. A paragraph's empty space after a short line is free
      // (counting the whole paragraph box pushed tags onto the buttons).
      const SOLID = /^(IMG|INPUT|BUTTON|SELECT|TEXTAREA|VIDEO|CANVAS|SVG|A|LABEL|IFRAME)$/
      const contentAt = (x, y, skip) => {
        const e = document.elementFromPoint(x, y)
        if (!e || e === document.body || e === document.documentElement) return false
        if (skip && (e === skip || skip.contains(e))) return false
        if (SOLID.test(e.tagName.toUpperCase()) || e.closest("a,button,[role=button],input,select,textarea")) return true
        const c = document.caretRangeFromPoint?.(x, y)
        const node = c?.startContainer
        if (!node || node.nodeType !== 3 || !node.data.trim()) return false
        const range = document.createRange()
        for (const o of [c.startOffset - 1, c.startOffset]) {
          if (o < 0 || o >= node.data.length || !node.data[o].trim()) continue
          range.setStart(node, o); range.setEnd(node, o + 1)
          for (const b of range.getClientRects()) if (x >= b.left - 2 && x <= b.right + 2 && y >= b.top - 2 && y <= b.bottom + 2) return true
        }
        return false
      }
      const hits = (x, y, w, h) => {
        if (x < 2 || y < 2 || x + w > innerWidth - 2 || y + h > innerHeight - 2) return 99
        let n = 0
        for (let px = 0; px <= 1; px += 0.25) for (const py of [0, 0.5, 1]) if (contentAt(x + px * w, y + py * h)) n++
        for (const q of placed) if (!(x + w < q.x || x > q.x + q.w || y + h < q.y || y > q.y + q.h)) n += 5
        return n
      }
      // what a line from the tag back to the item would cross (points every 10 px)
      const lineHits = (side, x, y, w, h, r, item) => {
        const from = { right: [x, y + h / 2], left: [x + w, y + h / 2], below: [x + 16, y], above: [x + 16, y + h] }[side]
        const to = { right: [r.right + 5, r.top + r.height / 2], left: [r.left - 5, r.top + r.height / 2], below: [Math.min(r.right - 6, x + 16), r.bottom + 5], above: [Math.min(r.right - 6, x + 16), r.top - 5] }[side]
        const n = Math.max(1, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 10))
        let c = 0
        for (let k = 1; k < n; k++) {
          if (contentAt(from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n, item)) c++
        }
        return c
      }
      for (const [p, el] of els) {
        const r = el.getBoundingClientRect()
        const box = document.createElement("div")
        // a thin frame close around the item, so tightly packed neighbours stay readable
        box.style.cssText = `position:fixed;left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px;border:2px solid #7c5cff;border-radius:6px;box-shadow:0 0 12px rgba(124,92,255,.55)`
        const tag = document.createElement("div")
        tag.style.cssText = "position:fixed;left:-9999px;top:0;display:flex;align-items:center;gap:6px;max-width:220px;background:#1b1342;color:#fff;border:1px solid #7c5cff;border-radius:999px;padding:4px 10px 4px 4px;box-shadow:0 4px 14px rgba(0,0,0,.35)"
        const n = document.createElement("span")
        n.textContent = p.n
        n.style.cssText = "flex:none;width:22px;height:22px;border-radius:50%;background:#7c5cff;display:flex;align-items:center;justify-content:center"
        const t = document.createElement("span")
        t.textContent = p.label
        t.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
        tag.append(n, t)
        root.append(box, tag)
        document.documentElement.append(root)
        const w = tag.offsetWidth, h = tag.offsetHeight, cy = r.top + r.height / 2 - h / 2, gap = 18
        // beside the item first; when that covers something, further out step by
        // step (a crowded toolbar row), with a thin line back to the item
        let best = null
        for (const d of [0, 30, 60, 100, 150, 220]) {
          for (const [side, x, y] of [["right", r.right + gap + d, cy], ["below", r.left, r.bottom + gap + d], ["left", r.left - gap - w - d, cy], ["above", r.left, r.top - gap - h - d]]) {
            // a far spot also pays for what its line would cross
            // a tag on top of a button or text is far worse than a thin line crossing it
            const cost = 4 * hits(x, y, w, h) + (d ? lineHits(side, x, y, w, h, r, el) : 0)
            if (!best || cost < best.cost) best = { side, x, y, d, cost }
            if (cost === 0) break
          }
          if (best.cost === 0) break
        }
        tag.style.left = best.x + "px"; tag.style.top = best.y + "px"
        placed.push({ x: best.x, y: best.y, w, h }, { x: r.left - 3, y: r.top - 3, w: r.width + 6, h: r.height + 6 })
        if (best.d === 0) {
          // close by: a small arrow points from the tag to the item
          const arrow = document.createElement("div")
          const A = "position:absolute;width:0;height:0;border:7px solid transparent;"
          arrow.style.cssText = A + {
            right: "left:-14px;top:50%;margin-top:-7px;border-right-color:#7c5cff",
            left: "right:-14px;top:50%;margin-top:-7px;border-left-color:#7c5cff",
            below: "top:-14px;left:14px;border-bottom-color:#7c5cff",
            above: "bottom:-14px;left:14px;border-top-color:#7c5cff",
          }[best.side]
          tag.append(arrow)
        } else {
          // further away: a line from the tag to the item, with a dot at the item
          const from = { right: [best.x, best.y + h / 2], left: [best.x + w, best.y + h / 2], below: [best.x + 16, best.y], above: [best.x + 16, best.y + h] }[best.side]
          const to = { right: [r.right + 5, r.top + r.height / 2], left: [r.left - 5, r.top + r.height / 2], below: [Math.min(r.right - 6, best.x + 16), r.bottom + 5], above: [Math.min(r.right - 6, best.x + 16), r.top - 5] }[best.side]
          const NS = "http://www.w3.org/2000/svg"
          const svg = document.createElementNS(NS, "svg")
          svg.setAttribute("style", "position:fixed;inset:0;width:100vw;height:100vh;overflow:visible")
          const line = document.createElementNS(NS, "line")
          for (const [k, v] of [["x1", from[0]], ["y1", from[1]], ["x2", to[0]], ["y2", to[1]], ["stroke", "#7c5cff"], ["stroke-width", "2.5"], ["stroke-opacity", "0.75"]]) line.setAttribute(k, v)
          const dot = document.createElementNS(NS, "circle")
          for (const [k, v] of [["cx", to[0]], ["cy", to[1]], ["r", "4"], ["fill", "#7c5cff"]]) dot.setAttribute(k, v)
          svg.append(line, dot); root.append(svg)
        }
      }
      document.documentElement.append(root)
      // gone after 10 seconds, or at the first click or key (the screenshot in the chat keeps them)
      const off = () => root.remove()
      setTimeout(off, 10000); addEventListener("pointerdown", off, { once: true }); addEventListener("keydown", off, { once: true })
    },
  })
  // the pet steps out of the picture for a moment
  if (s.pet) await chrome.storage.local.set({ petHideUntil: Date.now() + 1500 })
  await new Promise((r) => setTimeout(r, s.pet ? 350 : 250))
  let shot = null
  try { shot = await chrome.tabs.captureVisibleTab(s.windowId, { format: "jpeg", quality: 70 }) } catch { /* the window is hidden */ }
  const note = `I marked ${picks.length} place${picks.length > 1 ? "s" : ""} on the page: ${picks.map((p) => `${p.n}. ${p.label}`).join(", ")}. The marks go away after 10 seconds or when you click (the picture keeps them).`
  if (s.pet && choose) { await petShot(id, shot, tr("whichOne", { list: choose.map((c) => `${c.n}. ${c.near}`).join(" · ") })); return petUpdate(id, { choose }) }
  if (s.pet) return petShot(id, shot, note)
  // only the newest pictures are kept (session storage is small)
  await edit((log) => {
    let kept = 0
    for (let i = log.length - 1; i >= 0; i--) if (log[i].shot && ++kept >= 3) delete log[i].shot
    const e = log.find((x) => x.id === id)
    if (e) Object.assign(e, { showing: "", shot, shotNote: note })
  })
}

// ---- free memory and open tabs, for "Test my computer" ---------------------------
async function systemInfo() {
  const mem = await chrome.system.memory.getInfo()
  const tabs = (await chrome.tabs.query({})).length
  return { freeMB: Math.round(mem.availableCapacity / 1048576), totalMB: Math.round(mem.capacity / 1048576), tabs }
}

// Vidi the pet (BETA): timers, reminders, search and the pet on every page
importScripts("pet/i18n.js", "pet/scores.js", "pet/pet-bg.js")
