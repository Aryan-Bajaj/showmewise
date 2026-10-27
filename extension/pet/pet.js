// Vidi the pet (BETA), on the page. A small animal at the edge of the window
// that keeps the user company and answers. It sits in its own closed box (the
// page's styles cannot change it, its styles cannot change the page), looks
// for a spot where it covers no button, field, picture or text, and slides
// half out of sight when nobody needs it. Click it to chat, drag it to move it.
;(async () => {
  if (window.top !== window || window.__vidiPet) return
  window.__vidiPet = true
  const saved = await chrome.storage.local.get(["pet", "petLog", "petRing", "petTestOpen", "petHasDoc"]).catch(() => ({}))
  const SIZE = 64, GAP = 10
  let frame = null, broken3d = false, walking = false, history = false
  let pet = null, log = [], ring = null, open = false, lastActive = Date.now(), moodUntil = 0, moodNow = "idle", hoverAt = Date.now()

  const host = document.createElement("vidi-pet")
  host.style.cssText = "all:initial;position:fixed;inset:0 auto auto 0;width:0;height:0;z-index:2147483647" // the top layer, like cookie banners (it covered the pet on BBC)
  // closed: the page cannot read the chat (only the plugin's own tests open it)
  const root = host.attachShadow({ mode: saved.petTestOpen ? "open" : "closed" })
  root.innerHTML = `<style>${window.VidiPetCSS || ""}
    .wrap { position: fixed; width: ${SIZE}px; height: ${SIZE}px; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none;
      transition: top .5s cubic-bezier(.3,.7,.3,1), left .35s ease, transform .45s ease, opacity .3s; }
    .wrap.drag { transition: none; cursor: grabbing; }
    .wrap.peek.right { transform: translateX(${SIZE * 0.55}px) rotate(-8deg); } .wrap.peek.left { transform: translateX(-${SIZE * 0.55}px) rotate(8deg); }
    .wrap.peek:hover, .wrap.open { transform: none; }
    /* no free spot anywhere on the edge: it hides behind the edge, a small piece shows */
    .wrap.crowded.right:not(:hover):not(.open) { transform: translateX(${SIZE - 10}px); } .wrap.crowded.left:not(:hover):not(.open) { transform: translateX(-${SIZE - 10}px); }
    /* a short speech bubble beside the pet (a robot check on the page) */
    .say { position: absolute; bottom: calc(100% + 10px); width: 230px; padding: 9px 12px; border-radius: 14px; background: #17142b; color: #ece9ff; border: 1px solid rgba(167,139,250,.5);
      font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.3); cursor: pointer; animation: pop .25s cubic-bezier(.3,.7,.4,1.3); }
    .say[hidden] { display: none; }
    .wrap.right .say { right: 0; } .wrap.left .say { left: 0; }
    .tag { position: absolute; top: 50%; transform: translateY(-50%); font: 600 11px/1 system-ui, sans-serif; color: #fff; background: rgba(23,20,43,.85); padding: 3px 7px; border-radius: 99px; white-space: nowrap; opacity: 0; transition: opacity .2s; pointer-events: none; }
    .wrap.right .tag { right: calc(100% + 4px); } .wrap.left .tag { left: calc(100% + 4px); } /* beside it, on the page side: never on the button below */
    .wrap:hover .tag { opacity: 1; }
    .wrap.right .fx { right: auto; left: -18%; } .wrap.right .vp { --zx: -12px; } /* the zzz float towards the page, not off the screen */
    .wrap:focus-visible { outline: 2px solid #a78bfa; outline-offset: 4px; border-radius: 12px; }
    .bubble { position: fixed; width: min(330px, calc(100vw - 24px)); height: min(460px, calc(100vh - 24px)); display: none; flex-direction: column;
      background: #17142b; color: #ece9ff; border: 1px solid rgba(167,139,250,.35); border-radius: 16px; box-shadow: 0 18px 50px rgba(0,0,0,.35);
      font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow: hidden; text-align: left;
      resize: both; min-width: 260px; min-height: 300px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); }
    .bubble.show { display: flex; animation: pop .22s cubic-bezier(.3,.7,.4,1.3); }
    @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(.96); } }
    header { display: flex; align-items: center; gap: 6px; padding: 10px 10px 10px 14px; border-bottom: 1px solid rgba(167,139,250,.2); }
    header b { flex: 1; font-size: 15px; } header small { color: #a99fd6; font-weight: 400; font-size: 11px; margin-left: 4px; }
    .ic { all: unset; cursor: pointer; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; color: #cfc8ff; font-size: 15px; }
    .ic:hover, .ic:focus-visible { background: rgba(167,139,250,.18); }
    .log { flex: 1; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; overscroll-behavior: contain; }
    .m { max-width: 88%; padding: 8px 11px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .me { align-self: flex-end; background: #3b2f7a; border-radius: 14px 14px 4px 14px; }
    .pt { align-self: flex-start; background: #241f42; border-radius: 14px 14px 14px 4px; }
    .pt.err { background: #3d1f2e; }
    .wait { color: #a99fd6; font-style: italic; }
    .cloud { margin-top: 5px; font-size: 11px; color: #fcd34d; }
    .pbar { margin-top: 8px; height: 8px; border-radius: 9px; background: rgba(255,255,255,.12); overflow: hidden; }
    .pbar i { display: block; height: 100%; border-radius: 9px; background: linear-gradient(90deg,#7c5cff,#22d3ee); transition: width .4s; }
    .shot { display: block; width: 100%; margin-top: 8px; border-radius: 8px; border: 1px solid rgba(167,139,250,.35); cursor: zoom-in; }
    .shot.big { position: fixed; inset: 5vh 5vw; width: 90vw; height: 90vh; object-fit: contain; background: #0f0d1f; z-index: 2; cursor: zoom-out; }
    .note { margin-top: 6px; font-size: 12px; color: #c9c2ee; }
    .fill { margin-top: 8px; display: flex; flex-direction: column; gap: 7px; max-height: 240px; overflow: auto; padding-right: 2px; }
    .frow { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #c9c2ee; }
    .frow input, .frow select { all: unset; background: #0f0d1f; border: 1px solid rgba(167,139,250,.3); border-radius: 8px; padding: 5px 8px; color: #fff; font-size: 13px; }
    .frow.known input, .frow.known select { border-color: rgba(34,197,94,.6); }
    .frow input:focus, .frow select:focus { border-color: #a78bfa; }
    .frem { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #c9c2ee; }
    .src { margin-top: 6px; display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
    .src a { color: #c4b5fd; text-decoration: underline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .b { all: unset; cursor: pointer; font-size: 12.5px; padding: 5px 10px; border-radius: 99px; background: rgba(167,139,250,.16); color: #e4ddff; border: 1px solid rgba(167,139,250,.3); }
    .b:hover, .b:focus-visible { background: rgba(167,139,250,.3); }
    .b.hot { background: #7c3aed; border-color: #7c3aed; color: #fff; }
    .b.old { display: block; border-radius: 10px; padding: 8px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    form { display: flex; gap: 6px; padding: 10px; border-top: 1px solid rgba(167,139,250,.2); }
    input.msg { all: unset; flex: 1; min-width: 0; background: #0f0d1f; border: 1px solid rgba(167,139,250,.3); border-radius: 10px; padding: 8px 10px; color: #fff; font-size: 14px; }
    input.msg:focus { border-color: #a78bfa; }
    input.pick { display: none !important; } /* the 📎 button opens it; it is never shown */
    .log, form { min-width: 0; } .bubble, .log, form { box-sizing: border-box; } .m { box-sizing: border-box; }
    /* a long chat scrolls inside the log, never the whole chat: the header with New chat and Close slid out of view */
    .log { min-height: 0; } header, form { flex-shrink: 0; }
    .send { all: unset; cursor: pointer; background: #7c3aed; color: #fff; border-radius: 10px; padding: 0 12px; font-weight: 600; }
    /* all suggestions visible: they wrap onto a second line instead of scrolling away */
    .sug { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px 10px 0; }
    .sug button { all: unset; cursor: pointer; white-space: nowrap; font-size: 11.5px; line-height: 1.3; padding: 3px 9px; border: 1px solid #4c3d8f; border-radius: 999px; color: #e4ddff; background: #1d1640; }
    .sug button:hover, .sug button:focus-visible { border-color: #a78bfa; background: #2b2063; }
    .foot { display: flex; justify-content: space-between; padding: 0 12px 8px; font-size: 11px; color: #8c84b8; }
    .foot button { all: unset; cursor: pointer; text-decoration: underline; }
    /* the Training link in a light blue that reads well on the dark chat (the browser's dark blue did not) */
    .foot a { color: #93c5fd; text-decoration: underline; } .foot a:hover, .foot a:focus-visible { color: #bfdbfe; }
    @media print { .wrap, .bubble { display: none !important; } }
  </style>
  <div class="wrap" tabindex="0" role="button" aria-label="Open Vidi"><div class="vp" data-mood="idle"></div><div class="tag"></div><div class="say" role="status" hidden></div></div>
  <div class="bubble" role="dialog" aria-label="Vidi chat">
    <header><b></b><button class="ic" data-a="panel" title="Pet settings">⚙</button><button class="ic" data-a="history" title="Earlier chats">🕘</button><button class="ic" data-a="new" title="New chat (this one is kept under Earlier chats)">＋</button><button class="ic" data-a="close" title="Close">✕</button></header>
    <div class="log" aria-live="polite"></div>
    <div class="sug" role="group" aria-label="Suggestions"></div>
    <form><button type="button" class="ic" data-a="file" title="Give me a file (PDF, Word, HTML, text)">📎</button><input type="file" class="pick" hidden accept=".pdf,.docx,.html,.htm,.txt,.md,.csv,.json"><input class="msg" placeholder="Ask me anything..." maxlength="2000" aria-label="Message"><button class="send">Send</button></form>
    <div class="foot"><span>BETA · chats stay in this browser · <a data-a="training" href="#">🎓 Training</a></span><button data-a="hide">Hide on this site</button></div>
  </div>`
  const $ = (s) => root.querySelector(s)
  const wrap = $(".wrap"), vp = $(".vp"), bubble = $(".bubble"), logEl = $(".log"), input = $("input.msg")
  bubble.addEventListener("scroll", () => { if (bubble.scrollTop || bubble.scrollLeft) bubble.scrollTop = bubble.scrollLeft = 0 }) // only the log scrolls

  // the extension was updated or removed: the pet leaves quietly
  const alive = () => { try { return !!chrome.runtime?.id } catch { return false } }
  const tell = (msg) => { if (!alive()) return host.remove(); chrome.runtime.sendMessage({ to: "pet", ...msg }).catch(() => {}) }

  // ---- look ----
  function draw() {
    frame = null
    if (pet.use3d && !broken3d) {
      // the user's own 3D pet: drawn by a plugin page in a see-through frame
      vp.innerHTML = ""
      frame = document.createElement("iframe")
      frame.src = chrome.runtime.getURL("pet/pet3d.html")
      frame.style.cssText = "border:0;width:100%;height:100%;pointer-events:none;background:transparent;color-scheme:normal"
      frame.onload = () => frame?.contentWindow.postMessage({ mood: vp.dataset.mood }, "*")
      vp.append(frame)
    } else if (pet.picture) vp.innerHTML = `<img class="pic" alt="">`, vp.firstChild.src = pet.picture
    else vp.innerHTML = window.VidiPets.svg(pet.kind, pet.colour)
    vp.insertAdjacentHTML("beforeend", `<div class="fx"></div>`)
    $(".tag").textContent = pet.name
    wrap.setAttribute("aria-label", `Open ${pet.name}`)
    $("header b").innerHTML = ""; $("header b").append(pet.name, Object.assign(document.createElement("small"), { textContent: "BETA" }))
  }
  function setMood() {
    const last = [...log].reverse().find((x) => x.who === "pet")
    let mood = "idle"
    if (ring) mood = "alert"
    else if (last?.state === "thinking") mood = "think"
    else if (last?.state === "typing") mood = "talk"
    else if (Date.now() < moodUntil) mood = moodNow
    else if (!open && Date.now() - lastActive > 120000) mood = "sleep"
    if (vp.dataset.mood !== mood) {
      vp.dataset.mood = mood
      frame?.contentWindow?.postMessage({ mood }, "*")
      const fx = $(".fx")
      if (fx) { fx.textContent = { think: "...", alert: "⏰" }[mood] || ""; if (mood === "sleep") fx.innerHTML = "<i>z</i><i>z</i><i>Z</i>" }
    }
  }
  const feel = (mood, ms = 2400) => { moodNow = mood; moodUntil = Date.now() + ms; setMood() }

  // ---- place: at the edge, where it covers nothing ----
  const BUSY = "a,button,input,select,textarea,label,summary,video,audio,iframe,img,canvas,svg,[role=button],[role=link],[role=tab],[role=menuitem],[contenteditable=''],[contenteditable=true]"
  function busyAt(x, y) {
    for (const dx of [6, SIZE / 2, SIZE - 6]) for (const dy of [6, SIZE / 2, SIZE - 6]) {
      const e = document.elementsFromPoint(x + dx, y + dy).find((el) => el !== host)
      if (!e || e === document.documentElement || e === document.body) continue
      if (e.closest(BUSY)) return true
      // the letters of a text (the empty part of a paragraph is free)
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.data.trim()) continue
        const r = document.createRange(); r.selectNodeContents(n)
        for (const b of r.getClientRects()) if (x + dx >= b.left && x + dx <= b.right && y + dy >= b.top && y + dy <= b.bottom) return true
      }
    }
    return false
  }
  let placed = null
  function place() {
    if (!pet || walking) return // filling a form: it stands by the fields
    // dragged there by the user: that is its spot, it stays (the user's choice wins)
    if (pet.pos.pinned) {
      const px = Math.min(Math.max(pet.pos.x * innerWidth - SIZE / 2, 4), innerWidth - SIZE - 4)
      const py = Math.min(Math.max(pet.pos.y * innerHeight - SIZE / 2, 4), innerHeight - SIZE - 20)
      wrap.classList.remove("crowded"); wrap.classList.toggle("left", pet.pos.side === "left"); wrap.classList.toggle("right", pet.pos.side !== "left")
      placed = { x: px, y: py }; wrap.style.left = px + "px"; wrap.style.top = py + "px"
      return placeBubble()
    }
    const x = pet.pos.side === "left" ? GAP : innerWidth - SIZE - GAP
    const want = Math.min(Math.max(pet.pos.y * innerHeight - SIZE / 2, GAP), innerHeight - SIZE - GAP - 16)
    let y = want, free = false
    wrap.style.pointerEvents = "none" // so the check sees the page under it
    for (let k = 0; k < Math.ceil(innerHeight / 12) + 2; k++) { // the whole height of the window
      const tryY = want + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 24
      if (tryY < GAP || tryY > innerHeight - SIZE - GAP - 16) continue
      if (!busyAt(x, tryY)) { y = tryY; free = true; break }
    }
    wrap.style.pointerEvents = ""
    wrap.classList.toggle("crowded", !free)
    wrap.classList.toggle("left", pet.pos.side === "left"); wrap.classList.toggle("right", pet.pos.side !== "left")
    if (placed && Math.abs(placed.y - y) > 30 && !open) feel("happy", 900) // a little hop when it moves
    placed = { x, y }
    wrap.style.left = x + "px"; wrap.style.top = y + "px"
    placeBubble()
  }
  // the user can drag the corner to make the chat bigger or smaller; the size is kept
  // (a size under the smallest chat is never used: a 0 x 0 saved by quick clicks hid New chat and Close off the screen)
  chrome.storage.local.get("petChatSize", r => { const z = r.petChatSize; if (z?.w >= 260 && z?.h >= 300) { bubble.style.width = z.w + "px"; bubble.style.height = z.h + "px" } })
  let sizeT
  // (the size is read when it is saved: the chat closed within the 400 ms saved 0 x 0)
  new ResizeObserver(() => { clearTimeout(sizeT); sizeT = setTimeout(() => { const w = bubble.offsetWidth, h = bubble.offsetHeight; if (w >= 260 && h >= 300) chrome.storage.local.set({ petChatSize: { w, h } }) }, 400) }).observe(bubble)
  function placeBubble() {
    if (!placed) return
    // closed, it measures 0: the size the user gave it counts (a bigger chat put
    // its New chat and Close buttons off the screen)
    const w = Math.min(bubble.offsetWidth || parseFloat(bubble.style.width) || 330, innerWidth - 16)
    const h = Math.min(bubble.offsetHeight || parseFloat(bubble.style.height) || 460, innerHeight - 16)
    const left = Math.max(8, pet.pos.side === "left" ? Math.min(placed.x + SIZE + 8, innerWidth - w - 8) : placed.x - w - 8)
    const top = Math.min(Math.max(8, placed.y + SIZE - h), innerHeight - h - 8)
    bubble.style.left = left + "px"; bubble.style.top = top + "px"
  }
  let t1
  const later = () => { clearTimeout(t1); t1 = setTimeout(place, 350) }
  addEventListener("scroll", later, { passive: true, capture: true })
  addEventListener("resize", later)
  setInterval(() => { if (!document.hidden && !open && !wrap.classList.contains("drag")) place() }, 5000)
  // content that comes later (shops load products after the page): the spot is checked again
  let t2
  new MutationObserver((list) => {
    if (list.every((r) => host.contains(r.target) || r.target === host)) return
    clearTimeout(t2); t2 = setTimeout(() => { if (!open && !walking && !wrap.classList.contains("drag")) place(); botCheck() }, 600)
  }).observe(document.body || document.documentElement, { childList: true, subtree: true })

  // tucks half away after a while, comes back when the mouse comes near
  setInterval(() => {
    // tucked away when not needed, but a sleeping pet comes out so its zzz can be seen
    const quiet = !open && Date.now() - hoverAt > 20000 && !ring && vp.dataset.mood !== "sleep" && !pet?.pos?.pinned // a pinned pet stays as it is
    wrap.classList.toggle("peek", quiet)
    setMood()
  }, 1000)
  wrap.addEventListener("pointerenter", () => { hoverAt = Date.now(); if (vp.dataset.mood === "sleep") feel("happy", 1200) })
  for (const ev of ["pointermove", "keydown", "wheel"]) addEventListener(ev, () => { lastActive = Date.now() }, { passive: true, capture: true })

  // ---- drag to move, click to chat ----
  let down = null
  wrap.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, moved: false }; wrap.setPointerCapture(e.pointerId) })
  wrap.addEventListener("pointermove", (e) => {
    if (!down) return
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) return
    down.moved = true; wrap.classList.add("drag"); wrap.classList.remove("peek")
    wrap.style.left = e.clientX - SIZE / 2 + "px"; wrap.style.top = e.clientY - SIZE / 2 + "px"
  })
  wrap.addEventListener("pointerup", (e) => {
    const d = down; down = null; wrap.classList.remove("drag")
    if (!d) return
    if (!d.moved) return toggle()
    // where the user puts it is its fixed spot ("Let my pet find its own spot" in the plugin undoes it)
    pet.pos = { pinned: true, side: e.clientX < innerWidth / 2 ? "left" : "right", x: Math.min(Math.max(e.clientX / innerWidth, 0.02), 0.98), y: Math.min(Math.max(e.clientY / innerHeight, 0.03), 0.97) }
    chrome.storage.local.get("pet").then(({ pet: p }) => chrome.storage.local.set({ pet: { ...(p || {}), pos: pet.pos } })).catch(() => {})
    place(); feel("happy", 900)
  })

  function toggle(force) {
    open = force ?? !open
    // same top layer as a page's own boxes (Booking's search box): the last one on the page
    // is on top, so the pet moves itself to the end when its chat opens
    if (open && host !== document.documentElement.lastElementChild) document.documentElement.append(host)
    bubble.classList.toggle("show", open); wrap.classList.toggle("open", open)
    hoverAt = Date.now()
    if (open) { placeBubble(); render(); input.focus(); if (vp.dataset.mood === "sleep") feel("happy", 1200) }
    setMood()
  }

  // ---- the chat ----
  // the AI sometimes writes Markdown: shown as plain words and • bullets (always as text, never as HTML)
  const plain = (t) => String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[*-]\s+/gm, "• ").replace(/^#{1,6}\s*/gm, "").replace(/\*\*/g, "").replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$)/g, "$1$2")
  const tr = (k, v) => window.VidiI18n ? window.VidiI18n.t(k, v) : k
  // the fixed texts in the pet's language (set again when the language changes)
  function texts() {
    window.VidiI18n?.setLang(pet.lang)
    $("[data-a=panel]").title = tr("settings"); $("[data-a=history]").title = tr("history"); $("[data-a=new]").title = tr("newChat"); $("[data-a=close]").title = tr("close")
    $("[data-a=file]").title = tr("fileBtn"); input.placeholder = tr("placeholder"); $(".send").textContent = tr("send")
    $(".foot span").firstChild.textContent = tr("foot") + " · "; $("[data-a=training]").textContent = tr("training"); $("[data-a=hide]").textContent = tr("hide")
  }
  const drafts = {} // what the user typed in a fill list (kept when the chat is drawn again)
  // one-click suggestions above the message box, always there, fitting this page:
  // guiding (with the manual when there is one), explaining, filling the form, a timer, a search
  let hasDoc = !!saved.petHasDoc
  const sugEl = $(".sug")
  function suggest() {
    const chips = [
      [hasDoc ? tr("sugGuideDoc") : tr("sugGuide"), () => send(tr("sugGuideAsk"))],
      !hasDoc && [tr("sugManual"), () => $("input.pick").click()],
      [tr("sugExplain"), () => send(tr("chipExplainAsk"))],
      [tr("sugFill"), () => send(tr("sugFillAsk"))], // always (the user asked): without a form the pet says so
      [tr("sugTimer"), () => send(tr("chipTimer"))],
      [tr("sugSearch"), () => { input.value = tr("searchPrefix"); input.focus() }],
    ].filter(Boolean)
    sugEl.textContent = ""
    for (const [t, fn] of chips) { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.onclick = fn; sugEl.append(b) }
  }
  const btn = (text, fn, hot) => { const b = document.createElement("button"); b.className = "b" + (hot ? " hot" : ""); b.type = "button"; b.textContent = text; b.onclick = fn; return b }
  // "Earlier chats": the chats kept when a new one was started; one click opens it again
  async function renderHistory() {
    logEl.textContent = ""
    const back = btn(tr("back"), () => { history = false; render() }); logEl.append(back)
    const { petChats = [] } = await chrome.storage.local.get("petChats").catch(() => ({}))
    if (!petChats.length) return logEl.append(Object.assign(document.createElement("div"), { className: "m pt", textContent: tr("noChats") }))
    for (const c of petChats) {
      const b = btn(`${new Date(c.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${c.title}`, () => { history = false; tell({ type: "open-chat", id: c.id }) })
      b.classList.add("old"); logEl.append(b)
    }
  }
  function render() {
    if (!open) return
    if (history) return renderHistory()
    const atEnd = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40
    logEl.textContent = ""
    if (!log.length) {
      const d = document.createElement("div"); d.className = "m pt"
      d.textContent = tr("hello", { name: pet.name })
      const row = document.createElement("div"); row.className = "row"
      row.append(btn(tr("chipExplain"), () => send(tr("chipExplainAsk"))), btn(tr("chipTimer"), () => send(tr("chipTimer"))),
        btn(tr("chipSearch"), () => { input.value = tr("searchPrefix"); input.focus() }), btn(tr("chipLearn"), () => tell({ type: "open-training" })))
      d.append(row); logEl.append(d)
    }
    for (const x of log) {
      const d = document.createElement("div")
      d.className = "m " + (x.who === "me" ? "me" : "pt" + (x.state === "error" ? " err" : ""))
      if (x.who === "pet" && (x.state === "thinking" || (x.state === "typing" && !x.text))) { d.classList.add("wait"); d.textContent = x.label || tr("thinking", { name: pet.name }) }
      else d.textContent = plain(x.text)
      if (x.sources?.length && x.state === "done") {
        const s = document.createElement("div"); s.className = "src"
        // one link per page, without the passage numbers ("Dragon - Wikipedia (74)")
        const seenUrl = new Set()
        // only normal web links (a "javascript:" link from a trick page would run on the page)
        for (const src of x.sources.filter((y) => /^https?:\/\//i.test(y.url || "") && !seenUrl.has(y.url) && seenUrl.add(y.url))) { const a = document.createElement("a"); a.href = src.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "↗ " + String(src.label || src.url).replace(/ \(\d+\)$/, ""); s.append(a) }
        d.append(s)
      }
      // a download in progress: a bar that fills up (the % is in the text too)
      if (x.progress != null) {
        const bar = document.createElement("div"); bar.className = "pbar"; bar.setAttribute("role", "progressbar"); bar.setAttribute("aria-valuenow", String(x.progress))
        bar.append(Object.assign(document.createElement("i"), { style: `width:${Math.max(2, Math.min(100, x.progress))}%` })); d.append(bar)
      }
      if (x.state === "done" && /cloud$/.test(x.model || "")) d.append(Object.assign(document.createElement("div"), { className: "cloud", textContent: tr("cloud", { model: x.model }) }))
      const row = document.createElement("div"); row.className = "row"
      if (x.ring && ring?.id === x.ring) row.append(btn(tr("stop"), () => tell({ type: "stop-ring" }), true), btn(tr("snooze"), () => tell({ type: "stop-ring", snooze: x.snooze })))
      if (x.searchFor && x.state === "done") row.append(btn(tr("more"), () => tell({ type: "search-more", text: x.searchFor })))
      // an answer about this page: the buttons it means can be marked on the page
      if (x.scope === "page" && x.state === "done" && !x.showing && !x.shot) row.append(btn(tr("showMe"), () => tell({ type: "show-me", id: x.id }), true))
      if (x.showing) d.append(Object.assign(document.createElement("div"), { className: "wait", textContent: x.showing }))
      if (x.shot) {
        const img = Object.assign(document.createElement("img"), { src: x.shot, alt: tr("shotAlt"), title: tr("bigger") })
        img.className = "shot"; img.onclick = () => img.classList.toggle("big")
        d.append(img)
      }
      if (x.shotNote) d.append(Object.assign(document.createElement("div"), { className: "note", textContent: x.shotNote }))
      if (x.offerSearch && x.state === "done") row.append(btn(tr("searchThis"), () => send("Search the web for " + (log[log.indexOf(x) - 1]?.text || ""))))
      // "fill this page": every field in a list, what is known filled in, the rest to type
      if (x.fillForm && x.fillPlan) {
        const dr = drafts[x.id] || (drafts[x.id] = { values: { ...x.fillPlan.values }, remember: true })
        const fbox = document.createElement("div"); fbox.className = "fill"
        for (const f of x.fillPlan.fields) {
          const frow = document.createElement("label"); frow.className = "frow" + (x.fillPlan.from[f.i] ? " known" : "")
          if (x.fillPlan.from[f.i]) frow.title = x.fillPlan.from[f.i] === "file" ? tr("fromFile") : tr("fromBefore")
          let inp
          if (f.options?.length) { inp = document.createElement("select"); inp.append(new Option("", "")); for (const o of f.options) inp.append(new Option(o, o)) }
          else { inp = document.createElement("input"); inp.type = /^(email|tel|date|number|url)$/.test(f.type) ? f.type : "text" }
          inp.value = dr.values[f.i] ?? ""
          inp.oninput = inp.onchange = () => { dr.values[f.i] = inp.value }
          frow.append(Object.assign(document.createElement("span"), { textContent: f.label || tr("noName") }), inp)
          fbox.append(frow)
        }
        const rem = document.createElement("label"); rem.className = "frem"
        const cb = Object.assign(document.createElement("input"), { type: "checkbox", checked: dr.remember }); cb.onchange = () => { dr.remember = cb.checked }
        rem.append(cb, tr("remember"))
        fbox.append(rem); d.append(fbox)
        row.append(btn(tr("fill"), () => tell({ type: "fill-go", id: x.id, values: dr.values, remember: dr.remember }), true), btn(tr("cancel"), () => tell({ type: "fill-cancel", id: x.id })))
      }
      // which AI answers: one button per model; a cloud one asks about confidential work first
      if (x.modelChoices) for (const c of x.modelChoices) row.append(btn(c.label, () => tell({ type: "model", id: x.id, name: c.name })))
      if (x.confQuestion !== undefined && !x.confAnswered) row.append(
        btn(tr("confYes"), () => tell({ type: "confidential", id: x.id, answer: "yes", model: x.confQuestion })),
        btn(tr("confNo"), () => tell({ type: "confidential", id: x.id, answer: "no", model: x.confQuestion })))
      if (x.choose?.length) for (const c of x.choose) row.append(btn(`${c.n}. ${c.near}`, () => tell({ type: "pick-one", id: x.id, idx: c.idx }), true))
      if (x.guideStep && x.state === "done") row.append(btn(tr("guideNext"), () => tell({ type: "guide-next", id: x.id }), true), btn(tr("guideStop"), () => tell({ type: "guide-stop", id: x.id })))
      if (x.openFile && x.state === "done") row.append(btn(tr("openFile", { file: x.openFile.length > 28 ? x.openFile.slice(0, 26) + "…" : x.openFile }), () => tell({ type: "open-file" })))
      if (x.trainingLink && (x.state === "done" || x.state === "error")) row.append(btn(tr("chipLearn"), () => tell({ type: "open-training" })))
      if (x.askFeedback) row.append(btn(tr("helpful"), () => tell({ type: "feedback", id: x.id, good: true })), btn(tr("notReally"), () => tell({ type: "feedback", id: x.id, good: false })))
      if (row.childNodes.length) d.append(row)
      logEl.append(d)
    }
    if (atEnd || log.at(-1)?.who === "me") logEl.scrollTop = logEl.scrollHeight
    suggest()
  }
  function send(text) {
    text = String(text || "").trim()
    if (!text) return
    input.value = ""
    tell({ type: "say", text })
  }
  $("form").addEventListener("submit", (e) => { e.preventDefault(); send(input.value) })
  // the page's own keyboard shortcuts must not fire while typing to Vidi
  // keys typed here are stopped before the page sees them (pet/keys.js); Escape closes the chat
  for (const ev of ["keydown", "keyup", "keypress"]) bubble.addEventListener(ev, (e) => e.stopPropagation())
  window.__vidiKey = (e) => {
    if (e.key === "Escape" && open) { toggle(false); wrap.focus() }
    else if ((e.key === "Enter" || e.key === " ") && root.activeElement === wrap) { e.preventDefault(); toggle() }
  }
  root.addEventListener("click", (e) => {
    const a = e.target.closest?.("[data-a]")?.dataset.a
    if (a === "close") toggle(false)
    else if (a === "new") { history = false; tell({ type: "new-chat" }) }
    else if (a === "history") { history = !history; render() }
    else if (a === "panel") tell({ type: "open-panel" })
    else if (a === "hide") { tell({ type: "hide-site", host: location.host }); toggle(false) }
    else if (a === "file") $("input.pick").click()
    else if (a === "training") { e.preventDefault(); tell({ type: "open-training" }) }
  })

  // ---- a short speech bubble beside the pet ----
  const sayEl = $(".say")
  let sayTimer
  function speak(text, ms = 10000) {
    sayEl.textContent = text; sayEl.hidden = false; wrap.classList.remove("peek")
    feel("think", 1500); clearTimeout(sayTimer); sayTimer = setTimeout(() => { sayEl.hidden = true }, ms)
  }
  sayEl.addEventListener("pointerdown", (e) => { e.stopPropagation(); sayEl.hidden = true })

  // A robot check on the page ("I'm not a robot", picture puzzles, "verify you are
  // human"): only the user can do it. Said once per page, in the browser's language.
  // a few playful lines per language, one picked at random
  const BOT_SAY = {
    en: ["Psst! 🕵️ This page suspects I'm a robot. Only a real human can pass this test, and that's you! 💪",
      "Uh-oh, a robot check! 🤖 I'm way too fluffy for this one. Your turn, hero! 🐾",
      "Beep boop... just kidding 😄 The page wants a real human. Show it your human powers! ✨"],
    de: ["Psst! 🕵️ Die Seite hält mich für einen Roboter. Diesen Test schafft nur ein echter Mensch, also du! 💪",
      "Oh oh, ein Roboter-Check! 🤖 Dafür bin ich viel zu flauschig. Du bist dran! 🐾",
      "Piep piep... Spaß! 😄 Die Seite will einen echten Menschen. Zeig ihr deine Menschen-Kräfte! ✨"],
    hi: ["Psst! 🕵️ Yeh page soch raha hai main robot hoon. Yeh test sirf asli insaan pass kar sakta hai, matlab aap! 💪",
      "Arre, robot check! 🤖 Main iske liye bahut fluffy hoon. Ab aapki baari, hero! 🐾",
      "Beep boop... mazaak kar raha tha 😄 Page ko asli insaan chahiye. Dikha do apni insaani power! ✨"],
    es: ["¡Psst! 🕵️ Esta página sospecha que soy un robot. Solo un humano de verdad pasa esta prueba: ¡tú! 💪",
      "¡Uy, un control anti-robots! 🤖 Soy demasiado peludito para esto. ¡Te toca, crack! 🐾",
      "Bip bup... ¡es broma! 😄 La página quiere un humano de verdad. ¡Muéstrale tus poderes humanos! ✨"],
    fr: ["Psst ! 🕵️ Cette page me prend pour un robot. Seul un vrai humain peut réussir ce test : toi ! 💪",
      "Oh oh, un test anti-robot ! 🤖 Je suis bien trop tout doux pour ça. À toi de jouer ! 🐾",
      "Bip bip... je rigole ! 😄 La page veut un vrai humain. Montre-lui tes super-pouvoirs humains ! ✨"],
  }
  let botTold = false
  function botCheck() {
    if (botTold || !pet || host.style.display === "none") return
    const frames = [...document.querySelectorAll("iframe")].some((f) => /recaptcha|hcaptcha|challenges\.cloudflare\.com|turnstile|arkoselabs|funcaptcha/i.test(f.src || ""))
    const words = /\b(i'?m not a robot|verify (that )?you are (a )?human|unusual traffic from your computer|are you a robot|confirm you are human|checking (if|whether) the site connection is secure)\b/i.test((document.body?.innerText || "").slice(0, 20000))
    if (!frames && !words) return
    botTold = true
    const lines = BOT_SAY[window.VidiI18n?.lang || "en"] || BOT_SAY.en
    speak(lines[Math.floor(Math.random() * lines.length)], 12000)
  }
  setTimeout(botCheck, 1500)

  // The browser was just opened: the pet pops out with a greeting for the time of day,
  // once, on the first page the user looks at. Clicking the pet opens the chat as always.
  const GREET = {
    en: { morning: ["Good morning{u}! ☀️ {p} is awake and ready. Click me to chat 💬", "Rise and shine{u}! 🌅 Coffee first, then we conquer the day? Click me any time 💬"],
      afternoon: ["Good afternoon{u}! 🌤️ {p} here, at your service. Click me to chat 💬", "Hey{u}! 👋 Lunch done? I'm right here if you need me 💬"],
      evening: ["Good evening{u}! 🌙 {p} is here for you. Click me to chat 💬", "Evening{u}! ✨ Long day? Tell me what you need 💬"],
      night: ["Still up{u}? 🦉 {p} is awake too. Click me if you need me 💬", "Hello, night owl{u}! 🌌 I'm here, just click me 💬"] },
    de: { morning: ["Guten Morgen{u}! ☀️ {p} ist wach und bereit. Klick mich zum Reden 💬", "Aufstehen{u}! 🌅 Erst Kaffee, dann rocken wir den Tag? 💬"],
      afternoon: ["Guten Tag{u}! 🌤️ {p} hier, zu Diensten. Klick mich an 💬", "Hey{u}! 👋 Mittag gegessen? Ich bin da, wenn du mich brauchst 💬"],
      evening: ["Guten Abend{u}! 🌙 {p} ist für dich da. Klick mich an 💬", "Abend{u}! ✨ Langer Tag? Sag mir, was du brauchst 💬"],
      night: ["Noch wach{u}? 🦉 {p} auch. Klick mich, wenn du mich brauchst 💬", "Hallo, Nachteule{u}! 🌌 Ich bin da, klick mich einfach an 💬"] },
    hi: { morning: ["Good morning{u}! ☀️ {p} jaag gaya, ready hai. Baat karni ho to click karo 💬", "Utho{u}, din shuru! 🌅 Pehle chai, phir duniya jeetein? 💬"],
      afternoon: ["Good afternoon{u}! 🌤️ {p} haazir hai. Click karke baat karo 💬", "Hey{u}! 👋 Khana ho gaya? Main yahin hoon 💬"],
      evening: ["Good evening{u}! 🌙 {p} aapke liye yahin hai. Click karo 💬", "Shaam ho gayi{u}! ✨ Lamba din tha? Batao kya chahiye 💬"],
      night: ["Abhi tak jaage{u}? 🦉 {p} bhi jaag raha hai. Zarurat ho to click karo 💬", "Hello, raat ke ullu{u}! 🌌 Main yahin hoon 💬"] },
    es: { morning: ["¡Buenos días{u}! ☀️ {p} está despierto y listo. Haz clic para charlar 💬", "¡Arriba{u}! 🌅 ¿Primero café y luego a por el día? 💬"],
      afternoon: ["¡Buenas tardes{u}! 🌤️ {p} a tu servicio. Haz clic para charlar 💬", "¡Hola{u}! 👋 ¿Ya comiste? Aquí estoy si me necesitas 💬"],
      evening: ["¡Buenas noches{u}! 🌙 {p} está aquí para ti. Haz clic 💬", "¡Hola{u}! ✨ ¿Día largo? Dime qué necesitas 💬"],
      night: ["¿Aún despierto{u}? 🦉 {p} también. Haz clic si me necesitas 💬", "¡Hola, búho nocturno{u}! 🌌 Aquí estoy 💬"] },
    fr: { morning: ["Bonjour{u} ! ☀️ {p} est réveillé et prêt. Clique pour discuter 💬", "Debout{u} ! 🌅 Un café d'abord, puis on conquiert la journée ? 💬"],
      afternoon: ["Bon après-midi{u} ! 🌤️ {p} à ton service. Clique pour discuter 💬", "Coucou{u} ! 👋 Déjà mangé ? Je suis là si tu as besoin 💬"],
      evening: ["Bonsoir{u} ! 🌙 {p} est là pour toi. Clique sur moi 💬", "Bonsoir{u} ! ✨ Longue journée ? Dis-moi ce qu'il te faut 💬"],
      night: ["Encore debout{u} ? 🦉 {p} aussi. Clique si tu as besoin 💬", "Salut, oiseau de nuit{u} ! 🌌 Je suis là 💬"] },
  }
  async function greet(tries = 0) {
    if (!pet && tries < 8) return setTimeout(() => greet(tries + 1), 1000) // the settings are still loading
    const { petGreet, petMem } = await chrome.storage.local.get(["petGreet", "petMem"]).catch(() => ({}))
    if (!petGreet || Date.now() - petGreet > 10 * 60000 || document.hidden || !pet || host.style.display === "none") return
    await chrome.storage.local.remove("petGreet") // once: the first page only
    const h = new Date().getHours(), part = h >= 5 && h < 12 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "night"
    const lines = (GREET[window.VidiI18n?.lang] || GREET.en)[part]
    const user = String(petMem?.user || "").slice(0, 20)
    // every greeting says how to start: a new user does not know the pet opens a chat when clicked
    const CLICK = { en: "Just click me", de: "Klick mich einfach an", hi: "Bas mujhe click karo", es: "Haz clic en mí", fr: "Clique sur moi" }
    let line = lines[Math.floor(Math.random() * lines.length)].replace("{u}", user ? `, ${user}` : "").replace("{p}", pet.name || "Vidi")
    if (!/click|klick|clic/i.test(line)) line = line.replace(/\s*💬$/, "") + ` ${CLICK[window.VidiI18n?.lang] || CLICK.en} 💬`
    speak(line, 9000)
    feel("happy", 2500)
  }
  setTimeout(greet, 1200)

  // ---- a file for the pet: the 📎 button, or dropped on the pet or its chat ----
  function giveFile(f) {
    if (!f) return
    if (f.size > 15e6) return tell({ type: "file", name: f.name, size: f.size, data: "" }) // the pet says it is too big
    const r = new FileReader()
    r.onload = () => tell({ type: "file", name: f.name, size: f.size, mime: f.type, data: String(r.result).split(",")[1] || "" })
    r.readAsDataURL(f)
  }
  $("input.pick").addEventListener("change", (e) => { giveFile(e.target.files[0]); e.target.value = "" })
  for (const el of [wrap, bubble]) {
    el.addEventListener("dragover", (e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); feel("happy", 800) } })
    el.addEventListener("drop", (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); giveFile(e.dataTransfer.files[0]); if (!open) toggle(true) })
  }

  // ---- filling a form: the pet walks to each field, stands beside it (never on it),
  // fills it, marks it green, goes on, and walks back to its spot at the end ----
  const pause = (ms) => new Promise((r) => setTimeout(r, ms))
  async function walkFill(fills, file) {
    if (host.style.display === "none") throw new Error("the pet is hidden here")
    walking = true; toggle(false); wrap.classList.remove("peek", "crowded")
    // the page's own code must notice the new value (React and others listen to input events)
    const set = (e, v) => {
      const proto = e.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : e.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, "value").set.call(e, v)
      e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true }))
    }
    let n = 0
    try {
      for (const f of [...fills, ...(file ? [{ i: file.i, file }] : [])]) {
        const e = document.querySelector(`[data-vidi-fill="${f.i}"]`)
        if (!e) continue
        // a hidden file field: its label or box is what can be seen
        const seen = e.type === "file" && e.getBoundingClientRect().width < 2 ? (e.labels?.[0] || e.closest("label") || e.parentElement) : e
        seen.scrollIntoView({ block: "center", behavior: "smooth" }); await pause(380)
        const r = seen.getBoundingClientRect()
        const x = r.right + 12 + SIZE < innerWidth ? r.right + 12 : Math.max(4, r.left - SIZE - 12)
        wrap.style.left = x + "px"; wrap.style.top = Math.min(Math.max(4, r.top + r.height / 2 - SIZE / 2), innerHeight - SIZE - 4) + "px"
        feel("talk", 1100); await pause(560)
        if (f.file) {
          const dt = new DataTransfer()
          dt.items.add(new File([Uint8Array.from(atob(f.file.data), (c) => c.charCodeAt(0))], f.file.name, { type: f.file.type }))
          e.files = dt.files; e.dispatchEvent(new Event("change", { bubbles: true }))
        } else if (e.tagName === "SELECT") {
          const o = [...e.options].find((x) => x.text.trim().toLowerCase() === f.value.toLowerCase())
          if (!o) continue
          set(e, o.value)
        } else set(e, f.value)
        seen.style.outline = "2px solid #22c55e"; seen.style.outlineOffset = "2px"; n++
        await pause(220)
      }
    } finally {
      walking = false; feel("happy", 1600); place()
      setTimeout(() => toggle(true), 900) // the chat comes back with "please check"
    }
    return n
  }
  chrome.runtime.onMessage.addListener((m, _from, reply) => {
    // "▶ Try it" on the Pet training page: the chat opens, the sentence is said for the user
    if (m?.to === "pet-page" && m.type === "open") { if (!open) toggle(true); reply({ ok: true }); return }
    if (m?.to !== "pet-page" || m.type !== "fill") return
    walkFill(m.fills || [], m.file).then((n) => reply({ done: true, n }), () => reply({ done: false }))
    return true
  })

  // ---- settings and chat from the plugin ----
  let hideUntil = 0 // the pet steps out of a screenshot of the marked page
  function apply() {
    // the ShowMeWise website has its own Vidi: the pet comes only on its training page
    const vdSite = ["https://showmewise.netlify.app", "http://127.0.0.1:8899"].includes(location.origin) && !/^#\/pet-training/.test(location.hash)
    const hidden = vdSite || !pet.on || (pet.hiddenSites || []).includes(location.host) || !!document.fullscreenElement || Date.now() < hideUntil
    host.style.display = hidden ? "none" : ""
    if (!hidden) { texts(); draw(); place(); render() }
  }
  // the 3D file could not be read: the dragon stands in
  addEventListener("message", (e) => { if (frame && e.source === frame.contentWindow && e.data?.vidi3d === "error") { broken3d = true; draw(); setMood() } })
  document.addEventListener("fullscreenchange", () => pet && apply())
  addEventListener("hashchange", () => pet && apply()) // the ShowMeWise website changes pages without loading
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local" || !alive()) return
    if (ch.pet) { pet = { ...pet, ...ch.pet.newValue }; apply() }
    if (ch.petHideUntil && pet) { hideUntil = ch.petHideUntil.newValue || 0; apply(); setTimeout(apply, Math.max(0, hideUntil - Date.now()) + 50) }
    if (ch.petHasDoc) { hasDoc = !!ch.petHasDoc.newValue; if (open) suggest() }
    if (ch.petRing) { ring = ch.petRing.newValue || null; if (ring) { wrap.classList.remove("peek") } setMood(); render() }
    if (ch.petLog) {
      const before = log.at(-1)
      log = ch.petLog.newValue || []
      const last = log.at(-1)
      if (last?.who === "pet" && last.state === "done" && (before?.id !== last.id || before?.state !== "done")) feel(last.mood || "happy", 2400)
      if (last?.who === "pet" && last.state === "error" && before?.state !== "error") feel("sad", 4000)
      render(); setMood()
    }
  })
  pet = { on: true, kind: "dragon", colour: "", name: "Vidi", pos: { side: "right", y: 0.72 }, hiddenSites: [], ...(saved.pet || {}) }
  log = saved.petLog || []; ring = saved.petRing || null
  document.documentElement.append(host)
  apply(); setMood()
})()
