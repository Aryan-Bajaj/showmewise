// Pet training: every skill of the plugin's pet (Vidi, BETA), explained in
// plain words, each with a place on this page to try it. The pet itself comes
// from the plugin: it is allowed on the VideoDoc website only on this page.
// The pictures are the plugin's own drawings (extension/pet), so both match.
import { useEffect, useState } from "react"
import "../../extension/pet/pets.js"
import "../../extension/pet/pet-css.js"
import "../../extension/pet/scores.js"
import { PLUGIN_URL } from "../lib/links"
import { pluginSystem } from "../lib/computerCheck"
import { pullModel } from "../lib/ollamaSetup"
import OllamaSetup from "./OllamaSetup"
import VideoDocLogo from "./VideoDocLogo"

const C = { bg: "#0f0b24", card: "rgba(22,15,46,0.94)", line: "rgba(167,139,250,0.22)", ink: "#f1eeff", dim: "#b9b3d8", ok: "#34d399", warn: "#fbbf24", acc: "#7c5cff" }
const Card = ({ children, style, id }) => <section id={id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, ...style }}>{children}</section>
const Say = ({ children }) => <code style={{ background: "#0f0b24", border: `1px solid ${C.line}`, borderRadius: 8, padding: "2px 8px", color: "#e4ddff", fontSize: 13.5 }}>{children}</code>
const KINDS = { dragon: "Dragon", wolf: "Wolf", cat: "Cat", fox: "Fox", owl: "Owl" }

// one pet, drawn and moving like on any web page
function PetPic({ kind, colour, mood, size = 120 }) {
  const fx = { think: "...", alert: "⏰" }[mood] || ""
  return (
    <div style={{ width: size, height: size }}>
      <div className="vp" data-mood={mood} style={{ "--zx": "12px" }}>
        <span dangerouslySetInnerHTML={{ __html: window.VidiPets.svg(kind, colour) }} style={{ display: "contents" }} />
        <div className="fx">{mood === "sleep" ? <><i>z</i><i>z</i><i>Z</i></> : fx}</div>
      </div>
    </div>
  )
}

// the lessons: what it does, why it helps, what to try (and a place to try it)
const LESSONS = [
  { id: "hello", icon: "👋", title: "Say hi and give it a name",
    what: "Click your pet at the edge of the page: its chat opens. It answers like a friend, in your language (English, Hinglish, German, Spanish, French). The small browser AI often answers Hinglish in English; Ollama answers it in Hinglish.",
    why: "It greets you by name and remembers what you like, on every page.",
    tryIt: ["your name is Draco", "my name is (your name)", "I love dragons", "mujhe ek joke sunao"] },
  { id: "avatar", icon: "🎨", title: "Choose your pet",
    what: "In the plugin, under Your pet: a dragon, wolf, cat, fox or owl, each in three colours. Or “My picture” (a photo of your own pet, a drawing) or “My 3D pet” (a .glb file).",
    why: "A pet you like makes the helper feel like yours. Your own picture moves and reacts like the others. A 3D pet uses its own animations when they are named Idle, Happy, Think, Sleep or Sad.",
    tryIt: [], practice: "avatar" },
  { id: "page", icon: "📍", title: "Ask about a page, then “Show me on the page”",
    what: "Ask a question with “this page” in it. Under the answer, press 📍 Show me on the page: the buttons it means get a numbered mark beside them (never on top), for 10 seconds, and a screenshot with the marks comes into the chat.",
    why: "On a new website you find the right button at once, and the picture stays in the chat to look at again.",
    tryIt: ["How do I export a report on this page?", "then press 📍 Show me on the page"], practice: "toolbar" },
  { id: "guide", icon: "🧭", title: "Let it guide you through a tool",
    what: "Give your pet the tool's manual with 📎 (PDF, Word, HTML or text), then just ask, in your own words, how to do something. It reads the manual and the page, says where you are and gives the first step, marked on the page with a picture. Do the step yourself, press ✅ Done, next step, and so on until “All done”. When it cannot tell what you want, it asks you.",
    why: "Learn a new tool while you use it, step by step, without searching the manual. It works without a manual too, from what is on the page, but it is better with one.",
    tryIt: ["📎 the sample manual below", "how do I make a new board?", "help me with this (it asks back)", "I want to share a board"], practice: "tool",
    safe: ["It never clicks or types for you: you do every step.", "It never asks for passwords, PINs or card numbers.", "Ask something else (like a timer) and it stops guiding; Stop guiding ends it any time."] },
  { id: "same", icon: "🎯", title: "Many buttons with the same name",
    what: "Shops have “Add to cart” on every product, note apps have “Delete” next to every note. Your pet reads what is written next to each button. Say which one you mean, and it marks only that one. Do not say it, and it marks all of them with numbers and asks which one: tap your choice and only that one stays marked.",
    why: "It never guesses for you, so you never click the wrong product or delete the wrong note.",
    tryIt: ["how do I put the tea kettle in my cart?", "how do I add something to the cart? (it asks which one)"], practice: "shop" },
  { id: "form", icon: "📝", title: "Fill a form from your CV",
    what: "Give your pet your CV with 📎 (or drop it on the pet), then say “fill this page”. It shows a list of all fields first: what it found in your CV is filled in, the rest is empty for you to type. Press Fill the page: it walks from field to field, fills each one and marks it green.",
    why: "Job and sign-up forms take seconds instead of minutes. What you typed is remembered for next time (tick the box), and you always check before sending.",
    tryIt: ["📎 the sample CV below", "fill this page", "page bhar do (also works)"], practice: "form",
    safe: ["It never presses Submit: you check and send.", "Passwords, PINs, card numbers and security codes are never read, filled or saved.", "IBAN and account numbers are allowed, and only saved when you tick the box.", "“forget my saved details” or the button in the plugin clears what it saved."] },
  { id: "time", icon: "⏰", title: "Timers, alarms and reminders",
    what: "Say it like to a friend. When it is time, the pet shakes, a soft chime plays and a notification comes, with Stop and 5 more minutes.",
    why: "A small assistant right where you work, without another app.",
    tryIt: ["timer 1 minute", "remind me in 2 minutes to stretch", "alarm at 7:30", "show my timers", "cancel the timer"],
    safe: ["It rings only while the browser is open. A reminder missed while it was closed is told when the browser starts again. Do not rely on it for medicine or safety."] },
  { id: "search", icon: "🔎", title: "Search the web, with sources",
    what: "Start with “search the web for”. It reads Wikipedia and DuckDuckGo and answers with the links, so you can check. More results opens your own search engine.",
    why: "Quick facts without leaving the page, and you always see where they come from.",
    tryIt: ["search the web for the height of Mount Everest", "search the web for who invented the telephone"] },
  { id: "files", icon: "📄", title: "Ask about a file",
    what: "📎 a PDF, Word (.docx), HTML, text, Markdown, CSV or JSON file, or drop it on the pet. Then ask with “file”, “document”, “PDF” or “CV” in the question.",
    why: "Long documents answered in seconds. The file is read on your computer.",
    tryIt: ["What is in this file?", "Which university is in my CV?"] },
  { id: "ai", icon: "🧠", title: "Choose the AI",
    what: "Say “change the AI”: your pet lists the models on your computer, the cloud ones (☁) and the browser AI, with a recommendation. Once, after the first answer, it asks if you use it for confidential or work things.",
    why: "Private things stay on your computer. For other things a free cloud model (like gemma4:31b-cloud) is much stronger at reasoning, and switching is one tap.",
    tryIt: ["change the AI", "which model do you use?", "LLM badlo"],
    safe: ["A cloud model sends what you ask, and the page or file you ask about, to Ollama's servers. It is used only after you said “No, not confidential”, and those answers are marked ☁."] },
  { id: "chats", icon: "🕘", title: "New chat, earlier chats, memory",
    what: "＋ in the chat header starts a new chat; the old one is kept under 🕘 Earlier chats (the 15 newest). Your name, what you like, the file and saved form details stay for every chat.",
    why: "A fresh start for a new topic without losing anything.",
    tryIt: ["press ＋, then 🕘", "forget the file", "forget my saved details"] },
  { id: "focus", icon: "🧹", title: "Focus mode: hide the ads on a page",
    what: "Say “focus mode” or “hide the ads”: your pet hides the ads it knows on the page you are on and tells you how many. “show everything” brings them back.",
    why: "Read an article in peace, without blinking boxes, only when you want it.",
    tryIt: ["hide the ads", "ads hata do", "show everything"], practice: "ads",
    safe: ["Only on the page you ask about, only until you reload it.", "It hides the ads, it does not block them: they still load. It is not an ad blocker."] },
  { id: "move", icon: "🐾", title: "Move it, hide it, let it sleep",
    what: "By itself it sits at the edge, moves away from buttons and text, and hides half of itself when nobody needs it. Drag it anywhere: that becomes its fixed spot. After two quiet minutes it falls asleep (zzz) and wakes up happy when you come back. Too small or too big? Drag the bottom right corner of the chat to resize it; the size is kept.",
    why: "It keeps you company without ever being in the way. On a site where you do not want it, press Hide on this site.",
    tryIt: ["drag it to another spot", "make the chat bigger from its corner", "Hide on this site (in its chat)", "in the plugin: Let my pet find its own spot"] },
]

// a toolbar to practise "Show me on the page"
function Toolbar() {
  const b = { font: "inherit", padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#231a52", color: "#fff", cursor: "pointer" }
  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#0f0b24", border: `1px dashed ${C.line}` }}>
      <b style={{ display: "block", marginBottom: 8 }}>Practice: a made-up app (these buttons do nothing)</b>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={b}>New board</button><button style={b}>Share</button><button style={b}>Export report</button><input placeholder="Search boards" style={{ ...b, background: "#0f0b24", cursor: "text" }} /></div>
      <p style={{ margin: "10px 0 0", color: C.dim, fontSize: 14 }}>To make a PDF of your week, click Export report. To invite your team, click Share.</p>
    </div>
  )
}

// a made-up shop to practise buttons with the same name (nothing is sold, nothing is saved)
function PracticeShop() {
  const [cart, setCart] = useState([])
  const b = { font: "inherit", padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#231a52", color: "#fff", cursor: "pointer" }
  const items = [["Running shoes", "Light shoes for jogging"], ["Tea kettle", "Steel kettle, 1.5 litres"], ["Desk lamp", "Warm light, foldable"]]
  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#0f0b24", border: `1px dashed ${C.line}` }}>
      <b style={{ display: "block", marginBottom: 8 }}>Practice: a made-up shop (nothing is for sale)</b>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {items.map(([name, what]) => (
          <div key={name} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 10 }}>
            <b style={{ display: "block" }}>{name}</b>
            <span style={{ color: C.dim, fontSize: 13 }}>{what}</span>
            <div style={{ marginTop: 8 }}><button style={b} onClick={() => setCart([...cart, name])}>Add to cart</button></div>
          </div>
        ))}
      </div>
      <p style={{ margin: "10px 0 0", color: C.dim, fontSize: 13.5 }}>In the cart: {cart.length ? cart.join(", ") : "nothing yet"}</p>
    </div>
  )
}

// a made-up tool to practise being guided (nothing is saved anywhere)
function PracticeTool() {
  const [boards, setBoards] = useState(["Weekly plan"])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const b = { font: "inherit", padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#231a52", color: "#fff", cursor: "pointer" }
  const i = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#0f0b24", color: "#fff", font: "inherit" }
  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#0f0b24", border: `1px dashed ${C.line}` }}>
      <p style={{ margin: "0 0 8px" }}><a href="/pet-sample-manual.html" download style={{ color: "#c4b5fd" }}>⬇ Download the sample manual</a> <span style={{ color: C.dim, fontSize: 13 }}>(for the made-up Demo Planner below), then give it to your pet with 📎.</span></p>
      <b style={{ display: "block", marginBottom: 8 }}>Practice: Demo Planner, a made-up tool</b>
      {boards.map((x, k) => <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}><span style={{ flex: 1 }}>{x}</span><button style={b}>Share</button></div>)}
      {!open ? <button style={b} onClick={() => setOpen(true)}>New board</button> : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ color: C.dim, fontSize: 14 }}>Board name <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Board name" style={i} /></label>
          <label style={{ color: C.dim, fontSize: 14 }}>Colour <select style={i}><option>Blue</option><option>Green</option></select></label>
          <button style={b} onClick={() => { if (name.trim()) { setBoards([...boards, name.trim()]); setName(""); setOpen(false) } }}>Create board</button>
        </div>
      )}
    </div>
  )
}

// a form to practise "fill this page" (nothing is sent anywhere)
function PracticeForm() {
  const [sent, setSent] = useState(null)
  const f = { display: "block", margin: "10px 0", fontSize: 14, color: C.dim }
  const i = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#0f0b24", color: "#fff", font: "inherit" }
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ margin: "0 0 8px" }}><a href="/pet-sample-cv.pdf" download style={{ color: "#c4b5fd" }}>⬇ Download the sample CV</a> <span style={{ color: C.dim, fontSize: 13 }}>(Mira Hoffmann, a made-up person), then give it to your pet with 📎.</span></p>
      <form onSubmit={(e) => { e.preventDefault(); setSent(Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, typeof v === "string" ? v : v.name]))) }}
        style={{ padding: 14, borderRadius: 12, background: "#120d2c", border: `1px dashed ${C.line}` }}>
        <b>Practice: apply for a job</b>
        <label style={f}>Full name<input name="Full name" style={i} /></label>
        <label style={f}>Email<input type="email" name="Email" style={i} /></label>
        <label style={f}>Phone<input type="tel" name="Phone" style={i} /></label>
        <label style={f}>City<input name="City" style={i} /></label>
        <label style={f}>Current job title<input name="Current job title" style={i} /></label>
        <label style={f}>University<input name="University" style={i} /></label>
        <label style={f}>Country<select name="Country" style={i}><option /><option>Germany</option><option>India</option><option>Austria</option></select></label>
        <label style={f}>IBAN (for travel costs)<input name="IBAN" style={i} /></label>
        <label style={f}>Password for your account <span style={{ color: C.warn }}>(your pet never fills this)</span><input type="password" name="Password" style={i} /></label>
        <label style={f}>Card number <span style={{ color: C.warn }}>(never filled)</span><input name="Card number" autoComplete="cc-number" style={i} /></label>
        <label style={f}>Upload your CV<input type="file" name="CV" style={i} /></label>
        <button style={{ font: "inherit", fontWeight: 600, marginTop: 6, padding: "10px 16px", borderRadius: 12, border: 0, color: "#fff", background: "linear-gradient(135deg,#6d4aff,#3f62ff)", cursor: "pointer" }}>Submit (practice: nothing is sent)</button>
      </form>
      {sent && <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", background: "#0f0b24", border: `1px solid ${C.line}`, borderRadius: 10, padding: 10, fontSize: 13 }}>{"You pressed Submit yourself (your pet never does). This would have been sent:\n" + Object.entries(sent).map(([k, v]) => `${k}: ${v || "(empty)"}`).join("\n")}</pre>}
    </div>
  )
}

// the AI choices of the intro, with how often each was right in our tests (extension/pet/scores.js)
const AIS = [
  { id: "webllm", title: "Browser AI", what: "Nothing to install. Runs inside the browser, on this computer.", note: "Slower, the weakest of the three, and it needs a lot of free memory: on a busy computer it can stop. Ollama is better then." },
  { id: "gemma3:4b", title: "Ollama on your computer (private)", what: "A free app: the AI runs on your computer, nothing leaves it.", note: "Best for private and work things." },
  { id: "gemma4:31b-cloud", title: "Ollama cloud (strongest)", what: "A free cloud model through the Ollama app, with daily limits.", note: "What you ask goes to Ollama's servers: not for private or work things." },
]
// a local backup for the cloud, small enough for this computer (total memory from the plugin)
const backupFor = (totalMB) => totalMB == null ? null : totalMB >= 15000 ? { name: "gemma3:4b", size: "3.3 GB" } : totalMB >= 7500 ? { name: "gemma3:1b", size: "0.8 GB" } : null

// "Meet your pet": a few easy questions, sent to the plugin, so the pet knows the user,
// looks the way they like and answers with the AI they chose
function PetIntro({ kind, setKind, colour, setColour }) {
  const [info, setInfo] = useState(null) // the plugin's pet, or false: no plugin
  const [f, setF] = useState({ user: "", name: "", lang: "auto", likes: "", ai: "webllm" })
  const [cloudOk, setCloudOk] = useState(false)
  const [backup, setBackup] = useState(null) // { p } while it downloads, { done } or { error }
  const [sys, setSys] = useState(null)
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ask = (type, extra = {}) => new Promise((res) => {
    const id = Math.random().toString(36).slice(2)
    const on = (e) => { if (e.detail?.id === id) { removeEventListener("videodoc:pet-info", on); clearTimeout(t); res(e.detail) } }
    const t = setTimeout(() => { removeEventListener("videodoc:pet-info", on); res(null) }, 2500)
    addEventListener("videodoc:pet-info", on)
    window.postMessage({ source: "videodoc-app", type, id, ...extra }, location.origin)
  })
  useEffect(() => {
    ask("pet-info").then((i) => {
      setInfo(i || false)
      if (i) { setF((x) => ({ ...x, user: i.user, name: i.name === "Vidi" ? "" : i.name, lang: i.lang, likes: (i.likes || []).join(", "), ai: i.model || x.ai })); if (i.kind) setKind(i.kind); if (i.colour) setColour(i.colour) }
    })
    pluginSystem().then(setSys)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    const r = await ask("pet-setup", { setup: { user: f.user, name: f.name || "Vidi", kind, colour, lang: f.lang, likes: f.likes.split(","), model: f.ai } })
    if (r) { setInfo(r); setSaved(true) }
  }
  const pct = (id) => window.VidiScore(id)
  const bk = backupFor(sys?.totalMB)
  const getBackup = async () => {
    setBackup({ p: 0 })
    try { await pullModel(bk.name, (p) => setBackup({ p })); setBackup({ done: true }) } catch (e) { setBackup({ error: e.message }) }
  }
  const inp = { font: "inherit", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line}`, background: "#0f0b24", color: "#fff", width: "100%", boxSizing: "border-box" }
  const lab = { display: "block", fontSize: 14, color: C.dim, marginTop: 10 }
  const pill = (on) => ({ font: "inherit", fontSize: 13.5, cursor: "pointer", borderRadius: 999, padding: "6px 12px", border: `1px solid ${on ? C.acc : C.line}`, background: on ? "#2b2063" : "transparent", color: "#fff" })
  const colours = Object.keys(window.VidiPets.colours[kind])
  const canSave = info && (f.ai !== "gemma4:31b-cloud" || cloudOk)
  return (
    <Card id="intro" style={{ borderColor: "rgba(124,92,255,.6)" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>👋 Meet your pet</h2>
      <p style={{ margin: 0, color: C.dim, lineHeight: 1.5 }}>A few easy questions, then your pet knows you, looks the way you like and uses the AI you chose. You can change everything later.</p>
      {info === false && <p style={{ margin: "10px 0 0", padding: "8px 12px", borderRadius: 10, background: "rgba(251,191,36,.1)", color: "#fde68a", fontSize: 14 }}>The VideoDoc plugin was not found in this browser. {PLUGIN_URL ? <a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ color: "#c4b5fd" }}>Add it to Chrome or Edge</a> : "Add it to Chrome or Edge"}, then reload this page.</p>}
      {info && !info.allowed && <p style={{ margin: "10px 0 0", padding: "8px 12px", borderRadius: 10, background: "rgba(251,191,36,.1)", color: "#fde68a", fontSize: 14 }}>One more thing: open the plugin (the VideoDoc icon in the toolbar), then Your pet, and tick <b>Show my pet on web pages</b>. It asks for your OK once.</p>}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 6 }}>
        <div style={{ flex: "0 0 auto", margin: "10px auto 0" }}><PetPic kind={kind} colour={colour} mood={saved ? "happy" : "idle"} size={130} /></div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <label style={lab}>1. What is your name?<input style={inp} value={f.user} onChange={set("user")} maxLength={20} placeholder="Your first name" autoComplete="given-name" /></label>
          <span style={lab}>2. Pick your pet and its colour</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>{Object.entries(KINDS).map(([k, n]) => <button key={k} type="button" style={pill(k === kind)} onClick={() => { setKind(k); setColour("") }}>{n}</button>)}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{colours.map((c) => <button key={c} type="button" style={pill(c === (colour || colours[0]))} onClick={() => setColour(c)}>{c}</button>)}</div>
          <label style={lab}>3. Give your pet a name<input style={inp} value={f.name} onChange={set("name")} maxLength={20} placeholder="Vidi" /></label>
          <label style={lab}>4. Which language should it speak?
            <select style={inp} value={f.lang} onChange={set("lang")}>{Object.entries({ auto: "Like my browser", en: "English", de: "Deutsch", hi: "Hinglish", es: "Español", fr: "Français" }).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
          </label>
          <label style={lab}>5. What do you like? <span style={{ fontSize: 12.5 }}>(optional, with commas)</span><input style={inp} value={f.likes} onChange={set("likes")} maxLength={200} placeholder="football, cooking, dragons" /></label>
        </div>
      </div>
      <span style={{ ...lab, marginTop: 14 }}>6. Which AI should answer? <span style={{ fontSize: 12.5 }}>(✓ % = right answers in our own tests: chat, guiding and forms. Yours can differ.)</span></span>
      <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
        {AIS.map((a) => {
          const s = window.VidiScores[a.id] || {}
          return (
            <label key={a.id} style={{ display: "flex", gap: 10, padding: 12, borderRadius: 12, cursor: "pointer", border: `1px solid ${f.ai === a.id ? C.acc : C.line}`, background: f.ai === a.id ? "#221a4f" : "transparent" }}>
              <input type="radio" name="ai" checked={f.ai === a.id} onChange={() => setF({ ...f, ai: a.id })} />
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>
                <b>{a.title}</b> {pct(a.id) != null ? <span style={{ color: C.ok }}>✓ {pct(a.id)}% in tests</span> : <span style={{ color: C.dim }}>(not fully tested yet)</span>}
                <span style={{ display: "block", color: C.dim }}>{a.what} {s.speed ? `Speed: ${s.speed}.` : ""} {a.note}</span>
              </span>
            </label>
          )
        })}
      </div>
      {f.ai === "gemma3:4b" && <OllamaSetup />}
      {f.ai === "gemma4:31b-cloud" && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid rgba(251,191,36,.45)", background: "rgba(251,191,36,.08)", fontSize: 14, lineHeight: 1.55 }}>
          <b style={{ color: "#fde68a" }}>Before you choose the cloud</b>
          <p style={{ margin: "4px 0 0" }}>The cloud model runs on Ollama's servers. What you ask, and the page or file you ask about, goes there. Do not use it for private or work things. It needs internet, and free use has daily limits.</p>
          <label style={{ display: "block", marginTop: 8, cursor: "pointer" }}><input type="checkbox" checked={cloudOk} onChange={(e) => setCloudOk(e.target.checked)} /> I understand</label>
          <p style={{ margin: "8px 0 0" }}>It needs the Ollama app (below), then once in a terminal: <Say>ollama signin</Say> and <Say>ollama pull gemma4:31b-cloud</Say></p>
          <OllamaSetup />
          <p style={{ margin: "10px 0 0" }}><b>A local backup</b>, for when you are offline, the free limit is used up, or for private things:{" "}
            {bk ? <>{bk.name} ({bk.size}) fits this computer{sys?.totalMB ? ` (${Math.round(sys.totalMB / 1024)} GB memory)` : ""}.</> : sys ? <>this computer has little memory, so no local model: the browser AI is the backup.</> : <>the plugin checks this computer's memory first.</>}</p>
          {bk && !backup && <button type="button" onClick={getBackup} style={{ ...pill(true), marginTop: 6 }}>⬇ Get the backup ({bk.size})</button>}
          {backup?.p != null && <p style={{ margin: "6px 0 0" }}>Downloading the backup... {Math.round(backup.p * 100)}%</p>}
          {backup?.done && <p style={{ margin: "6px 0 0", color: C.ok }}>✓ The backup is ready.</p>}
          {backup?.error && <p style={{ margin: "6px 0 0", color: "#fca5a5" }}>{backup.error}</p>}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" disabled={!canSave} onClick={save} style={{ font: "inherit", fontWeight: 700, padding: "10px 18px", borderRadius: 12, border: 0, cursor: canSave ? "pointer" : "default", opacity: canSave ? 1 : 0.45, background: "linear-gradient(90deg,#7c5cff,#22d3ee)", color: "#fff" }}>Set up my pet</button>
        {saved && <span style={{ color: C.ok }}>✓ Done! Your pet is at the right edge of the page: click it to say hi.</span>}
      </div>
    </Card>
  )
}

export default function PetTraining() {
  const [kind, setKind] = useState("dragon")
  const [colour, setColour] = useState("")
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem("vd-pet-training") || "[]") } catch { return [] } })
  useEffect(() => { try { localStorage.setItem("vd-pet-training", JSON.stringify(done)) } catch { /* private window */ } }, [done])
  useEffect(() => { document.title = "Pet training · VideoDoc" }, [])
  const toggle = (id) => setDone((d) => d.includes(id) ? d.filter((x) => x !== id) : [...d, id])
  const pill = (on) => ({ font: "inherit", fontSize: 13.5, cursor: "pointer", borderRadius: 999, padding: "6px 12px", border: `1px solid ${on ? C.acc : C.line}`, background: on ? "#2b2063" : "transparent", color: "#fff" })

  return (
    <div style={{ minHeight: "100vh", position: "relative", background: C.bg, color: C.ink, fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif" }}>
      <style>{window.VidiPetCSS}</style>
      {/* the same calm background and top bar as the rest of the website */}
      <div className="app-bg" />
      <div style={{ position: "relative", zIndex: 1 }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(15,11,36,0.92)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href="/#/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: C.ink, fontWeight: 700 }}><VideoDocLogo size={26} /> VideoDoc</a>
          <span style={{ color: C.dim, fontSize: 13 }}>· Pet training</span>
          <a href="/#/app" style={{ marginLeft: "auto", color: "#fff", fontSize: 13, textDecoration: "none", padding: "7px 14px", borderRadius: 10, background: "linear-gradient(135deg,#6d4aff,#3f62ff)" }}>Open the app</a>
        </div>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, padding: "32px 16px 80px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.8rem,5vw,2.4rem)" }}>Pet training <span style={{ fontSize: 14, color: C.dim, fontWeight: 400 }}>BETA</span></h1>
        <p style={{ margin: 0, color: C.dim, lineHeight: 1.6 }}>Your pet is a small helper from the VideoDoc browser plugin. It lives at the edge of your web pages, chats with you, explains pages, fills forms, sets timers and searches the web. Learn each skill here and try it right on this page, in any order.</p>

        <p style={{ margin: 0, padding: "10px 14px", borderRadius: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.4)", color: "#fde68a", fontSize: 14, lineHeight: 1.5 }}>
          Everything to practise on this page is made up: the sample CV (Mira Hoffmann is not a real person), the form, the toolbar and the ads. Nothing you type here is sent anywhere.
        </p>
        <PetIntro kind={kind} setKind={setKind} colour={colour} setColour={setColour} />

        <Card>
          <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>Before you start</h2>
          <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.9, listStyle: "decimal" }}>
            <li>{PLUGIN_URL ? <a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ color: "#c4b5fd" }}>Add the VideoDoc plugin to Chrome or Edge</a> : "Add the VideoDoc plugin to Chrome or Edge (the store link comes here soon)."}</li>
            <li>Open the plugin (the VideoDoc icon in the toolbar), then Your pet, and tick <b>Show my pet on web pages</b>. It asks for your OK once.</li>
            <li>Come back to this page: your pet waits at the right edge. Click it to start.</li>
          </ol>
          <p style={{ margin: "10px 0 0", color: C.dim, fontSize: 13.5 }}>On the rest of the VideoDoc website the pet stays away, because VideoDoc has its own Vidi there. This page is its training ground.</p>
        </Card>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,.08)", borderRadius: 9, overflow: "hidden" }}><div style={{ width: `${(done.length / LESSONS.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#7c5cff,#22d3ee)", transition: "width .4s" }} /></div>
          <b style={{ fontSize: 14 }}>{done.length} of {LESSONS.length} learned</b>
        </div>
        <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{LESSONS.map((l) => <a key={l.id} href={`#/pet-training`} onClick={(e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" }) }} style={{ ...pill(done.includes(l.id)), textDecoration: "none" }}>{l.icon} {l.title.split(",")[0]}</a>)}</nav>

        {LESSONS.map((l, n) => (
          <Card key={l.id} id={l.id} style={{ borderColor: done.includes(l.id) ? "rgba(52,211,153,.45)" : C.line }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>{l.icon} {n + 1}. {l.title}</h2>
              <label style={{ fontSize: 13.5, color: done.includes(l.id) ? C.ok : C.dim, cursor: "pointer", whiteSpace: "nowrap" }}><input type="checkbox" checked={done.includes(l.id)} onChange={() => toggle(l.id)} /> I tried it</label>
            </div>
            <p style={{ margin: "10px 0 0", lineHeight: 1.6 }}>{l.what}</p>
            <p style={{ margin: "8px 0 0", lineHeight: 1.6, color: C.dim }}><b style={{ color: C.ok }}>Why it helps:</b> {l.why}</p>
            {l.tryIt.length > 0 && <p style={{ margin: "10px 0 0", lineHeight: 2.1 }}><b>Try:</b> {l.tryIt.map((t) => <span key={t} style={{ marginRight: 6 }}><Say>{t}</Say></span>)}</p>}
            {l.practice === "toolbar" && <Toolbar />}
            {l.practice === "tool" && <PracticeTool />}
            {l.practice === "shop" && <PracticeShop />}
            {l.practice === "form" && <PracticeForm />}
            {l.practice === "ads" && (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#0f0b24", border: `1px dashed ${C.line}`, fontSize: 14, lineHeight: 1.6 }}>
                <b>Practice: a news page with ads</b>
                <ins className="adsbygoogle" style={{ display: "block", margin: "10px 0", padding: 12, borderRadius: 8, background: "#5b4a12", color: "#fde68a" }}>Ad (made up for practice): Buy shoes now!</ins>
                <p style={{ margin: 0 }}>The city opens a new library on Monday, with a reading garden.</p>
                <div aria-label="Advertisement" style={{ margin: "10px 0", padding: 12, borderRadius: 8, background: "#5b4a12", color: "#fde68a" }}>Ad (made up for practice): Cheap flights!</div>
                <p style={{ margin: 0 }}>It is open every day from 9 to 20.</p>
              </div>
            )}
            {l.practice === "avatar" && <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{Object.keys(KINDS).map((k) => <PetPic key={k} kind={k} mood="idle" size={64} />)}</div>}
            {l.safe && <ul style={{ margin: "10px 0 0", paddingLeft: 20, color: C.warn, fontSize: 14, lineHeight: 1.7, listStyle: "disc" }}>{l.safe.map((s) => <li key={s}>{s}</li>)}</ul>}
          </Card>
        ))}

        <Card>
          <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>Privacy and limits</h2>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: C.dim, listStyle: "disc" }}>
            <li>The chat, your name, what you like, the file and saved form details stay in this browser. Nothing is sent to us.</li>
            <li>Web search sends only your search words to Wikipedia and DuckDuckGo. A cloud AI (only if you chose it) sends your question to Ollama.</li>
            <li>Your pet is a test feature (BETA). Its answers can be wrong: check important things.</li>
            <li>It cannot open apps, send messages or press buttons for you, and it never presses Submit.</li>
            <li>Robot checks (“I'm not a robot”, picture puzzles) are yours to do: your pet tells you when it sees one, and never tries to get around it.</li>
          </ul>
          <p style={{ margin: "10px 0 0" }}><a href="/#/policy" style={{ color: "#c4b5fd" }}>Privacy policy</a> · <a href="/#/howto" style={{ color: "#c4b5fd" }}>How to use VideoDoc</a></p>
        </Card>
      </div>
      </div>
    </div>
  )
}
