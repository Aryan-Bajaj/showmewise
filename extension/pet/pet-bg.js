// Vidi the pet (BETA), the background part. Loaded by bg.js.
// The pet on the page sends what the user types here. Timers, alarms,
// reminders, the time, names and likes are handled right here, without the
// AI, so they are always right. Everything else goes to the VideoDoc engine
// tab like the other chats: questions about VideoDoc to Help, "this page"
// to the page, the rest to a friendly general chat (with web results when
// the user asks to search). The chat, the settings and what Vidi remembers
// stay in this browser (chrome.storage.local).

const PET_DEFAULT = { on: true, kind: "dragon", colour: "", name: "Vidi", picture: null, use3d: false, pos: { side: "right", y: 0.72 }, hiddenSites: [] }
const petGet = async () => ({ ...PET_DEFAULT, ...((await chrome.storage.local.get("pet")).pet || {}) })
const petSet = async (patch) => { const pet = { ...(await petGet()), ...patch }; await chrome.storage.local.set({ pet }); return pet }
const memGet = async () => (await chrome.storage.local.get("petMem")).petMem || { user: "", likes: [], good: 0, bad: 0, chats: 0 }
const memSet = async (patch) => chrome.storage.local.set({ petMem: { ...(await memGet()), ...patch } })

// ---- the chat log (shared by the pet on every tab) --------------------------------
let petLock = Promise.resolve()
const petEdit = (fn) => (petLock = petLock.then(async () => {
  const log = (await chrome.storage.local.get("petLog")).petLog || []
  fn(log)
  await chrome.storage.local.set({ petLog: log.slice(-40) })
}).catch(() => {}))
const petId = () => "pet-" + Math.random().toString(36).slice(2)
const petSay = (text, extra = {}) => petEdit((log) => log.push({ id: petId(), who: "pet", text, state: "done", at: Date.now(), ...extra }))
const petUpdate = (id, patch) => petEdit((log) => { const i = log.findIndex((x) => x.id === id); if (i >= 0) log[i] = { ...log[i], ...patch } })

// ---- times -------------------------------------------------------------------------
const hhmm = (d) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
const UNIT = { s: 1e3, sec: 1e3, secs: 1e3, second: 1e3, seconds: 1e3, m: 6e4, min: 6e4, mins: 6e4, minute: 6e4, minutes: 6e4, h: 36e5, hr: 36e5, hrs: 36e5, hour: 36e5, hours: 36e5 }
// Commands in German, Hinglish, Spanish and French: their usual words become the
// English ones, so one tested reader understands all five ("Timer 10 Minuten",
// "kal 7 baje alarm", "recuérdame en 5 minutos", "rappelle-moi dans 5 minutes").
const WORDS = [
  [/\b(wie spät ist es|kitne baje hai[n]?|time kya hua|qué hora es|que hora es|quelle heure est[- ]il)\b/g, "what time is it"],
  [/\b(welcher tag ist heute|welches datum ist heute|aaj kya date hai|aaj kaun sa din hai|qué día es hoy|quel jour sommes[- ]nous)\b/g, "what day is it"],
  [/(führe mich|fuehre mich|guíame|guiame|guide-moi|guidez-moi)/g, "guide me"],
  [/(hilf mir|meri madad karo|madad karo|ayúdame|ayudame|aide-moi|aidez-moi)/g, "help me"],
  [/\b(fülle|füll|ausfüllen|rellena|rellenar|remplis|remplir)\b/g, "fill"],
  [/\b(diese seite|dieses formular|esta página|este formulario|cette page|ce formulaire)\b/g, "this page"],
  [/\b(erinnere mich|erinner mich|yaad dila(?:na|o|do|dena)?|recuérdame|recuerdame|rappelle[- ]moi)\b/g, "remind me"],
  [/\b(wecker|alarma|réveil|reveil)\b/g, "alarm"], [/\b(minuteur|temporizador)\b/g, "timer"],
  [/\b(minuten|minuto?s?|minute)\b/g, "minutes"], [/\b(stunden?|ghante|ghanta|horas?|heures?)\b/g, "hours"], [/\b(sekunden?|secondes?|segundos?)\b/g, "seconds"],
  [/\b(morgen|kal|mañana|manana|demain)\b/g, "tomorrow"], [/\b(halbe stunde|aadha ghanta|media hora|demi[- ]heure)\b/g, "30 minutes"],
  [/\b(\d{1,2})h(\d{2})\b/g, "$1:$2"], [/\b(\d{1,2}(?::\d{2})?)\s*baje\b/g, "at $1"], [/(^|\s)(?:um|a las|à)\s+(\d{1,2})/g, "$1at $2"],
  [/\b(lösch\w*|stopp|abbrechen|cancela|borra|annule|supprime|band karo|hatao|cancel karo)\b/g, "cancel"],
  [/\b(zeig\w*|dikhao|muestra|montre)\b/g, "show"], [/\b(meine|mere|meri|mis|mes)\b/g, "my"],
  // only the foreign words: the English ones stay as they are ("alarm" must stay "alarm")
  [/\b(erinnerungen?|recordatorios?|rappels?)\b/g, "reminders"], [/\b(temporizadores|minuteurs)\b/g, "timers"], [/\b(alarmas|réveils)\b/g, "alarms"],
]
const toEnglish = (t) => WORDS.reduce((s, [re, en]) => s.replace(re, en), t)

// "in 5 minutes", "for 1 hour 30 min", "half an hour", "at 17:30", "at 5 pm", "tomorrow at 8"
function parseWhen(text, now = new Date()) {
  const t = text.toLowerCase().replace(/\bhalf an hour\b/g, "30 minutes").replace(/\ban hour\b/g, "1 hour").replace(/\ba (minute|second)\b/g, "1 $1")
  let ms = 0
  for (const m of t.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\b/g)) ms += parseFloat(m[1].replace(",", ".")) * UNIT[m[2]]
  if (ms) return { when: now.getTime() + ms, rel: true }
  let h, min = 0, ap
  const m = t.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/) || t.match(/\bat\s+(\d{1,2})\s*(am|pm)?\b/) || t.match(/\b(\d{1,2})\s*(am|pm)\b/)
  if (/\bnoon\b/.test(t)) h = 12
  else if (/\bmidnight\b/.test(t)) h = 0
  else if (m) { h = +m[1]; if (m[2] && /^\d+$/.test(m[2])) min = +m[2]; ap = (m[3] || (/^(am|pm)$/.test(m[2] || "") ? m[2] : "")) }
  if (h == null || h > 23 || min > 59) return null
  if (ap === "pm" && h < 12) h += 12
  if (ap === "am" && h === 12) h = 0
  const d = new Date(now); d.setHours(h, min, 0, 0)
  if (/\btomorrow\b/.test(t) || d <= now) d.setDate(d.getDate() + 1)
  return { when: d.getTime() }
}
// a duration in the pet's language ("10 Minuten", "5 minutes"); Hinglish uses the English words
const say = (ms) => {
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const loc = VidiI18n.lang === "hi" ? "en" : VidiI18n.lang
  const unit = (n, u) => new Intl.NumberFormat(loc, { style: "unit", unit: u, unitDisplay: "long" }).format(n)
  return [h && unit(h, "hour"), m && unit(m, "minute"), !h && r && unit(r, "second")].filter(Boolean).join(" ") || unit(1, "second")
}
const tr = (k, v) => VidiI18n.t(k, v)
// the language the user chose for the pet (or the browser's)
petGet().then((p) => VidiI18n.setLang(p.lang))
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.pet) VidiI18n.setLang(ch.pet.newValue?.lang) })

// ---- timers, alarms, reminders ---------------------------------------------------
const alarmsGet = async () => (await chrome.storage.local.get("petAlarms")).petAlarms || []
const alarmsSet = (list) => chrome.storage.local.set({ petAlarms: list })

async function addAlarm(kind, when, text) {
  const a = { id: Math.random().toString(36).slice(2), kind, when, text }
  await alarmsSet([...(await alarmsGet()), a])
  await chrome.alarms.create("pet:" + a.id, { when })
  // Chrome fires plugin alarms 30 s apart at the soonest: a short timer also
  // counts down here (the first of the two to fire rings, the other finds nothing)
  if (when - Date.now() < 60000) setTimeout(async () => { const x = (await alarmsGet()).find((y) => y.id === a.id); if (x) ring(x, false) }, Math.max(0, when - Date.now()))
  return a
}

// the short-timer countdown and Chrome's alarm can fire at the same moment: each rings once
const rung = new Set()
async function ring(a, missed) {
  if (rung.has(a.id)) return
  rung.add(a.id)
  await alarmsSet((await alarmsGet()).filter((x) => x.id !== a.id))
  chrome.alarms.clear("pet:" + a.id)
  const what = a.kind === "reminder" ? tr("reminder", { what: a.text }) : a.kind === "alarm" ? tr("alarm", { what: a.text ? `: ${a.text}` : "" }) : tr("timeUp", { what: a.text ? `: ${a.text}` : "" })
  const msg = missed ? tr("missed", { what, time: hhmm(new Date(a.when)) }) : what
  const pet = await petGet()
  // missed while the browser was closed: told, not rung
  if (missed) {
    chrome.notifications.create("pet:" + a.id, { type: "basic", iconUrl: "icons/icon128.png", title: `${pet.name} ⏰`, message: msg, priority: 1 })
    return petSay(msg)
  }
  chrome.notifications.create("pet:" + a.id, { type: "basic", iconUrl: "icons/icon128.png", title: `${pet.name} ⏰`, message: msg, requireInteraction: true, priority: 2, buttons: [{ title: tr("stop") }, { title: tr("snooze") }] })
  await chrome.storage.local.set({ petRing: { id: a.id, text: msg, at: Date.now() } })
  await petSay(msg, { ring: a.id, snooze: { kind: a.kind, text: a.text } })
  await sound(a.kind === "alarm" ? 30 : 6)
}

async function stopRing(snooze) {
  const { petRing } = await chrome.storage.local.get("petRing")
  await chrome.storage.local.remove("petRing")
  chrome.offscreen?.closeDocument?.().catch(() => {})
  if (petRing) chrome.notifications.clear("pet:" + petRing.id)
  if (snooze) {
    const a = await addAlarm(snooze.kind, Date.now() + 5 * 6e4, snooze.text)
    await petSay(tr("again", { time: hhmm(new Date(a.when)) }))
  } else if (petRing) await petSay(tr("stopped"))
}

// a soft chime, played from a hidden extension page (a service worker cannot play sound)
async function sound(seconds) {
  try {
    const open = (await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] })).length
    if (!open) await chrome.offscreen.createDocument({ url: "pet/sound.html", reasons: ["AUDIO_PLAYBACK"], justification: "Timer and alarm sound" })
    chrome.runtime.sendMessage({ to: "sound", seconds }).catch(() => {})
  } catch { /* no sound: the notification still shows */ }
}

chrome.alarms.onAlarm.addListener(async (al) => {
  if (!al.name.startsWith("pet:")) return
  const a = (await alarmsGet()).find((x) => x.id === al.name.slice(4))
  if (a) ring(a, Date.now() - a.when > 120000)
})
chrome.notifications.onButtonClicked.addListener(async (nid, i) => {
  if (!nid.startsWith("pet:")) return
  const last = ((await chrome.storage.local.get("petLog")).petLog || []).filter((x) => x.ring === nid.slice(4)).pop()
  stopRing(i === 1 ? last?.snooze : null)
})
chrome.notifications.onClosed.addListener((nid, byUser) => { if (byUser && nid.startsWith("pet:")) stopRing() })

// Alarms are not kept when the browser closes: set again on start, and the
// ones missed meanwhile are told (not rung loudly).
async function petStart() {
  const now = Date.now()
  for (const a of await alarmsGet()) {
    if (a.when > now) chrome.alarms.create("pet:" + a.id, { when: a.when })
    else await ring(a, true)
  }
  await petScript()
}
chrome.runtime.onStartup.addListener(petStart)
// the browser just opened: the first page the user looks at gets a greeting (pet.js)
chrome.runtime.onStartup.addListener(() => chrome.storage.local.set({ petGreet: Date.now() }))
chrome.runtime.onInstalled.addListener(petStart)

// ---- the pet on every page --------------------------------------------------------
// Only after the user said OK to pages ("Allow Vidi to read the pages"), only
// when the pet is on. On the VideoDoc website only on the Pet training page (it has its own Vidi elsewhere).
const PET_FILES = ["pet/i18n.js", "pet/pets.js", "pet/pet-css.js", "pet/pet.js"]
async function petScript() {
  const pet = await petGet()
  const allowed = await chrome.permissions.contains({ origins: ["<all_urls>"] })
  let have = (await chrome.scripting.getRegisteredContentScripts({ ids: ["vidi-pet", "vidi-pet-keys"] }).catch(() => [])).length
  // an older version registered only the pet: both again
  if (have === 1) { for (const id of ["vidi-pet", "vidi-pet-keys"]) await chrome.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {}); have = 0 }
  if (pet.on && allowed && !have) {
    // also on the VideoDoc website: there the pet shows only on the Pet training page (pet.js)
    const where = { matches: ["http://*/*", "https://*/*"] }
    await chrome.scripting.registerContentScripts([
      { id: "vidi-pet-keys", ...where, js: ["pet/keys.js"], runAt: "document_start" },
      { id: "vidi-pet", ...where, js: PET_FILES, runAt: "document_idle" },
    ]).catch(() => {})
    // the tabs already open get the pet now too
    for (const t of await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] })) {
      chrome.scripting.executeScript({ target: { tabId: t.id }, files: ["pet/keys.js", ...PET_FILES] }).catch(() => {})
    }
  } else if ((!pet.on || !allowed) && have) {
    for (const id of ["vidi-pet", "vidi-pet-keys"]) await chrome.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {})
  }
}
// ---- the pet intro on the Pet training page: who the user is, which pet, which AI ----------
// Only known pets, colours, languages and AI names are taken; names are plain short text.
async function petInfo() {
  const pet = await petGet(), mem = await memGet()
  return { installed: true, allowed: await chrome.permissions.contains({ origins: ["<all_urls>"] }), on: pet.on, kind: pet.kind, colour: pet.colour, name: pet.name, lang: pet.lang || "auto", model: pet.model || "", user: mem.user || "", likes: mem.likes || [] }
}
async function petSetup(s = {}) {
  const text = (t, n) => String(t || "").replace(/<[^>]*>/g, "").replace(/[<>{}\u0000-\u001f]/g, "").trim().slice(0, n)
  const patch = { on: true }
  if (["dragon", "wolf", "cat", "fox", "owl"].includes(s.kind)) Object.assign(patch, { kind: s.kind, picture: null, use3d: false })
  if (/^[A-Za-z]{2,12}$/.test(s.colour || "")) patch.colour = s.colour
  if (text(s.name, 20)) patch.name = text(s.name, 20)
  if (s.lang === "auto" || VidiI18n.LANGS[s.lang]) { patch.lang = s.lang; VidiI18n.setLang(s.lang) }
  if (typeof s.model === "string" && /^(|webllm|[\w.:/-]{1,60})$/.test(s.model)) patch.model = s.model
  await petSet(patch)
  const mem = {}
  if (text(s.user, 20)) mem.user = text(s.user, 20)
  if (Array.isArray(s.likes)) mem.likes = s.likes.map((l) => text(l, 40).toLowerCase()).filter(Boolean).slice(0, 10)
  // a cloud model chosen here, after reading the notice: the "is it confidential?" question is answered
  if (/cloud$/.test(patch.model || "")) Object.assign(mem, { notConfidential: true, askedConf: true })
  await memSet(mem)
  const p = await petGet()
  await petSay(tr("introDone", { user: mem.user || "", name: p.name }), { mood: "happy" })
  return petInfo()
}
chrome.permissions.onAdded.addListener(petScript)
chrome.permissions.onRemoved.addListener(petScript)
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.pet && ch.pet.oldValue?.on !== ch.pet.newValue?.on) petScript() })

// ---- web search ----------------------------------------------------------------------
// Two free, open sources that allow this use: Wikipedia and DuckDuckGo's instant
// answers. Each result keeps its link, so the user can check it.
async function webSearch(q) {
  const out = []
  // Wikipedia asks apps to say who they are
  const get = (u) => fetch(u, { signal: AbortSignal.timeout(8000), headers: /wikipedia/.test(u) ? { "Api-User-Agent": "VideoDoc-plugin/1.0 (https://videodoc.netlify.app)" } : {} })
    .then((r) => { if (r.status === 429) out.busy = true; return r.ok ? r.json() : null }).catch(() => null)
  // the subject alone first: "Eiffel Tower height" found only replicas (the word
  // "height" pulled in pages about heights), "Eiffel Tower" finds the tower
  const subject = q.replace(/\b(what|who|when|where|how|which|is|are|was|the|a|an|of|in|on|for|to|does|do|many|much|tall|height|high|long|length|big|size|old|age|population|capital|weight|heavy|born|date|year|price|cost|far|distance|meaning|definition|mean|wrote|write|written|author|invented|inventor|discovered|built|founded|painted|directed|made|created|did)\b/gi, " ").replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim()
  // the words as said, without a leading "the": "the speed of light" found the novel "The Speed of
  // Light", and the subject alone ("speed light") lost the "of"
  const plain = q.replace(/^(the|a|an)\s+/i, "")
  const wsearch = (t) => get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(t)}&srlimit=3&format=json&origin=*`)
  const [ddg, main, all] = await Promise.all([
    get(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&t=videodoc`),
    subject && subject.toLowerCase() !== q.toLowerCase() ? wsearch(subject) : null,
    wsearch(plain),
  ])
  let hits = [...(main?.query?.search || []).slice(0, 1), ...(all?.query?.search || [])]
  // an article named exactly like the subject: its copies and namesakes go
  // ("Eiffel Tower (Paris, Texas)" gave a small model the wrong height)
  const exact = hits.find((h) => [subject.toLowerCase(), plain.toLowerCase()].includes(h.title.toLowerCase()))
  if (exact) hits = [exact, ...hits.filter((h) => !h.title.toLowerCase().includes(subject.toLowerCase()))]
  const wiki = { query: { search: hits.filter((h, i, a) => a.findIndex((x) => x.title === h.title) === i).slice(0, 3) } }
  if (ddg?.Answer) out.push({ title: "DuckDuckGo answer", url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`, text: String(ddg.Answer) })
  if (ddg?.AbstractText) out.push({ title: ddg.Heading || q, url: ddg.AbstractURL, text: ddg.AbstractText })
  for (const s of wiki?.query?.search || []) {
    if (out.some((o) => o.title === s.title)) continue
    // the whole opening section (the short summary is one paragraph: the Eiffel Tower's height was not in it)
    const ex = await get(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(s.title)}&format=json&origin=*`)
    const text = Object.values(ex?.query?.pages || {})[0]?.extract
    if (text) out.push({ title: s.title + " (Wikipedia)", url: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`, text: text.replace(/\s+/g, " ").slice(0, 1500) })
  }
  return Object.assign(out.slice(0, 4), { busy: !!out.busy })
}

// ---- what the user said ----------------------------------------------------------------
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
async function petHear(text, tabId, noGuide) {
  text = String(text || "").trim().slice(0, 2000)
  if (!text) return
  await petEdit((log) => log.push({ id: petId(), who: "me", text, at: Date.now() }))
  const t = toEnglish(text.toLowerCase()) // commands in the other four languages read as English
  const pet = await petGet(), mem = await memGet()
  await memSet({ chats: mem.chats + 1 })
  let m

  // ringing: "stop", "ok", "snooze"
  const { petRing } = await chrome.storage.local.get("petRing")
  if (petRing && /^(stop|ok(ay)?|thanks?|done|got it|snooze|5 more minutes)\b/.test(t)) {
    const last = ((await chrome.storage.local.get("petLog")).petLog || []).filter((x) => x.ring === petRing.id).pop()
    return stopRing(/snooze|more minutes/.test(t) ? last?.snooze : null)
  }
  // names
  if ((m = text.match(/\b(?:your name is|i(?:'ll| will) call you|call yourself|be called)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ-]{0,19})/i))) {
    await petSet({ name: cap(m[1]) })
    return petSay(tr("renamed", { name: cap(m[1]) }), { mood: "happy" })
  }
  if ((m = text.match(/\b(?:my name is|call me)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ-]{0,19})/i))) {
    await memSet({ user: cap(m[1]) })
    return petSay(tr("metYou", { name: cap(m[1]) }), { mood: "happy" })
  }
  if ((m = text.match(/^i (?:really )?(?:like|love)\s+(.{2,40}?)[.!]*$/i))) {
    await memSet({ likes: [...new Set([...(mem.likes || []), m[1].toLowerCase()])].slice(-10) })
    return petSay(tr("liked", { what: m[1] }), { mood: "happy" })
  }
  if (/\b(forget (me|everything|what you know)|delete (my|your) memory)\b/.test(t)) {
    await chrome.storage.local.remove(["petMem"])
    return petSay(tr("forgotMe"))
  }
  // the time and the date (a small model gets these wrong)
  if (/\b(what(?:'s| is) the time|what time is it|time now)\b/.test(t)) return petSay(tr("timeNow", { time: hhmm(new Date()) }))
  if (/\b(what(?:'s| is) (?:the |today'?s )?date|what day is (?:it|today))\b/.test(t)) return petSay(tr("today", { date: new Date().toLocaleDateString(VidiI18n.lang === "hi" ? undefined : VidiI18n.lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }))

  // timers, alarms, reminders
  const kind = /\bremind/.test(t) ? "reminder" : /\b(alarm|wake me)\b/.test(t) ? "alarm" : /\b(timer|countdown)\b/.test(t) ? "timer" : null
  if (/\b(cancel|stop|delete|remove|clear)\b/.test(t) && /\b(timers?|alarms?|reminders?)\b/.test(t)) {
    const which = /timer/.test(t) ? "timer" : /alarm/.test(t) ? "alarm" : "reminder"
    const list = await alarmsGet(), gone = list.filter((a) => a.kind === which)
    for (const a of gone) chrome.alarms.clear("pet:" + a.id)
    await alarmsSet(list.filter((a) => a.kind !== which))
    const kindName = (k, many) => tr({ timer: many ? "kTimers" : "kTimer", alarm: many ? "kAlarms" : "kAlarm", reminder: many ? "kReminders" : "kReminder" }[k])
    return petSay(gone.length ? tr("cancelled", { n: gone.length, kind: kindName(which, gone.length > 1) }) : tr("none", { kind: kindName(which, true) }))
  }
  if (/\b(what|which|show|list|my|any)\b/.test(t) && /\b(timers?|alarms?|reminders?)\b/.test(t) && !parseWhen(t)) {
    const list = (await alarmsGet()).sort((a, b) => a.when - b.when)
    const kindName = (k) => cap(tr({ timer: "kTimer", alarm: "kAlarm", reminder: "kReminder" }[k]))
    return petSay(list.length ? list.map((a) => tr("listItem", { kind: kindName(a.kind), time: hhmm(new Date(a.when)), what: a.text ? `: ${a.text}` : "" })).join("\n") : tr("nothingSet"))
  }
  if (kind) {
    const w = parseWhen(t)
    if (!w) return petSay(tr(kind === "timer" ? "howLong" : kind === "alarm" ? "whenAlarm" : "whenRemind"))
    // what to remind of: the words after "to" / "about", without the time words
    const about = kind === "timer" ? "" : (text.match(/\b(?:to|about|that)\s+(.+)$/i)?.[1] || "")
      .replace(/\b(in|at|for)\s+\d.*$/i, "").replace(/\b(tomorrow|tonight)\b/i, "").trim().replace(/[.!]$/, "")
    const a = await addAlarm(kind, w.when, about)
    const left = say(w.when - Date.now())
    const day = new Date(w.when).toDateString() !== new Date().toDateString() ? tr("tomorrow") : ""
    const time = hhmm(new Date(a.when)), what = about ? tr("to", { what: about }) : ""
    return petSay((kind === "timer" ? tr("timerSet", { left }) : kind === "alarm" ? tr("alarmSet", { time, day }) : w.rel ? tr("remindIn", { what, left, time }) : tr("remindAt", { what, time, day })) + tr("ringNote"), { mood: "happy" })
  }

  // focus mode: hide the ads on this page ("hide the ads", "ads hata do"), and back
  if (tabId != null && /\b(show everything|show (the )?ads( again)?|focus mode off|undo focus|stop focus)\b/i.test(t)) return petFocus(tabId, false)
  if (tabId != null && /\b(focus mode|hide (the |all )?ads|remove (the |all )?ads|block (the )?ads|ads hata|hide distractions)\b/i.test(t)) return petFocus(tabId, true)
  // which AI answers ("change the AI", "which model?", "LLM badlo")
  if (/\b(change|switch|which|choose|pick|select|badlo|badal|better)\b.{0,25}\b(ai|model|llm)\b|\b(ai|model|llm)\b.{0,15}\b(change|badlo|badal|switch)\b/i.test(t)) return petModels()
  // fill the form on this page ("fill this page", "page bhar do")
  if (/\b(fill|complete)\b.{0,40}\b(form|page|fields?|this|it)\b|\bfill (it|this) (in|out)\b|\bbhar ?do\b|\bbhar ?de\b/i.test(t) && tabId != null) return petFill(tabId)
  if (/\b(forget|remove|delete)\b.{0,20}\b(file|document|cv|resume)\b/.test(t)) { await fileSet("doc", null); return petSay(tr("forgotFile")) }
  if (/\b(forget|remove|delete)\b.{0,30}\b(saved )?details\b/.test(t)) { await chrome.storage.local.remove("petProfile"); return petSay(tr("forgotDetails")) }

  // a task on this page ("how do I add a card?", "I want to share this", "ye kaise karu"), or the
  // user's next words while being guided: the AI works out the goal from the chat, asks when it
  // is not sure, and marks one step at a time (it never clicks)
  let { petGuide: guiding } = await chrome.storage.local.get("petGuide")
  // a guide left alone for 10 minutes is over (an old one caught every message, even "hi")
  if (guiding && !(Date.now() - (guiding.at || 0) < 10 * 60000)) { await chrome.storage.local.remove("petGuide"); guiding = null }
  // a search, a VideoDoc question or "explain this page" is never a step of a task: guiding ends
  // (a search for "the capital of Australia" was answered with the board step before)
  const other = /^(please\s+|bitte\s+)?(search|google|look up|suche|such|busca|buscar|cherche|chercher)\b|^(web|internet|google)\s+(pe|par)\b|\b(videodoc|vid chat|doc chat|this plugin)\b|\b(explain|summari[sz]e|translate)\b.{0,20}\b(page|site|article|file|document)\b|^(what|which|who)\b.{0,40}\b(in|from) (my|the|this) (file|document|pdf|cv|resume)\b/i.test(text)
  if (other && guiding) await chrome.storage.local.remove("petGuide")
  // with a manual given, a short question on a page is tried as a task first ("notiz löschen?"); the guide hands
  // anything that is not about the page back to the normal chat
  const shortAsk = /\?\s*$/.test(text) && text.split(/\s+/).length <= 8 && !!(await chrome.storage.local.get("petHasDoc")).petHasDoc
  if (tabId != null && !noGuide && !other && (guiding?.chat || shortAsk || /\b(guide me|walk me through|step by step|how (do|can|should) i|how to|where (is|are|do i|can i)|i (want|need|have) to|i'?m (stuck|lost)|help me|what (do|should) i do|kaise|kahan|kya karu|wie (kann|mache|ändere|finde|lege|erstelle)|wo (ist|finde)|cómo|dónde|comment (faire|je|puis|changer|créer))\b/.test(t))) return petGuide(tabId, text)

  // everything else is for the AI in the VideoDoc tab
  const id = petId()
  await petEdit((log) => log.push({ id, who: "pet", text: "", state: "thinking", at: Date.now() }))
  try {
    let doc = null
    const msg = { id, question: text, scope: "pet", model: pet.model || undefined, pet: { name: pet.name, kind: pet.picture ? "pet" : pet.kind, user: mem.user, likes: mem.likes } }
    // "search the web for", "suche im Web nach", "busca en la web", "cherche sur le web", "web pe search karo"
    const search = text.match(/^(?:please\s+|bitte\s+)?(?:search|google|look up|suche|such|busca|buscar|cherche|chercher)(?:\s+(?:the\s+|im\s+|en la\s+|sur le\s+|on the\s+)?(?:web|internet|online|netz))?(?:\s+(?:for|nach|por|pour))?\s+(.{2,})$/i)
      || text.match(/^(?:web|internet|google)\s+(?:pe|par)\s+(?:search|dhoondo|dhundo)(?:\s+karo)?\s+(.{2,})$/i)
    if (search) {
      await petUpdate(id, { label: tr("searching") })
      msg.results = await webSearch(search[1])
      msg.question = search[1]
      msg.searchFor = search[1]
      if (!msg.results.length) return petUpdate(id, { state: "done", searchFor: search[1], text: msg.results.busy
        ? tr("searchBusy")
        : tr("searchNone") })
    } else if (/\b(videodoc|vid chat|doc chat|record(ing)?|the guide|this plugin|the plugin)\b/.test(t)) {
      msg.scope = "help"
    } else if (/\b(this|the) (page|site|website|article|tab)\b/.test(t) && tabId != null) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({ title: document.title, url: location.href, text: (document.body?.innerText || "").slice(0, 2000000), links: [] }),
      })
      if (!result?.text?.trim()) throw new Error("This page has no text I can read.")
      msg.scope = "page"; msg.page = result; msg.followLinks = false
    } else if (/\b(file|document|doc|pdf|cv|resume|résumé|lebenslauf)\b|\bin it\b/.test(t) && (doc = await fileGet("doc"))) {
      // a question about the file the user gave
      msg.scope = "doc"; msg.doc = { name: doc.name, size: doc.size, data: doc.data }
    } else {
      // the last few messages, so "and tomorrow?" makes sense
      const log = (await chrome.storage.local.get("petLog")).petLog || []
      // (guiding and errors are left out: the small browser AI copied the guide's question into every answer)
      const skip = (x, k) => x.scope === "guide" || x.state === "error" || (x.who === "me" && log[k + 1]?.scope === "guide")
      msg.history = log.filter((x, k) => x.text && x.id !== id && !skip(x, k)).slice(-7, -1).map((x) => ({ who: x.who === "me" ? "User" : pet.name, text: x.text.slice(0, 300) }))
    }
    // "what can you do?", "tutorial": the answer comes with the Pet training button
    const trainingLink = /\b(what can you do|what do you do|tutorial|training|teach me|how (do i|to) use you|help me use)\b/.test(t) || undefined
    await petUpdate(id, { scope: msg.scope, searchFor: msg.searchFor, trainingLink })
    await send(await ensureEngine(), { type: "chat", ...msg })
  } catch (e) {
    await petUpdate(id, { state: "error", text: e.message })
  }
}

// answers from the engine tab (called by bg.js for ids that start with "pet-")
function petFromEngine(m) {
  if (m.type === "chat-status") return petUpdate(m.id, { label: m.label })
  // (a guide's markers are for the plugin, not for the user to read)
  if (m.type === "chat-partial") return petUpdate(m.id, { state: "typing", text: /^\W*OFF TOPIC/i.test(m.text) ? "" : m.text.replace(/^\W*ASK:\s*/i, "") })
  // the file's answers for a form: the list for the user to check (or to type, when the file was unreadable)
  if (m.type === "chat-answer" && (m.fills || m.error)) {
    return chrome.storage.local.get("petLog").then(({ petLog }) => {
      const plan = (petLog || []).find((x) => x.id === m.id)?.fillPlan
      if (plan && !(petLog.find((x) => x.id === m.id).fillForm)) return fillReady(m.id, plan, m.fills || [])
      if (m.fills) return
      return petUpdate(m.id, { state: "error", text: m.error })
    })
  }
  if (m.type === "chat-answer") return petEdit((log) => {
    const i = log.findIndex((x) => x.id === m.id); if (i < 0) return
    const x = log[i]
    // a guide's "not about this page": the normal chat answers it next (guideAnswered); the code word is never shown
    if (x.scope === "guide" && !m.error && /^\W*OFF TOPIC/i.test(String(m.answer || ""))) return
    log[i] = { ...x, state: m.error ? "error" : "done", text: m.error || String(m.answer || "").trim() || tr("noAnswer"), sources: (m.sources || []).filter((s) => s.url).slice(0, 4), model: m.model, label: "", offerSearch: !m.error && !x.searchFor && x.scope !== "help" }
    // now and then, a fun check that Vidi helped (it learns what works for you):
    // after every 5th AI answer, one question open at a time
    const answers = log.filter((y) => y.who === "pet" && y.state === "done" && y.model).length
    if (!m.error && answers % 5 === 0 && !log.some((y) => y.askFeedback)) log[i].askFeedback = true
  }).then(async () => {
    await guideAnswered(m)
    // once, after the first answer: is it confidential work? (then the AI can be chosen to fit)
    if (m.error || (await memGet()).askedConf) return
    await memSet({ askedConf: true })
    await petSay(tr("confFirst"), { confQuestion: "" })
  })
}

// ---- "Show me on the page" from the pet --------------------------------------------------
// The same marking as in the panel (bg.js: pageElements, showPicks): numbered
// tags beside the buttons the answer is about, then a screenshot in the pet's chat.
async function petShowMe(id, tabId) {
  const log = (await chrome.storage.local.get("petLog")).petLog || []
  const i = log.findIndex((x) => x.id === id), entry = log[i]
  if (!entry || entry.state !== "done") throw new Error(tr("noShow"))
  const question = log.slice(0, i).reverse().find((x) => x.who === "me")?.text || ""
  await petUpdate(id, { showing: tr("lookingPage"), shot: null, shotNote: "" })
  const tab = await chrome.tabs.get(tabId)
  const elements = await pageElements(tabId).catch(() => null)
  if (!elements?.length) return petUpdate(id, { showing: "", shotNote: tr("noMarks") })
  // a guide step without its "📍 where you are." part (the page title in it marked the page's heading too)
  const answer = entry.text.replace(/^📍[^.!?]*[.!?]\s*/u, "")
  showing.set(id, { tabId, windowId: tab.windowId, elements, pet: true, answer, question })
  await send(await ensureEngine(), { type: "chat", id: "pick-" + id, scope: "pick", question, answer, elements })
}
// Guiding: the chat so far, the manual (the newest file) and the page as it is now go to the
// AI. It works out the goal itself, asks ONE question when it is not sure, and gives one step
// at a time; "Done, next step" is just the user saying so. Not about this page: normal chat.
async function petGuide(tabId, said, did) {
  const old = (await chrome.storage.local.get("petGuide")).petGuide || {}
  const chat = [...(old.chat || []), { who: "User", text: said, did }].slice(-12)
  const id = petId()
  // (the list so far is kept: a question in the middle of the same task goes on from there)
  await chrome.storage.local.set({ petGuide: { chat, tabId, id, at: Date.now(), prevPlan: old.plan || null, prevIdx: old.idx || 0 } })
  await petEdit((log) => log.push({ id, who: "pet", text: "", state: "thinking", at: Date.now(), scope: "guide" }))
  try {
    const doc = await fileGet("doc"), elements = await pageElements(tabId).catch(() => [])
    const [{ result: page }] = await chrome.scripting.executeScript({ target: { tabId }, func: () => ({ title: document.title, url: location.href, text: (document.body?.innerText || "").slice(0, 3000) }) })
    await send(await ensureEngine(), { type: "chat", id, scope: "guide", model: (await petGet()).model || undefined, chat, page, elements: elements || [], doc: doc && { name: doc.name, size: doc.size, data: doc.data } })
  } catch (e) { await petUpdate(id, { state: "error", text: e.message }) }
}
// the AI's reply: a question, a step (marked on the page with a picture, like "Show me"),
// the end, or "not about this page" (then the normal chat answers instead)
async function guideAnswered(m) {
  const g = (await chrome.storage.local.get("petGuide")).petGuide
  if (!g || g.id !== m.id || m.error) return
  const said = String(m.answer || "")
  if (/^\W*OFF TOPIC/i.test(said)) {
    await chrome.storage.local.remove("petGuide")
    const question = g.chat.at(-1).text
    await petEdit((log) => { const i = log.findIndex((x) => x.id === m.id); if (i > 0) log.splice(i - 1, 2) })
    return petHear(question, g.tabId, true)
  }
  if (/\bALL DONE\b/.test(said)) {
    await chrome.storage.local.remove("petGuide")
    return petUpdate(m.id, { text: said.replace(/\bALL DONE\b[:.!]?\s*/, "").trim() || tr("guideFinished") })
  }
  const ask = said.match(/^\W*ASK:\s*([\s\S]+)/i)
  let plan = !ask && m.plan?.length ? m.plan : null
  // the same task again ("I typed the title but there is no save button"): not from step 1, but from
  // where the user is, at the step their words point to (else the next one)
  let idx = 0
  const w = (s) => new Set(String(s).toLowerCase().match(/[a-zà-ÿ]{4,}/g) || [])
  // a step said again in other words counts ("Click + Add note under your notes" for "Click '+ Add note'"):
  // exact text only sent a reworded plan back to step 1 (seen on a real run)
  // (words every step has do not count: "Click Save note" is not "Click + Add note")
  const GEN = /^(click|press|type|enter|select|choose|open|field|button|into|then|your|page|the|and|for|with|from|under|this|that)$/
  const keyw = (s) => new Set((String(s).toLowerCase().match(/[a-zà-ÿ]{3,}/g) || []).map((k) => k.replace(/s$/, "")).filter((k) => !GEN.test(k)))
  const like = (a, b) => { const x = keyw(a), y = keyw(b), n = [...x].filter((k) => y.has(k)).length; return n > 0 && n >= Math.min(x.size, y.size) * 0.6 && n >= Math.max(x.size, y.size) * 0.5 }
  // a new plan of only steps the user already did ("Click + Add note" again, seen on a real run):
  // the old plan goes on at its next step
  const done = g.prevPlan?.slice(0, g.prevIdx + 1) || []
  if (plan && g.prevPlan && g.prevIdx + 1 < g.prevPlan.length && plan.every((s) => done.some((p) => like(p, s)))) { plan = g.prevPlan; idx = g.prevIdx + 1 }
  const sameTask = idx === 0 && plan && g.prevPlan && plan.filter((s) => g.prevPlan.some((p) => like(p, s))).length >= Math.ceil(plan.length / 2)
  if (sameTask) {
    const want = w(g.chat.filter((c) => c.who === "User" && !c.did).at(-1)?.text)
    // the step shown was done ("I typed the title but..."): look from the next one on
    // (found in the new plan by its words: the new plan can be longer or shorter)
    const at = plan.findIndex((s) => like(s, g.prevPlan[g.prevIdx] || ""))
    const from = (at >= 0 ? at : g.prevIdx) + 1
    idx = Math.min(from, plan.length - 1)
    let best = 0
    for (let k = from; k < plan.length; k++) { const n = [...w(plan[k])].filter((x) => want.has(x)).length; if (n > best) { best = n; idx = k } }
  }
  await chrome.storage.local.set({ petGuide: { ...g, at: Date.now(), plan, idx, chat: [...g.chat, { who: "Guide", text: (ask ? ask[1] : plan ? plan.map((s, i) => `${i + 1}. ${s}`).join(" ") : said).slice(0, 600) }] } })
  if (ask) return petUpdate(m.id, { text: ask[1].trim() })
  const text = !plan ? said : idx > 0 ? `${tr("guideStepN", { n: idx + 1, total: plan.length })} ${plan[idx]}` : plan.length > 1 ? said.replace(plan[0], `${tr("guideStepN", { n: 1, total: plan.length })} ${plan[0]}`) : said
  await petUpdate(m.id, { guideStep: true, text })
  await petShowMe(m.id, g.tabId).catch((e) => petUpdate(m.id, { showing: "", shotNote: e.message }))
}
// "Done, next step": the next step of the list, with no AI (instant, and always in order);
// after the last one the task is done
async function guideNext(tabId) {
  const g = (await chrome.storage.local.get("petGuide")).petGuide
  if (!g?.plan) return g?.chat ? petGuide(tabId, tr("guideDid"), true) : petSay(tr("guideStopped"))
  const idx = g.idx + 1
  if (idx >= g.plan.length) { await chrome.storage.local.remove("petGuide"); return petSay(tr("guideFinished"), { mood: "happy" }) }
  await chrome.storage.local.set({ petGuide: { ...g, at: Date.now(), idx, chat: [...g.chat, { who: "User", text: tr("guideDid"), did: true }].slice(-12) } })
  const id = petId()
  await petEdit((log) => log.push({ id, who: "pet", text: `${tr("guideStepN", { n: idx + 1, total: g.plan.length })} ${g.plan[idx]}`, state: "done", at: Date.now(), scope: "guide", guideStep: true }))
  await petShowMe(id, tabId ?? g.tabId).catch((e) => petUpdate(id, { showing: "", shotNote: e.message }))
}
// "which one?": the user tapped one of the buttons that are on the page many times; only that one is marked
async function pickOne(id, idx) {
  const s = lastShown.get(id)
  if (!s || !Number.isInteger(idx) || !s.elements[idx]) throw new Error(tr("noShow"))
  await petUpdate(id, { choose: null, showing: tr("lookingPage"), shot: null, shotNote: "" })
  showing.set(id, s)
  await showPicks(id, { picks: [idx], one: true })
}
// the picture of the marked page: only the two newest are kept (storage is small)
function petShot(id, shot, note) {
  return petEdit((log) => {
    let kept = 0
    for (let k = log.length - 1; k >= 0; k--) if (log[k].shot && ++kept >= 2) delete log[k].shot
    const e = log.find((x) => x.id === id)
    if (e) Object.assign(e, { showing: "", shot, shotNote: note })
  })
}

// ---- files the user gives the pet (PDF, Word, HTML, text) ---------------------------------
// Kept in the plugin's own storage on this computer; read by the VideoDoc tab
// like Doc Chat does. The newest file is "the file" (a CV for forms, too).
const idb = () => new Promise((res, rej) => { const r = indexedDB.open("vidi-pet", 1); r.onupgradeneeded = () => r.result.createObjectStore("files"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
async function fileSet(key, value) {
  const db = await idb(); await new Promise((res, rej) => { const tx = db.transaction("files", "readwrite"); value == null ? tx.objectStore("files").delete(key) : tx.objectStore("files").put(value, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
  if (key === "doc") await chrome.storage.local.set({ petHasDoc: value != null }) // the pet's suggestions offer guiding with it
}
async function fileGet(key) { const db = await idb(); return new Promise((res) => { const g = db.transaction("files").objectStore("files").get(key); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null) }) }

async function petFile(m) {
  if (!/\.(pdf|docx|html?|txt|md|csv|json)$/i.test(m.name || "")) return petSay(tr("fileTypes"))
  if ((m.size || 0) > 15e6) return petSay(tr("fileBig"))
  await fileSet("doc", { name: m.name, size: m.size, type: m.mime || "", data: m.data, at: Date.now() })
  await petEdit((log) => log.push({ id: petId(), who: "me", text: `📎 ${m.name}`, at: Date.now() }))
  return petSay(tr("gotFile", { file: m.name }), { mood: "happy" })
}

// ---- "fill this page": a form from the file, from what the user told before, and from the user ----
// Never passwords, PINs, card numbers or codes: those fields are not even read.
// Nothing is typed before the user pressed "Fill the page"; Submit is never pressed.
const NEVER = /pass(word|wort)?|kennwort|\bpin\b|cvv|cvc|card.?(num|no)|kreditkarte|credit|debit|expir|security.?code|one.?time|\botp\b|\btan\b|captcha|verification.?code/i
const CANON = [["email", /e-?mail/], ["phone", /phone|mobile|telefon|handy|\btel\b/], ["first name", /first.?name|vorname|given.?name/], ["last name", /last.?name|surname|family.?name|nachname/],
  ["full name", /full.?name|^\W*name\W*$|your name/], ["birthday", /birth|geburt|\bdob\b/], ["street", /street|address.?line|straße|strasse|adresse|^\W*address\W*$/], ["postcode", /zip|postal|post.?code|\bplz\b/],
  ["city", /city|town|\bort\b|stadt/], ["country", /country|\bland\b/], ["iban", /iban/], ["bic", /\bbic\b|swift/], ["account number", /account.?(number|no)|kontonummer/],
  ["company", /company|employer|firma/], ["job title", /job.?title|position|current.?(title|role)/], ["linkedin", /linkedin/], ["website", /website|portfolio|homepage/]]
const canon = (label, type) => {
  const l = String(label || "").toLowerCase()
  if (type === "email") return "email"
  if (type === "tel") return "phone"
  for (const [k, re] of CANON) if (re.test(l)) return k
  return l.replace(/[^a-z0-9äöüß ]+/g, " ").replace(/\b(your|please|enter|the|optional|required)\b/g, " ").replace(/\s+/g, " ").trim()
}
const CV_FIELD = /\bcv\b|resume|résumé|lebenslauf|curriculum/i

async function petFill(tabId) {
  const id = petId()
  await petEdit((log) => log.push({ id, who: "pet", text: "", state: "thinking", label: tr("readingForm"), at: Date.now() }))
  const [{ result: fields }] = await chrome.scripting.executeScript({
    target: { tabId }, args: [NEVER.source],
    func: (never) => {
      const NEVER = new RegExp(never, "i"), out = []
      document.querySelectorAll("[data-vidi-fill]").forEach((e) => e.removeAttribute("data-vidi-fill"))
      for (const e of document.querySelectorAll("input,select,textarea")) {
        const type = (e.type || e.tagName).toLowerCase()
        if (/^(hidden|submit|button|reset|image|password|checkbox|radio|range|color)$/.test(type) || e.disabled || e.readOnly) continue
        const r = e.getBoundingClientRect(), st = getComputedStyle(e)
        if (type !== "file" && (r.width < 2 || r.height < 2 || st.visibility === "hidden" || st.display === "none")) continue
        const label = (e.labels?.[0]?.innerText || e.getAttribute("aria-label") || e.placeholder || e.closest("label")?.innerText || e.name || e.id || "").replace(/\s+/g, " ").replace(/\*/g, "").trim().slice(0, 80)
        const auto = e.getAttribute("autocomplete") || ""
        if (NEVER.test(`${label} ${e.name} ${e.id} ${auto}`) || /^cc-/.test(auto)) continue
        // a search box is not a form to fill (a help page's "Search boards" was counted as one)
        if (type === "search" || e.closest("[role=search],form[role=search]") || /^\W*(search|suche|buscar|rechercher|find)\b/i.test(label)) continue
        if (type !== "file" && e.value && e.tagName !== "SELECT") continue // already filled by the user: left alone
        e.setAttribute("data-vidi-fill", String(out.length))
        out.push({ i: out.length, label, type: e.tagName === "SELECT" ? "select" : type, options: e.tagName === "SELECT" ? [...e.options].map((o) => o.text.trim()).filter(Boolean) : undefined })
      }
      return out
    },
  }).catch(() => [{ result: null }])
  if (!fields?.length) return petUpdate(id, { state: "done", label: "", text: tr("noFields") })
  const profile = (await chrome.storage.local.get("petProfile")).petProfile || {}
  const values = {}, from = {}
  for (const f of fields) { const v = profile[canon(f.label, f.type)]; if (v && f.type !== "file") { values[f.i] = v; from[f.i] = "remembered" } }
  const doc = await fileGet("doc")
  const fileField = doc && fields.find((f) => f.type === "file" && CV_FIELD.test(f.label))
  const plan = { tabId, fields: fields.filter((f) => f.type !== "file"), values, from, file: fileField ? { i: fileField.i, label: fileField.label, name: doc.name } : null, docName: doc?.name || "" }
  const open = plan.fields.filter((f) => values[f.i] == null)
  if (doc && open.length) {
    // the file answers what it can (the VideoDoc tab reads it, the AI matches the fields)
    await petUpdate(id, { label: `Reading ${doc.name}...`, fillPlan: plan })
    return send(await ensureEngine(), { type: "chat", id, scope: "fill", model: (await petGet()).model || undefined, doc: { name: doc.name, size: doc.size, data: doc.data }, fields: open })
  }
  return fillReady(id, plan)
}

// the list the user checks: what is known is filled in, the rest is empty to type
function fillReady(id, plan, fills = []) {
  for (const f of fills) if (plan.values[f.i] == null) { plan.values[f.i] = f.value; plan.from[f.i] = "file" }
  const known = plan.fields.filter((f) => plan.values[f.i] != null).length, total = plan.fields.length
  const src = plan.docName ? tr("fillFrom", { file: plan.docName, last: Object.values(plan.from).includes("remembered") ? tr("fillLast") : "" }) : tr("fillOnlyLast")
  const text = tr("fillList", { total, known: known ? tr("fillKnown", { n: known, src }) : tr("fillNone"), rest: known < total ? tr("fillRest") : "", file: plan.file ? tr("fillAttach", { file: plan.file.name, label: plan.file.label }) : "" })
  return petUpdate(id, { state: "done", label: "", text, fillPlan: plan, fillForm: true })
}

async function fillGo(id, values, remember) {
  const log = (await chrome.storage.local.get("petLog")).petLog || []
  const plan = log.find((x) => x.id === id)?.fillPlan
  if (!plan) return petSay(tr("fillGone"))
  const fills = plan.fields.map((f) => ({ i: f.i, value: String(values?.[f.i] ?? "").trim().slice(0, 2000) })).filter((f) => f.value && !NEVER.test(plan.fields.find((x) => x.i === f.i).label))
  let file = null
  if (plan.file) { const doc = await fileGet("doc"); if (doc) file = { i: plan.file.i, name: doc.name, type: doc.type, data: doc.data } }
  // the pet on the page walks from field to field and fills each one (pet.js);
  // without a pet there (hidden on this site), the fields are filled directly
  const walked = await chrome.tabs.sendMessage(plan.tabId, { to: "pet-page", type: "fill", fills, file }).catch(() => null)
  const [{ result: n }] = walked?.done ? [{ result: walked.n }] : await chrome.scripting.executeScript({
    target: { tabId: plan.tabId }, args: [fills, file],
    func: (fills, file) => {
      // the page's own code must notice the new value (React and others listen to input events)
      const set = (e, v) => {
        const proto = e.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : e.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, "value").set.call(e, v)
        e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true }))
      }
      const mark = (e) => { e.style.outline = "2px solid #22c55e"; e.style.outlineOffset = "2px" }
      let n = 0
      for (const f of fills) {
        const e = document.querySelector(`[data-vidi-fill="${f.i}"]`)
        if (!e) continue
        if (e.tagName === "SELECT") {
          const o = [...e.options].find((x) => x.text.trim().toLowerCase() === f.value.toLowerCase())
          if (!o) continue
          set(e, o.value)
        } else set(e, f.value)
        mark(e); n++
      }
      if (file) {
        const e = document.querySelector(`[data-vidi-fill="${file.i}"]`)
        if (e) {
          const dt = new DataTransfer()
          dt.items.add(new File([Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0))], file.name, { type: file.type }))
          e.files = dt.files; e.dispatchEvent(new Event("change", { bubbles: true })); mark(e); n++
        }
      }
      return n
    },
  }).catch(() => [{ result: 0 }])
  if (remember) {
    const profile = (await chrome.storage.local.get("petProfile")).petProfile || {}
    for (const f of fills) { const fl = plan.fields.find((x) => x.i === f.i); if (fl && !NEVER.test(fl.label)) profile[canon(fl.label, fl.type)] = f.value }
    await chrome.storage.local.set({ petProfile: profile })
  }
  await petUpdate(id, { fillForm: false, fillDone: true })
  return petSay(n ? tr("filled", { n }) + (remember ? tr("filledRem") : "") : tr("fillFailed"), { mood: n ? "happy" : "sad" })
}

// ---- focus mode: the ads on this page are hidden (only when asked, only this page) ----
// It only hides them: they still load. Undone by "show everything" or a reload.
const AD_SELECTORS = ['ins.adsbygoogle', 'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]', 'iframe[id^="google_ads"]', '[id^="div-gpt-ad"]', '[id*="google_ads"]',
  '[data-ad-slot]', '[data-adunit]', '[data-ad]', '[aria-label="Advertisement" i]', '[aria-label="Anzeige" i]', 'amp-ad', 'amp-embed', '[id^="taboola"]', '[class*="taboola" i]',
  '[id*="outbrain" i]', '[class*="outbrain" i]', '[class~="advertisement"]', '[class~="ad-slot"]', '[class~="adslot"]', '[class~="ad-container"]', '[class~="ad-banner"]']
async function petFocus(tabId, on) {
  const [{ result: n }] = await chrome.scripting.executeScript({
    target: { tabId }, args: [AD_SELECTORS, on],
    func: (sel, on) => {
      document.getElementById("vidi-focus")?.remove()
      if (!on) return -1
      const hide = sel.join(",")
      // the pet itself is never hidden
      const n = [...document.querySelectorAll(hide)].filter((e) => e.tagName !== "VIDI-PET").length
      const st = document.createElement("style"); st.id = "vidi-focus"; st.textContent = `${hide} { display: none !important; }`
      document.documentElement.append(st)
      return n
    },
  }).catch(() => [{ result: null }])
  if (n == null) return petSay(tr("cannotPage"))
  if (n === -1) return petSay(tr("focusOff"))
  return petSay(n ? tr("focusOn", { n }) : tr("focusNone"), { mood: n ? "happy" : "idle" })
}

// ---- which AI answers: the user chooses in the chat ("change the AI") ----
// A cloud model only after the user said the work is not confidential.
async function ollamaModels() {
  try { return (await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) }).then((r) => r.json())).models || [] } catch { return [] }
}
const isCloudModel = (n) => /cloud$/.test(n || "")
const bestLocal = (ms) => ms.find((m) => /^gemma3:12b$/.test(m.name)) || ms.find((m) => /^gemma3:4b/.test(m.name)) || ms[0]
const freeCloud = (ms) => ms.find((m) => /^gemma4:31b-cloud$/.test(m.name)) || ms.find((m) => isCloudModel(m.name))
// how often it was right in our tests (pet/scores.js); a model not listed was not tested
const score = (n) => VidiScore(n) != null ? ` · ✓ ${VidiScore(n)}%` : ""
async function petModels() {
  const models = await ollamaModels(), pet = await petGet(), mem = await memGet()
  const local = models.filter((m) => !isCloudModel(m.name)), cloud = models.filter((m) => isCloudModel(m.name))
  const choices = [{ name: "", label: tr("auto") },
    ...local.map((m) => ({ name: m.name, label: `${m.name}${m.details?.parameter_size ? ` · ${m.details.parameter_size}` : ""}${score(m.name)}` })),
    ...cloud.map((m) => ({ name: m.name, label: `☁ ${m.name} (cloud)${score(m.name)}` })),
    { name: "webllm", label: tr("browserAI") }]
  const now = !pet.model ? tr("autoNow") : pet.model === "webllm" ? tr("browserAINow") : `${isCloudModel(pet.model) ? "☁ " : ""}${pet.model}`
  const rec = mem.notConfidential && freeCloud(cloud) ? tr("recCloud", { model: freeCloud(cloud).name })
    : bestLocal(local) ? `For private things I recommend ${bestLocal(local).name}${/12b/.test(bestLocal(local).name) ? " (better answers, a bit slower)" : " (quick)"}.` : ""
  return petSay(tr("modelsNow", { now, rec }), { modelChoices: choices })
}
async function petPickModel(name) {
  if (isCloudModel(name) && (await memGet()).notConfidential !== true) {
    return petSay(tr("confAsk", { model: name }), { confQuestion: name })
  }
  await petSet({ model: name })
  return petSay(!name ? tr("switchedAuto") : tr("switched", { model: name === "webllm" ? tr("browserAINow") : `${isCloudModel(name) ? "☁ " : ""}${name}` }) + (isCloudModel(name) ? tr("switchedCloud") : ""), { mood: "happy" })
}
async function petConfidential(answer, model) {
  await memSet({ notConfidential: answer === "no", askedConf: true })
  const models = await ollamaModels()
  if (answer === "no") {
    if (model) return petPickModel(model)
    const rec = freeCloud(models)
    return petSay(rec ? tr("confThanks", { model: rec.name })
      : "Thanks! A cloud AI could help even more: in a terminal run “ollama signin” and “ollama pull gemma4:31b-cloud”, then say “change the AI”.",
    rec ? { modelChoices: [{ name: rec.name, label: tr("useCloud", { model: rec.name }) }, { name: (await petGet()).model || "", label: tr("stayAsIs") }] } : {})
  }
  if (isCloudModel((await petGet()).model)) await petSet({ model: "" })
  const best = bestLocal(models.filter((m) => !isCloudModel(m.name)))
  return petSay(tr("stayLocal", { tip: best && /12b/.test(best.name) ? tr("tipBetter", { model: best.name }) : "" }))
}

// ---- a new chat: the old one is kept under "Earlier chats" (the 15 newest, without
// pictures); what the pet knows about the user stays for every chat ----
async function archive() {
  const { petLog = [], petChats = [] } = await chrome.storage.local.get(["petLog", "petChats"])
  const first = petLog.find((x) => x.who === "me")
  if (!first) return petChats
  const log = petLog.map(({ shot, fillPlan, ...x }) => x) // pictures and form lists are not kept
  return [{ id: petId(), title: first.text.slice(0, 60), at: petLog.at(-1)?.at || Date.now(), log }, ...petChats].slice(0, 15)
}
const newChat = () => petLock = petLock.then(async () => chrome.storage.local.set({ petChats: await archive(), petLog: [] }).then(() => chrome.storage.local.remove("petGuide"))).catch(() => {})
const openChat = (id) => petLock = petLock.then(async () => {
  const chats = await archive()
  const pick = chats.find((c) => c.id === id)
  if (!pick) return
  await chrome.storage.local.set({ petChats: chats.filter((c) => c.id !== id), petLog: pick.log })
}).catch(() => {})

// ---- messages from the pet on a page, and from the panel's pet settings ---------------
chrome.runtime.onMessage.addListener((m, from, reply) => {
  if (m?.to !== "pet") return
  const done = (p) => Promise.resolve(p).then((r) => reply({ ok: true, ...(r || {}) }), (e) => reply({ ok: false, error: e.message }))
  if (m.type === "say") done(petHear(m.text, from.tab?.id))
  else if (m.type === "open-training") done(site().then((u) => chrome.tabs.create({ url: u + "/#/pet-training" })))
  else if (m.type === "file") done(petFile(m))
  else if (m.type === "fill-go") done(fillGo(m.id, m.values, m.remember))
  else if (m.type === "fill-cancel") done(petUpdate(m.id, { fillForm: false }).then(() => petSay(tr("fillCancelled"))))
  else if (m.type === "show-me") done(petShowMe(m.id, from.tab?.id).catch((e) => petUpdate(m.id, { showing: "", shotNote: e.message })))
  else if (m.type === "guide-next") done(petUpdate(m.id, { guideStep: false }).then(() => guideNext(from.tab?.id)))
  else if (m.type === "guide-stop") done(petUpdate(m.id, { guideStep: false }).then(() => chrome.storage.local.remove("petGuide")).then(() => petSay(tr("guideStopped"))))
  else if (m.type === "pick-one") done(pickOne(m.id, m.idx).catch((e) => petUpdate(m.id, { showing: "", shotNote: e.message })))
  else if (m.type === "search-more") done(chrome.search.query({ text: m.text, disposition: "NEW_TAB" }))
  else if (m.type === "stop-ring") done(stopRing(m.snooze))
  else if (m.type === "feedback") done(petUpdate(m.id, { askFeedback: false }).then(memGet).then((mm) => memSet(m.good ? { good: mm.good + 1 } : { bad: mm.bad + 1 })).then(() => petSay(m.good ? tr("yay") : tr("oops"), { mood: m.good ? "happy" : "sad" })))
  else if (m.type === "hide-site") done(petGet().then((p) => petSet({ hiddenSites: [...new Set([...(p.hiddenSites || []), m.host])] })))
  else if (m.type === "clear" || m.type === "new-chat") done(newChat())
  else if (m.type === "open-chat") done(openChat(m.id))
  else if (m.type === "model") done(petUpdate(m.id, { modelChoices: null }).then(() => petPickModel(m.name || "")))
  else if (m.type === "confidential") done(petUpdate(m.id, { confQuestion: undefined, confAnswered: true }).then(() => petConfidential(m.answer, m.model)))
  else if (m.type === "open-panel") done(chrome.sidePanel.open({ tabId: from.tab.id }).catch(() => chrome.windows.create({ url: "panel.html?popup=1&tab=pet", type: "popup", width: 400, height: 640 })))
  else if (m.type === "refresh") done(petScript())
  else return
  return true
})
