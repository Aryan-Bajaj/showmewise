// Getting Ollama ready for someone who has never used a terminal: is it
// installed, can this site reach it, and the first model, with a progress bar.
const BASE = "http://localhost:11434"

// "missing": nothing answers on Ollama's address. "blocked": Ollama runs, but it
// does not allow this website yet (the browser hides its answer; a "no-cors"
// request still gets through, so we know it is there). "ok": ready, with its models.
export async function ollamaState() {
  try {
    const r = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(2500) })
    if (r.ok) return { state: "ok", models: ((await r.json()).models || []).map((m) => m.name) }
  } catch { /* not reachable this way: checked below */ }
  try {
    await fetch(`${BASE}/api/tags`, { mode: "no-cors", signal: AbortSignal.timeout(2500) })
    return { state: "blocked", models: [] }
  } catch { return { state: "missing", models: [] } }
}

// the official download page for this computer
export function downloadFor(ua = navigator.userAgent) {
  if (/Windows/i.test(ua)) return { os: "Windows", url: "https://ollama.com/download/windows" }
  if (/Mac OS X|Macintosh/i.test(ua)) return { os: "Mac", url: "https://ollama.com/download/mac" }
  return { os: "Linux", url: "https://ollama.com/download/linux", command: "curl -fsSL https://ollama.com/install.sh | sh" }
}

// the first model: the quick one, it reads screens and runs on most laptops
// (a website cannot see more than 8 GB of memory, so the bigger one stays a later choice)
export const FIRST_MODEL = { name: "gemma3:4b", size: "3.3 GB" }

// downloads a model through Ollama, telling the progress (0 to 1); throws in plain words
export async function pullModel(name, onProgress) {
  const res = await fetch(`${BASE}/api/pull`, { method: "POST", body: JSON.stringify({ model: name, stream: true }) })
  if (!res.ok || !res.body) throw new Error("Ollama did not start the download. Check your internet and try again.")
  const reader = res.body.getReader(), dec = new TextDecoder()
  let buf = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split("\n"); buf = lines.pop()
    for (const l of lines) {
      if (!l.trim()) continue
      let j; try { j = JSON.parse(l) } catch { continue }
      if (j.error) throw new Error(/space|disk/i.test(j.error) ? "There is not enough free disk space for this model." : "The download stopped. Check your internet and try again.")
      if (j.total) onProgress?.(j.completed / j.total, j.status)
      if (j.status === "success") { onProgress?.(1, "success"); return }
    }
  }
  throw new Error("The download stopped. Check your internet and try again.")
}
