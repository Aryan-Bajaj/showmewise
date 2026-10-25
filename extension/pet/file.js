// The file the user gave the pet (kept in this browser only), shown so the user can check it:
// a PDF in the browser's viewer, text as text, HTML in a frame that runs no scripts, Word as a download.
;(async () => {
  const $ = (id) => document.getElementById(id)
  const view = $("view")
  const say = (t) => { view.textContent = ""; view.append(Object.assign(document.createElement("p"), { className: "msg", textContent: t })) }
  const doc = await new Promise((res) => {
    const r = indexedDB.open("vidi-pet", 1)
    r.onupgradeneeded = () => r.result.createObjectStore("files")
    r.onsuccess = () => { const g = r.result.transaction("files").objectStore("files").get("doc"); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null) }
    r.onerror = () => res(null)
  })
  if (!doc) return say("Your pet has no file from you now. Give it one with 📎 in its chat.")
  const name = String(doc.name || "file")
  document.title = `${name} · Vidi`
  $("name").textContent = name
  $("when").textContent = `given on ${new Date(doc.at || Date.now()).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · ${Math.max(1, Math.round((doc.size || 0) / 1024))} KB · only in this browser`
  const bytes = Uint8Array.from(atob(doc.data || ""), (c) => c.charCodeAt(0))
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase()
  const TYPES = { pdf: "application/pdf", html: "text/html", htm: "text/html", txt: "text/plain", md: "text/plain", csv: "text/plain", json: "text/plain", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  const url = URL.createObjectURL(new Blob([bytes], { type: TYPES[ext] || "application/octet-stream" }))
  const dl = $("dl"); dl.href = url; dl.download = name; dl.hidden = false
  const forget = $("forget"); forget.hidden = false
  forget.onclick = async () => {
    if (!confirm(`Forget ${name}? Your pet will not have it any more.`)) return
    await new Promise((res) => { const r = indexedDB.open("vidi-pet", 1); r.onsuccess = () => { const tx = r.result.transaction("files", "readwrite"); tx.objectStore("files").delete("doc"); tx.oncomplete = res; tx.onerror = res } })
    await chrome.storage.local.set({ petHasDoc: false })
    dl.hidden = forget.hidden = true; say("Forgotten. Your pet no longer has this file.")
  }
  view.textContent = ""
  if (ext === "pdf") view.append(Object.assign(document.createElement("iframe"), { src: url, title: name }))
  else if (ext === "html" || ext === "htm") {
    // a web page from somewhere: shown without running any of its scripts or forms
    const f = Object.assign(document.createElement("iframe"), { title: name }); f.setAttribute("sandbox", ""); f.srcdoc = new TextDecoder().decode(bytes); view.append(f)
  } else if (/^(txt|md|csv|json)$/.test(ext)) view.append(Object.assign(document.createElement("pre"), { textContent: new TextDecoder().decode(bytes) }))
  else say(`${name} cannot be shown here (a Word file). Press ⬇ Download to open it in Word.`)
})()
