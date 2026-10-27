// The one click that lets the plugin reach Ollama (bg.js then connects the website to it)
const OLLAMA = ["http://localhost:11434/*", "http://127.0.0.1:11434/*"]
const msg = document.getElementById("msg")
document.getElementById("go").onclick = async () => {
  const ok = await chrome.permissions.request({ origins: OLLAMA }).catch(() => false)
  if (!ok) { msg.textContent = "Not connected. Press Connect and choose Allow."; return }
  msg.className = "ok"; msg.textContent = "✓ Connected. You can close this window."
  setTimeout(() => window.close(), 1800)
}
