// The pet's settings in the plugin panel: name, which pet, colour, own
// picture or 3D file, on or off, sites where it hides, timers that are set.
;(() => {
  const $ = (id) => document.getElementById(id)
  const DEF = { on: true, kind: "dragon", colour: "", name: "Vidi", picture: null, use3d: false, pos: { side: "right", y: 0.72 }, hiddenSites: [] }
  const NAMES = { dragon: "Dragon", wolf: "Wolf", cat: "Cat", fox: "Fox", owl: "Owl" }
  let pet = DEF
  const save = (patch) => chrome.storage.local.set({ pet: (pet = { ...pet, ...patch }) })
  document.head.append(Object.assign(document.createElement("style"), { textContent: window.VidiPetCSS }))
  if (new URLSearchParams(location.search).get("tab") === "pet") $("petCard").open = true

  function look(el, p = pet) {
    el.textContent = ""
    if (p.picture && !p.use3d) { const i = new Image(); i.className = "pic"; i.src = p.picture; i.alt = ""; el.append(i) }
    else if (p.use3d) el.innerHTML = `<div style="width:100%;height:100%;display:grid;place-items:center;font-size:34px">🧊</div>`
    else el.innerHTML = window.VidiPets.svg(p.kind, p.colour)
  }
  function draw() {
    $("petTitle").textContent = pet.name
    $("petIcon").textContent = pet.use3d ? "🧊" : pet.picture ? "🖼" : { dragon: "🐉", wolf: "🐺", cat: "🐱", fox: "🦊", owl: "🦉" }[pet.kind] || "🐉"
    if (document.activeElement !== $("petName")) $("petName").value = pet.name
    $("petOn").checked = !!pet.on
    $("petLang").value = pet.lang || "auto"
    $("petFree").hidden = !pet.pos?.pinned
    look($("petBig"))
    const box = $("petKinds"); box.textContent = ""
    const own = pet.picture ? "picture" : pet.use3d ? "3d" : pet.kind
    for (const k of window.VidiPets.kinds) {
      const b = document.createElement("button"); b.className = own === k ? "on" : ""; b.title = NAMES[k]
      const m = document.createElement("div"); m.className = "mini vp"; m.dataset.mood = "idle"; m.innerHTML = window.VidiPets.svg(k, own === k ? pet.colour : "")
      b.append(m, NAMES[k]); b.onclick = () => save({ kind: k, colour: "", picture: null, use3d: false }).then(draw); box.append(b)
    }
    const extra = (key, icon, label, fn) => { const b = document.createElement("button"); b.className = own === key ? "on" : ""; b.innerHTML = `<div class="mini" style="display:grid;place-items:center;font-size:24px">${icon}</div>`; b.append(label); b.onclick = fn; box.append(b) }
    extra("picture", "🖼", "My picture", () => $("petPic").click())
    extra("3d", "🧊", "My 3D pet", () => $("pet3d").click())
    const sel = $("petColour"); sel.textContent = ""
    $("petColourWrap").hidden = own === "picture" || own === "3d"
    for (const c of Object.keys(window.VidiPets.colours[pet.kind] || {})) sel.append(new Option(c, c, false, c === (pet.colour || Object.keys(window.VidiPets.colours[pet.kind])[0])))
    const hid = pet.hiddenSites || []
    const h = $("petHidden"); h.textContent = ""
    if (hid.length) {
      h.append("Hidden on: ")
      for (const s of hid) { const b = document.createElement("button"); b.textContent = `${s} ✕`; b.title = "Show it there again"; b.style.cssText = "padding:1px 7px;font-size:11px;margin:2px"; b.onclick = () => save({ hiddenSites: hid.filter((x) => x !== s) }).then(draw); h.append(b) }
    }
  }
  async function alarms() {
    const list = ((await chrome.storage.local.get("petAlarms")).petAlarms || []).sort((a, b) => a.when - b.when)
    const p = $("petAlarms"); p.textContent = ""
    if (!list.length) return
    p.append("Set now:")
    const ul = document.createElement("ul"); ul.className = "list"
    for (const a of list) {
      const li = document.createElement("li")
      li.textContent = `${a.kind[0].toUpperCase() + a.kind.slice(1)} at ${new Date(a.when).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}${a.text ? `: ${a.text}` : ""}`
      const b = document.createElement("button"); b.textContent = "Cancel"
      b.onclick = async () => { await chrome.alarms.clear("pet:" + a.id); const all = (await chrome.storage.local.get("petAlarms")).petAlarms || []; await chrome.storage.local.set({ petAlarms: all.filter((x) => x.id !== a.id) }) }
      li.append(b); ul.append(li)
    }
    p.append(ul)
  }
  const allowed = () => chrome.permissions.contains({ origins: ["<all_urls>"] })
  async function perm() { $("petAllow").hidden = !pet.on || (await allowed()) }

  $("petName").addEventListener("input", (e) => { const v = e.target.value.trim(); if (v) save({ name: v.slice(0, 20) }).then(() => { $("petTitle").textContent = pet.name }) })
  // an empty name is not saved: leaving the box shows the pet's name again (it stayed empty before)
  $("petName").addEventListener("blur", (e) => { if (!e.target.value.trim()) e.target.value = pet.name })
  $("petColour").onchange = (e) => save({ colour: e.target.value }).then(draw)
  // the pet's language: the browser's by default, or one of five
  $("petLang").append(new Option("Automatic (the browser's language)", "auto"), ...Object.entries(window.VidiI18n.LANGS).map(([k, n]) => new Option(n, k)))
  $("petLang").onchange = (e) => save({ lang: e.target.value })
  $("petOn").onchange = async (e) => {
    // the pet needs the same OK as reading pages; asked right here, on this click
    if (e.target.checked && !(await allowed()) && !(await chrome.permissions.request({ origins: ["<all_urls>"] }).catch(() => false))) { e.target.checked = false; return save({ on: false }).then(perm) }
    await save({ on: e.target.checked }); perm()
  }
  $("petAllow").onclick = async () => { if (await chrome.permissions.request({ origins: ["<all_urls>"] }).catch(() => false)) perm() }
  $("petForget").onclick = async () => { await chrome.storage.local.remove(["petMem", "petLog"]); $("petForget").textContent = "Done: forgotten" }
  $("petForgetForm").onclick = async () => { await chrome.storage.local.remove("petProfile"); $("petForgetForm").textContent = "Done: form details forgotten"; saved() }
  $("petForgetFile").onclick = async () => {
    await new Promise((res) => { const r = indexedDB.open("vidi-pet", 1); r.onupgradeneeded = () => r.result.createObjectStore("files"); r.onsuccess = () => { const tx = r.result.transaction("files", "readwrite"); tx.objectStore("files").delete("doc"); tx.oncomplete = res; tx.onerror = res }; r.onerror = res })
    $("petForgetFile").textContent = "Done: file forgotten"
  }
  $("petFree").onclick = () => save({ pos: { side: pet.pos?.side || "right", y: 0.72 } }).then(draw)
  // what the pet keeps for forms: shown by name, so the user knows (never passwords or card numbers)
  async function saved() {
    const p = (await chrome.storage.local.get("petProfile")).petProfile || {}
    const keys = Object.keys(p)
    $("petSaved").textContent = keys.length ? `Saved for forms: ${keys.join(", ")}.` : ""
  }
  saved()
  chrome.storage.local.get("site").then(({ site }) => { if (site) $("petTraining").href = site + "/#/pet-training" })

  // own picture: a square of 256 px, kept in this browser
  $("petPic").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""
    if (!f) return
    try {
      const img = await createImageBitmap(f)
      const s = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = 256
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256)
      await save({ picture: c.toDataURL("image/webp", 0.85), use3d: false }); draw()
    } catch { alert("This picture could not be opened. Try a PNG or JPEG.") }
  }
  // own 3D pet: the .glb file is kept in this browser's plugin storage
  $("pet3d").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""
    if (!f) return
    const buf = await f.arrayBuffer()
    if (new TextDecoder().decode(buf.slice(0, 4)) !== "glTF") return alert("This is not a .glb file. Export your 3D pet as binary glTF (.glb).")
    if (buf.byteLength > 15e6) return alert("This file is bigger than 15 MB. Please make it smaller (fewer details or smaller textures).")
    await new Promise((res, rej) => {
      const r = indexedDB.open("vidi-pet", 1)
      r.onupgradeneeded = () => r.result.createObjectStore("files")
      r.onsuccess = () => { const tx = r.result.transaction("files", "readwrite"); tx.objectStore("files").put(buf, "pet.glb"); tx.oncomplete = res; tx.onerror = () => rej(tx.error) }
      r.onerror = () => rej(r.error)
    })
    await save({ use3d: true, picture: null, glbAt: Date.now() }); draw()
  }

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return
    if (ch.pet) { pet = { ...DEF, ...ch.pet.newValue }; draw(); perm() }
    if (ch.petAlarms) alarms()
    if (ch.petProfile) saved()
  })
  chrome.storage.local.get("pet").then(({ pet: p }) => { pet = { ...DEF, ...(p || {}) }; draw(); perm(); alarms() })
})()
