import { useEffect, useState } from "react"
import { post } from "../lib/bridge"
import { useLocation } from "react-router-dom"

// 🟢 Online / ⚪ Offline in a corner, and a note when the AI switched by itself
// (a cloud model with no internet or no free amount left: the AI on this computer answered)
export default function NetStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [note, setNote] = useState("")
  const home = useLocation().pathname === "/"
  // small screens have no free corner (the badge sat on text at phone width), and the AI needs a computer anyway
  const [wide, setWide] = useState(() => matchMedia("(min-width: 700px)").matches)
  useEffect(() => { const q = matchMedia("(min-width: 700px)"), on = () => setWide(q.matches); q.addEventListener("change", on); return () => q.removeEventListener("change", on) }, [])
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    let t
    const sw = (e) => {
      const { to, why } = e.detail || {}
      setNote(why === "limit" ? `The free cloud amount is used up for now, so the AI on your computer (${to}) answers. Nothing leaves your computer.` : `You are offline, so the AI on your computer (${to}) answers. Back online, the cloud model answers again.`)
      clearTimeout(t); t = setTimeout(() => setNote(""), 10000)
      post("ai-switch", { to, why }) // the pet says it too (plugin 1.1)
    }
    addEventListener("online", on); addEventListener("offline", off); addEventListener("showmewise:ai-switch", sw)
    return () => { removeEventListener("online", on); removeEventListener("offline", off); removeEventListener("showmewise:ai-switch", sw); clearTimeout(t) }
  }, [])
  return <>
    {wide && <div role="status" title={online ? "Connected to the internet" : "No internet: the website still works from this computer"}
      // the bottom left corner, clicks go through it: it must never cover a button (it covered "New video" at the
      // top right) or text (bottom centre it sat on page text); on the home page above the plugin button there
      style={{ position: "fixed", bottom: home ? 62 : 8, left: 8, pointerEvents: "none", zIndex: 60, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "rgba(15,11,36,.85)", color: online ? "#6ee7b7" : "#d4d4d8", border: "1px solid rgba(255,255,255,.15)" }}>
      {online ? "🟢 Online" : "⚪ Offline"}
    </div>}
    {note && <div role="alert" style={{ position: "fixed", bottom: 44, left: "50%", transform: "translateX(-50%)", zIndex: 60, maxWidth: "min(560px, calc(100vw - 32px))", padding: "10px 16px", borderRadius: 12, background: "#1b1342", color: "#ece9ff", border: "1px solid #7c5cff", fontSize: 14 }}>{note}</div>}
  </>
}
