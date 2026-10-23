// The plugin's background worker. The VideoDoc website does the real work in a
// tab of its own (the "engine"): the same app, the same downloaded models and
// the same saved progress as on the website. This worker opens that tab when
// needed, starts recordings in it, passes chat questions to it, keeps the
// computer awake while it works and says when a guide is ready.

const SITES = ["https://videodoc.netlify.app", "http://127.0.0.1:8899"]
const site = async () => (await chrome.storage.local.get("site")).site || SITES[0]
const isSite = (url = "") => SITES.some((s) => url.startsWith(s + "/"))

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

const getState = async () => (await chrome.storage.session.get("st")).st || { status: null, engine: null, auto: false }
const setState = async (patch) => { const st = { ...(await getState()), ...patch }; await chrome.storage.session.set({ st }); return st }
const toPanel = (msg) => chrome.runtime.sendMessage({ to: "panel", ...msg }).catch(() => {})

// the engine tab: one that already talks to us, else a VideoDoc app tab
async function findEngine() {
  const { engine } = await getState()
  const tabs = await chrome.tabs.query({ url: SITES.map((s) => s + "/*") })
  if (engine && tabs.some((t) => t.id === engine)) return engine
  return tabs.find((t) => /#\/app/.test(t.url || ""))?.id ?? null
}

// wait until the engine reports a state that passes `ok`
function waitFor(ok, ms = 45000) {
  return new Promise((res, rej) => {
    const on = (m) => { if (m?.from === "page" && m.type === "status" && ok(m)) { chrome.runtime.onMessage.removeListener(on); clearTimeout(t); res(m) } }
    const t = setTimeout(() => { chrome.runtime.onMessage.removeListener(on); rej(new Error("The VideoDoc tab did not answer. Is the website open and loaded?")) }, ms)
    chrome.runtime.onMessage.addListener(on)
  })
}
const send = (tabId, msg) => chrome.tabs.sendMessage(tabId, { to: "page", ...msg })

async function ensureEngine() {
  let id = await findEngine()
  if (!id) {
    const tab = await chrome.tabs.create({ url: (await site()) + "/#/app", active: false, pinned: true })
    id = tab.id
    await setState({ engine: id })
    await waitFor(() => true)
  } else {
    await setState({ engine: id })
    // a tab opened before the plugin was installed has no helper script yet
    await send(id, { type: "hello" }).catch(async () => {
      await chrome.scripting.executeScript({ target: { tabId: id }, files: ["content.js"] })
    })
  }
  return id
}

// ---- recording -------------------------------------------------------------
async function record() {
  const id = await ensureEngine()
  const { status } = await getState()
  if (status?.state === "working") throw new Error("VideoDoc is still writing a guide. Record the next one when it is done.")
  if (status?.state && status.state !== "upload") {
    await send(id, { type: "new" })
    await waitFor((m) => m.state === "upload", 15000)
  }
  // the picker opens over the VideoDoc tab; pick the whole screen, a window or a tab
  const tab = await chrome.tabs.update(id, { active: true })
  await chrome.windows.update(tab.windowId, { focused: true })
  const streamId = await new Promise((res) => chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab", "audio"], tab, (sid) => res(sid)))
  if (!streamId) throw new Error("Recording was not started: nothing was chosen.")
  await setState({ auto: true })
  await send(id, { type: "record", streamId })
}

// ---- status from the page ----------------------------------------------------
const BADGE = { recording: ["REC", "#dc2626"], working: ["…", "#5b3df5"], settings: ["!", "#d97706"], done: ["✓", "#059669"], stopped: ["!", "#dc2626"] }

async function onStatus(m, tabId) {
  const before = (await getState()).status
  const st = await setState({ status: m, engine: tabId ?? (await getState()).engine })
  const [text, color] = BADGE[m.state] || ["", "#5b3df5"]
  chrome.action.setBadgeText({ text }); if (text) chrome.action.setBadgeBackgroundColor({ color })
  // keep the computer awake while recording or writing; a sleeping laptop stops the work
  if (m.state === "working" || m.state === "recording") chrome.power.requestKeepAwake("system")
  else chrome.power.releaseKeepAwake()
  if (before?.state !== m.state) {
    if (m.state === "done" && before?.state === "working") notify("done", "Your guide is ready", `${m.title || "The guide"} is written. Open it to read, change and save it.`)
    if (m.state === "stopped" && before?.state === "working") notify("stopped", "VideoDoc stopped", m.error || "Open the VideoDoc tab to see what happened.")
    // a recording made with the plugin starts writing by itself with the last AI settings
    if (m.state === "settings" && st.auto) {
      await setState({ auto: false })
      if (m.lastAI && (await chrome.storage.local.get("autoStart")).autoStart !== false) send(tabId, { type: "generate" }).catch(() => {})
      else notify("settings", "Recording saved", "Choose the AI in the VideoDoc tab to write the guide.")
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
chrome.tabs.onRemoved.addListener(async (id) => {
  const st = await getState()
  if (id !== st.engine) return
  const was = st.status?.state
  await setState({ engine: null, status: null })
  chrome.power.releaseKeepAwake(); chrome.action.setBadgeText({ text: "" })
  toPanel({ type: "status", status: null, closed: was === "working" || was === "recording" })
})

// ---- messages ------------------------------------------------------------------
chrome.runtime.onMessage.addListener((m, from, reply) => {
  if (m?.from === "page") {
    if (!isSite(from.url || from.tab?.url)) return
    if (m.type === "status") onStatus(m, from.tab?.id)
    else toPanel(m) // chat answers, hello
    return
  }
  if (m?.to !== "bg") return
  const done = (p) => p.then((r) => reply({ ok: true, ...(r || {}) }), (e) => reply({ ok: false, error: e.message }))
  if (m.type === "state") done(getState().then(async (st) => ({ ...st, site: await site() })))
  else if (m.type === "record") done(record())
  else if (m.type === "stop") done(findEngine().then((id) => id && send(id, { type: "stop" })))
  else if (m.type === "generate" || m.type === "recover" || m.type === "new") done(ensureEngine().then((id) => send(id, { type: m.type })))
  else if (m.type === "focus") done(focusEngine())
  else if (m.type === "chat") done(ensureEngine().then((id) => send(id, { type: "chat", ...m.chat })))
  else return
  return true // answer comes later
})
