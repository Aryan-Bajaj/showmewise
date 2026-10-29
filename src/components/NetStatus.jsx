import { useEffect, useState } from "react"
import { post } from "../lib/bridge"

// 🟢 Online / ⚪ Offline, a small badge each page puts in its top bar
// (hidden on phones: no room there, and the AI needs a computer anyway)
export function OnlineBadge() {
  const [online, setOnline] = useState(navigator.onLine)
  const [wide, setWide] = useState(() => matchMedia("(min-width: 700px)").matches)
  useEffect(() => {
    const q = matchMedia("(min-width: 700px)"), size = () => setWide(q.matches)
    const on = () => setOnline(true), off = () => setOnline(false)
    q.addEventListener("change", size); addEventListener("online", on); addEventListener("offline", off)
    return () => { q.removeEventListener("change", size); removeEventListener("online", on); removeEventListener("offline", off) }
  }, [])
  if (!wide) return null
  return <span role="status" title={online ? "Connected to the internet" : "No internet: the website still works from this computer"}
    style={{ display: "inline-block", whiteSpace: "nowrap", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, lineHeight: 1.5, background: "rgba(15,11,36,.6)", color: online ? "#6ee7b7" : "#d4d4d8", border: "1px solid rgba(255,255,255,.15)" }}>
    {online ? "🟢 Online" : "⚪ Offline"}
  </span>
}

// a note when the AI switched by itself
// (a cloud model with no internet or no free amount left: the AI on this computer answered)
export default function NetStatus() {
  const [note, setNote] = useState("")
  useEffect(() => {
    let t
    const sw = (e) => {
      const { to, why } = e.detail || {}
      setNote(why === "limit" ? `The free cloud amount is used up for now, so the AI on your computer (${to}) answers. Nothing leaves your computer.` : `You are offline, so the AI on your computer (${to}) answers. Back online, the cloud model answers again.`)
      clearTimeout(t); t = setTimeout(() => setNote(""), 10000)
      post("ai-switch", { to, why }) // the pet says it too (plugin 1.1)
    }
    addEventListener("showmewise:ai-switch", sw)
    return () => { removeEventListener("showmewise:ai-switch", sw); clearTimeout(t) }
  }, [])
  return <>
    {note &&<div role="alert" style={{ position: "fixed", bottom: 44, left: "50%", transform: "translateX(-50%)", zIndex: 60, maxWidth: "min(560px, calc(100vw - 32px))", padding: "10px 16px", borderRadius: 12, background: "#1b1342", color: "#ece9ff", border: "1px solid #7c5cff", fontSize: 14 }}>{note}</div>}
  </>
}
