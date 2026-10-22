// Pick up where it stopped. A long run (an hour or more on a laptop) can be
// cut short by a crash, a closed tab or the computer going to sleep. The work
// done so far is kept in this browser (IndexedDB, never uploaded): the
// transcript and screen text, and every part already written. The same video
// with the same settings then continues instead of starting over.
const DB = "videodoc-resume", STORE = "runs"

const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE)
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})

const tx = async (mode, fn) => {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const out = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); res(out?.result) }
    t.onerror = () => { db.close(); rej(t.error) }
  })
}

// one video + the settings that change its transcript
export const runKey = (file, opts = {}) => [file?.name, file?.size, file?.lastModified, opts.language || "en", opts.accurate ? "acc" : "fast"].join("|")

export async function loadRun(key) {
  try { return (await tx("readonly", (s) => s.get(key))) || null } catch { return null }
}

// merge a patch into the saved run; only the latest video is kept
export async function saveRun(key, patch) {
  try {
    const old = (await loadRun(key)) || {}
    await tx("readwrite", (s) => { s.clear(); s.put({ ...old, ...patch, at: Date.now() }, key) })
  } catch { /* private window or full storage: the run simply cannot resume */ }
}
