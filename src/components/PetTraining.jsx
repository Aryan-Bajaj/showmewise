// Pet training: every skill of the plugin's pet (Vidi, BETA), explained in
// plain words, each with a place on this page to try it. The pet itself comes
// from the plugin: it is allowed on the ShowMeWise website only on this page.
// The pictures are the plugin's own drawings (extension/pet), so both match.
import { useEffect, useRef, useState } from "react"
import "../../extension/pet/pets.js"
import "../../extension/pet/pet-css.js"
import "../../extension/pet/scores.js"
import { PLUGIN_URL } from "../lib/links"
import { pluginSystem } from "../lib/computerCheck"
import { pullModel, ollamaState } from "../lib/ollamaSetup"
import { callOllama } from "../lib/llm"
import OllamaSetup from "./OllamaSetup"
import ShowMeWiseLogo from "./ShowMeWiseLogo"

const C = { bg: "#0f0b24", card: "rgba(22,15,46,0.94)", line: "rgba(167,139,250,0.22)", ink: "#f1eeff", dim: "#b9b3d8", ok: "#34d399", warn: "#fbbf24", acc: "#7c5cff" }
const Card = ({ children, style, id }) => <section id={id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, ...style }}>{children}</section>
const Say = ({ children }) => <code style={{ background: "#0f0b24", border: `1px solid ${C.line}`, borderRadius: 8, padding: "2px 8px", color: "#e4ddff", fontSize: 13.5 }}>{children}</code>
const KINDS = { dragon: "Dragon", wolf: "Wolf", cat: "Cat", fox: "Fox", owl: "Owl" }
const isCloudName = (n) => /cloud/i.test(n || "")

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
export const LESSONS = [
  { id: "hello", icon: "👋", title: "Say hi and give it a name",
    what: "Click your pet at the edge of the page: its chat opens. It answers like a friend, in your language (English, Hinglish, German, Spanish, French).",
    why: "It greets you by name and remembers what you like, on every page. Not sure what to ask? “what can you do?” gives a short list of its skills and a button back to this training.",
    tryIt: ["your name is Draco", "my name is (your name)", "I love dragons", "mujhe ek joke sunao", "what can you do?"] },
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
    what: "Give your pet your CV with 📎 (or drop it on the pet), then say “fill this page”. It first says which CV it uses and when you gave it (📄 Open it to check; an old one? give the new one with 📎). Then it shows a list of all fields: what it found in your CV is filled in, the rest is empty for you to type. Press Fill the page: it walks from field to field, fills each one and marks it green.",
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
    what: "Say “change the AI”: your pet lists the AIs in two groups, 💻 Offline (on your computer) and ☁ Online (Ollama's cloud), with a recommendation. Once, after the first answer, it asks if you use it for confidential or work things.",
    why: "Private things stay on your computer. For other things a free cloud model (like gemma4:31b-cloud) is much stronger at reasoning, and switching is one tap.",
    tryIt: ["change the AI", "which model do you use?", "LLM badlo"],
    safe: ["A cloud model sends what you ask, and the page or file you ask about, to Ollama's servers. It is used only after you said “No, not confidential”, and those answers are marked ☁."] },
  { id: "chats", icon: "🕘", title: "New chat, earlier chats, memory",
    what: "＋ in the chat header starts a new chat; the old one is kept under 🕘 Earlier chats (the 15 newest). Your name, what you like, the file and saved form details stay for every chat, also after the browser or computer restarts. Ask “what do you know about me?” to see all of it, and “show my CV” to see the file it has, with 📄 Open to look at it.",
    why: "A fresh start for a new topic without losing anything, and you always know what it keeps.",
    tryIt: ["press ＋, then 🕘", "what do you know about me?", "show my CV", "forget the file", "forget my saved details"] },
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

// Each lesson as its own small course: a one-line summary for its card, the files to download, and a
// short walkthrough (what to do, and the words to type where there are any)
// What the page shows in a lesson: one short line on what it does, one on why. (The long texts above stay
// as the pet's own knowledge, so it can still answer the details when asked.)
const SIMPLE = {
  hello: ["Click your pet to chat. It answers in your language.", "It knows your name and what you like."],
  avatar: ["Pick a dragon, wolf, cat, fox or owl, a colour, or your own picture.", "A pet you like feels like yours."],
  page: ["Ask about the page, then press 📍 Show me: the button gets marked.", "Find the right button on any website at once."],
  guide: ["Give it a manual, ask how to do something, follow one step at a time.", "Learn a new tool while you use it."],
  same: ["Say which product you mean, and only its button gets marked.", "You never click the wrong one."],
  form: ["Give it your CV, say “fill this page”, check the list, press Fill.", "Forms done in seconds. You still press Submit."],
  time: ["Say “timer 5 minutes” or “remind me at 5 to call mum”.", "No extra app: it rings right where you work."],
  search: ["Say “search the web for …”: a short answer with links.", "Quick facts, and you see where they come from."],
  files: ["Give it a file with 📎, then ask about it.", "Long files answered in seconds, on your computer."],
  ai: ["Say “change the AI” and tap one. ✅ means it runs well here.", "Private on your computer, or stronger in the cloud."],
  chats: ["＋ starts a new chat. Ask “what do you know about me?”", "You always see what it remembers, and can delete it."],
  focus: ["Say “hide the ads”. “show everything” brings them back.", "Read in peace, only when you want."],
  move: ["Drag it anywhere. Drag the chat's corner to resize it.", "Always there, never in the way."],
}

// the card pictures: a soft background each, and the pet's mood that fits the lesson
const ART = ["linear-gradient(135deg,#3b2a8f,#6d4aff)", "linear-gradient(135deg,#0e5a6b,#22d3ee)", "linear-gradient(135deg,#7a2e5c,#ec4899)", "linear-gradient(135deg,#1f5f3a,#34d399)",
  "linear-gradient(135deg,#7a4b12,#fbbf24)", "linear-gradient(135deg,#2a3f8f,#60a5fa)", "linear-gradient(135deg,#5b2a8f,#c084fc)"]
const MOOD = { hello: "happy", avatar: "happy", page: "think", guide: "think", same: "think", form: "happy", time: "alert", search: "think", files: "think", ai: "think", chats: "happy", focus: "idle", move: "sleep" }
const MANUAL = { href: "/pet-sample-manual.html", label: "Sample manual (Demo Planner, made up)" }
const CV = { href: "/pet-sample-cv.pdf", label: "Sample CV (Mira Hoffmann, made up)" }
export const COURSE = {
  hello: { short: "Open the chat, give your pet a name and tell it yours.", min: 2, walk: [
    { do: "Click your pet at the right edge of this page: its chat opens." },
    { do: "Give it a name.", say: ["your name is Draco"] },
    { do: "Tell it your name and something you like.", say: ["my name is (your name)", "I love dragons"] },
    { do: "Ask for a joke in Hinglish, or ask what it can do.", say: ["mujhe ek joke sunao", "what can you do?"] }] },
  avatar: { short: "A dragon, wolf, cat, fox or owl in three colours, or your own picture.", min: 1, walk: [
    { do: "Open the plugin (the ShowMeWise icon in the toolbar), then Your pet." },
    { do: "Pick a pet and a colour: the pet on this page changes at once." },
    { do: "Or press My picture and choose a photo of your own pet." }] },
  page: { short: "Ask about the page you are on and see the right button marked.", min: 2, walk: [
    { do: "Look at the made-up toolbar below." },
    { do: "Ask your pet:", say: ["How do I export a report on this page?"] },
    { do: "Press 📍 Show me on the page under the answer: Export report gets a numbered mark beside it." }] },
  guide: { short: "Give it a tool's manual and it guides you one step at a time.", min: 4, files: [MANUAL], walk: [
    { do: "Download the sample manual above." },
    { do: "Give it to your pet: press 📎 in its chat and choose the file (or drop the file on the pet)." },
    { do: "Ask in your own words:", say: ["how do I make a new board?"] },
    { do: "Do the step yourself in the Demo Planner below, then press ✅ Done, next step. Repeat until “All done”." },
    { do: "Try a vague request: it asks back what you mean.", say: ["help me with this (it asks back)", "I want to share a board"] }] },
  same: { short: "Many “Add to cart” buttons: it marks the one you mean.", min: 2, walk: [
    { do: "Look at the made-up shop below: every product has its own Add to cart." },
    { do: "Name the product:", say: ["how do I put the tea kettle in my cart?"] },
    { do: "Now do not name one: it marks all of them and asks which. Tap your choice.", say: ["how do I add something to the cart? (it asks which one)"] }] },
  form: { short: "Give it your CV and it fills a form for you to check.", min: 4, files: [CV], walk: [
    { do: "Download the sample CV above and give it to your pet with 📎." },
    { do: "Scroll to the practice form below and say:", say: ["fill this page", "page bhar do (also works)"] },
    { do: "It says which CV it uses and lists every field. Check the list, type what is missing." },
    { do: "Press Fill the page: it fills each field and marks it green. You press Submit yourself, or not at all." }] },
  time: { short: "Timers, alarms and reminders, said like to a friend.", min: 2, walk: [
    { do: "Set a short timer and a reminder:", say: ["timer 1 minute", "remind me in 2 minutes to stretch"] },
    { do: "Set an alarm and look at everything you set:", say: ["alarm at 7:30", "show my timers"] },
    { do: "Cancel what you do not need:", say: ["cancel the timer"] }] },
  search: { short: "Quick facts from the web, always with the links.", min: 1, walk: [
    { do: "Start with “search the web for”:", say: ["search the web for the height of Mount Everest", "search the web for who invented the telephone"] },
    { do: "Open a link under the answer to check it, or press More results." }] },
  files: { short: "Ask questions about a PDF, Word or text file.", min: 2, files: [CV], walk: [
    { do: "Give your pet a file with 📎 (the sample CV works)." },
    { do: "Ask about it, with “file”, “document” or “CV” in the question:", say: ["What is in this file?", "Which university is in my CV?"] }] },
  ai: { short: "Pick the AI it answers with: private on your computer, or stronger in the cloud.", min: 1, walk: [
    { do: "Ask for the list:", say: ["change the AI", "which model do you use?", "LLM badlo"] },
    { do: "Tap a model in the list. For private or work things, keep one marked “on your computer”." }] },
  chats: { short: "New chats, earlier chats, and everything it remembers about you.", min: 2, walk: [
    { do: "Press ＋ in the chat header for a new chat, then 🕘 to see the earlier ones.", say: ["press ＋, then 🕘"] },
    { do: "See what it keeps, and the file it has (📄 Open shows it):", say: ["what do you know about me?", "show my CV"] },
    { do: "Remove what you do not want it to keep:", say: ["forget the file", "forget my saved details"] }] },
  focus: { short: "Hide the ads on a page while you read.", min: 1, walk: [
    { do: "Look at the made-up news page below, with two ads." },
    { do: "Say:", say: ["hide the ads", "ads hata do"] },
    { do: "Bring them back:", say: ["show everything"] }] },
  move: { short: "Drag it anywhere, resize the chat, hide it on a site.", min: 2, walk: [
    { do: "Drag the pet to another spot: it stays there.", say: ["drag it to another spot"] },
    { do: "Drag the bottom right corner of the open chat to make it bigger.", say: ["make the chat bigger from its corner"] },
    { do: "Press Hide on this site in its chat (bring it back from the plugin).", say: ["Hide on this site (in its chat)", "in the plugin: Let my pet find its own spot"] }] },
}

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
  // (no browser AI: it froze this laptop's graphics once; the pet runs on Ollama only)
  { id: "gemma3:4b", title: "Ollama on your computer (private)", what: "A free app: the AI runs on your computer, nothing leaves it.", note: "Best for private and work things." },
  { id: "gemma4:31b-cloud", title: "Ollama cloud (strongest)", what: "A free cloud model through the Ollama app, with daily limits.", note: "What you ask goes to Ollama's servers: not for private or work things." },
]
// a local backup for the cloud, small enough for this computer (total memory from the plugin)
const backupFor = (totalMB) => totalMB == null ? null : totalMB >= 15000 ? { name: "gemma3:4b", size: "3.3 GB" } : totalMB >= 7500 ? { name: "gemma3:1b", size: "0.8 GB" } : null

// The setup wizard: it starts by itself on this page, one easy question per screen, so the user only
// follows along. Pet, colour, name, about you, the AI (tested right here), a backup for offline use.
// Everything goes to the plugin in this browser, nowhere else.
const SETUP_KEY = "vd-pet-setup-done"
// a real Chrome picture right inside the setup step it belongs to (a marker beside each button)
const Shot = ({ n }) => {
  const [file, text] = SETUP_SHOTS[n - 1]
  return <figure style={{ margin: "10px 0 0" }}>
    <figcaption style={{ margin: "0 0 5px", fontWeight: 600, fontSize: 14 }}>{text}</figcaption>
    <img src={`/setup/${file}.png`} alt={text} loading="lazy" style={{ width: "100%", maxWidth: 560, borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", display: "block" }} />
  </figure>
}
// "Show me with pictures": real Chrome screenshots (public/setup), in the order a new user meets them
const SETUP_SHOTS = [
  ["01-add-to-chrome", "1. On the Chrome Web Store, click Add to Chrome."],
  ["02-add-extension", "2. Chrome asks: click Add extension."],
  ["03-pin", "3. Click the puzzle icon at the top right, then the pin, so ShowMeWise stays in the bar."],
  ["04-open-plugin", "4. Click the ShowMeWise icon, then open Your pet."],
  ["05-allow-pet", "5. Click Allow the pet on web pages."],
  ["06-chrome-allow", "6. Chrome asks once: click Allow."],
  ["07-pet-on-page", "7. Open any website: your pet sits at the edge. Click it to chat."],
]
function PetSetup({ kind, setKind, colour, setColour }) {
  const [info, setInfo] = useState(null) // the plugin's pet, or false: no plugin
  const [f, setF] = useState({ user: "", name: "", lang: "auto", likes: "", ai: "gemma3:4b" })
  const [step, setStep] = useState(() => { try { return localStorage.getItem(SETUP_KEY) ? -1 : 0 } catch { return 0 } }) // -1: finished
  const [cloudOk, setCloudOk] = useState(false)
  const [test, setTest] = useState(null) // { busy, msg } / { ok, msg } / { bad, msg, fix }
  const [backup, setBackup] = useState(null)
  const [sys, setSys] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ask = (type, extra = {}) => new Promise((res) => {
    const id = Math.random().toString(36).slice(2)
    const on = (e) => { if (e.detail?.id === id) { removeEventListener("showmewise:pet-info", on); clearTimeout(t); res(e.detail) } }
    const t = setTimeout(() => { removeEventListener("showmewise:pet-info", on); res(null) }, 2500)
    addEventListener("showmewise:pet-info", on)
    window.postMessage({ source: "showmewise-app", type, id, ...extra }, location.origin)
  })
  useEffect(() => {
    ask("pet-info").then((i) => {
      setInfo(i || false)
      if (i) { setF((x) => ({ ...x, user: i.user || "", name: i.name === "Vidi" ? "" : i.name, lang: i.lang || "auto", likes: (i.likes || []).join(", "), ai: i.model || x.ai })); if (i.kind) setKind(i.kind); if (i.colour) setColour(i.colour) }
    })
    pluginSystem().then(setSys)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const bk = backupFor(sys?.totalMB)
  // The offline AI: already here (for example the one just tested) is not fetched again; else it
  // downloads by itself, so the switch to it always works (offline, or the free cloud limit used up).
  // "Not now" stops it (on mobile data or a full disk).
  const pullStop = useRef(null)
  useEffect(() => {
    if (step !== 5 || !bk || backup) return
    ollamaState().then((st) => {
      if (st.models?.includes(bk.name)) setBackup({ name: bk.name, done: true })
      else if (st.state === "ok") getModel(bk.name)
    })
  }, [step, bk?.name]) // eslint-disable-line react-hooks/exhaustive-deps
  const notNow = () => { pullStop.current?.abort(); setBackup({ name: bk.name, skipped: true }) }
  // 🧪 does the chosen AI run here? a real short answer, timed (the pet runs on Ollama only)
  const runTest = async () => {
    setTest({ busy: true, msg: "Checking..." })
    const st = await ollamaState()
    if (st.state !== "ok") return setTest({ bad: true, msg: st.state === "missing" ? "Ollama is not installed or not running yet." : "Ollama runs, but does not allow this website yet.", fix: "Follow the steps below, then press Test it again." })
    // a cloud model is only a tiny file here: added by itself, no terminal
    if (!st.models.includes(f.ai) && isCloudName(f.ai)) {
      setTest({ busy: true, msg: `Adding ${f.ai}...` })
      try { await pullModel(f.ai) } catch { return setTest({ bad: true, msg: `${f.ai} could not be added.`, fix: "Check your internet and press Test it again." }) }
    } else if (!st.models.includes(f.ai)) return setTest({ bad: true, need: true, msg: `Ollama is ready, but ${f.ai} is not on this computer yet.`, fix: "Press the button below to download it." })
    const t0 = performance.now()
    try {
      const a = await callOllama("Say hello in three words.", "You are a friendly pet. Answer in at most five words.", f.ai, { maxTokens: 20 })
      const s = ((performance.now() - t0) / 1000).toFixed(1)
      setTest({ ok: true, msg: `✓ It works: “${String(a).trim().slice(0, 60)}” in ${s} s.` })
    } catch (e) {
      const m = String(e.message || e), signin = m.match(/https:\/\/ollama\.com\/\S+/)?.[0]
      if (signin) return setTest({ bad: true, signin, msg: "One more step: sign in to Ollama once (free).", fix: "Press Sign in, then Connect on the Ollama page, then Test it again." })
      setTest({ bad: true, msg: `It did not answer: ${m.slice(0, 140)}`, fix: isCloudName(f.ai) ? "Sign in once in a terminal: ollama signin. Free cloud use has daily limits." : "Try again, or choose a smaller model." })
    }
  }
  const getModel = async (name) => {
    setBackup({ name, p: 0 })
    const stop = pullStop.current = new AbortController()
    try {
      await pullModel(name, (p) => setBackup((b) => b?.skipped ? b : { name, p }), stop.signal); setBackup({ name, done: true })
      // the pet then asks once: the cloud or the AI on your computer? (plugin 1.1, pet-bg.js)
      if (name !== f.ai) window.postMessage({ source: "showmewise-app", type: "pet-backup-ready", model: name, cloud: f.ai }, location.origin)
      if (name === f.ai) runTest()
    }
    catch (e) { if (!stop.signal.aborted) setBackup({ name, error: e.message }) }
  }
  const save = async () => {
    const r = await ask("pet-setup", { setup: { user: f.user, name: f.name || "Vidi", kind, colour, lang: f.lang, likes: f.likes.split(","), model: f.ai } })
    if (r) setInfo(r)
    try { localStorage.setItem(SETUP_KEY, "1") } catch { /* private window */ }
    setStep(6)
  }
  const inp = { font: "inherit", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#0f0b24", color: "#fff", width: "100%", boxSizing: "border-box", fontSize: 15 }
  const pill = (on) => ({ font: "inherit", fontSize: 14, cursor: "pointer", borderRadius: 999, padding: "8px 14px", border: `1px solid ${on ? C.acc : C.line}`, background: on ? "#2b2063" : "transparent", color: "#fff" })
  const big = (on = true) => ({ font: "inherit", fontWeight: 700, padding: "11px 20px", borderRadius: 12, border: 0, cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.45, background: "linear-gradient(90deg,#7c5cff,#22d3ee)", color: "#fff" })
  const colours = Object.keys(window.VidiPets.colours[kind])
  const needBackup = isCloudName(f.ai)
  const STEPS = ["Welcome", "Your pet", "Its name", "About you", "Its AI", "Backup", "Done"]
  const last = needBackup ? 5 : 4

  if (step === -1) return (
    <Card id="intro" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <PetPic kind={kind} colour={colour} mood="happy" size={64} />
      <span style={{ flex: 1, lineHeight: 1.5 }}><b>{f.name || info?.name || "Vidi"}</b> is set up{f.user ? ` for ${f.user}` : ""}. Click it at the right edge to chat, or pick a lesson below.</span>
      <button type="button" style={pill(false)} onClick={() => { setStep(1); setTest(null) }}>✎ Change the setup</button>
    </Card>
  )
  return (
    <Card id="intro" style={{ borderColor: "rgba(124,92,255,.7)", padding: 22 }}>
      {/* where you are: one dot per step */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        {STEPS.map((s, k) => (k === 5 && !needBackup) ? null : <span key={s} title={s} style={{ width: k === step ? 26 : 10, height: 10, borderRadius: 9, background: k < step ? C.ok : k === step ? C.acc : "rgba(255,255,255,.15)", transition: "all .3s" }} />)}
        <span style={{ marginLeft: "auto", color: C.dim, fontSize: 13 }}>{STEPS[step]}</span>
      </div>
      {info === false && <div style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 10, background: "rgba(251,191,36,.1)", color: "#fde68a", fontSize: 14 }}>
        The ShowMeWise plugin was not found in this browser. Add it (free), then reload this page.
        {PLUGIN_URL && <div style={{ margin: "8px 0 2px" }}><a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg,#6d4aff,#3f62ff)", color: "#fff", fontWeight: 700, textDecoration: "none" }}>🧩 Add ShowMeWise to Chrome</a></div>}
        This is how it looks:
        <Shot n={1} /><Shot n={2} /><Shot n={3} />
      </div>}
      {info && !info.allowed && <div style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 10, background: "rgba(251,191,36,.1)", color: "#fde68a", fontSize: 14 }}>
        One more thing: open the plugin (the ShowMeWise icon in the toolbar), then Your pet, and tick <b>Show my pet on web pages</b>. It asks for your OK once:
        <Shot n={4} /><Shot n={5} /><Shot n={6} />
      </div>}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 auto", margin: "0 auto" }}><PetPic kind={kind} colour={colour} mood={step === 6 ? "happy" : step === 4 && test?.busy ? "think" : "idle"} size={140} /></div>
        <div style={{ flex: 1, minWidth: 250 }}>
          {step === 0 && <>
            <h2 style={{ margin: "0 0 6px", fontSize: 21 }}>👋 Let's set up your pet</h2>
            <p style={{ margin: 0, color: C.dim, lineHeight: 1.6 }}>Five quick steps, about two minutes: pick your pet, give it a name, tell it a little about you and choose its AI. Just follow along; you can change everything later.</p>
          </>}
          {step === 1 && <>
            <h2 style={{ margin: "0 0 10px", fontSize: 19 }}>Which pet do you like?</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Object.entries(KINDS).map(([k, n]) => <button key={k} type="button" style={pill(k === kind)} onClick={() => { setKind(k); setColour("") }}>{n}</button>)}</div>
            <p style={{ margin: "14px 0 6px", color: C.dim }}>And its colour:</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{colours.map((c) => <button key={c} type="button" style={pill(c === (colour || colours[0]))} onClick={() => setColour(c)}>{c}</button>)}</div>
          </>}
          {step === 2 && <>
            <h2 style={{ margin: "0 0 10px", fontSize: 19 }}>What should we call it?</h2>
            <input style={inp} value={f.name} onChange={set("name")} maxLength={20} placeholder="Vidi" autoFocus />
            <p style={{ margin: "8px 0 0", color: C.dim, fontSize: 13.5 }}>Leave it empty and it is called Vidi.</p>
          </>}
          {step === 3 && <>
            <h2 style={{ margin: "0 0 10px", fontSize: 19 }}>A little about you</h2>
            <label style={{ display: "block", color: C.dim, fontSize: 14 }}>Your first name<input style={{ ...inp, marginTop: 4 }} value={f.user} onChange={set("user")} maxLength={20} placeholder="Your first name" autoComplete="given-name" autoFocus /></label>
            <label style={{ display: "block", color: C.dim, fontSize: 14, marginTop: 10 }}>Its language
              <select style={{ ...inp, marginTop: 4 }} value={f.lang} onChange={set("lang")}>{Object.entries({ auto: "Like my browser", en: "English", de: "Deutsch", hi: "Hinglish", es: "Español", fr: "Français" }).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
            </label>
            <label style={{ display: "block", color: C.dim, fontSize: 14, marginTop: 10 }}>What do you like? <span style={{ fontSize: 12.5 }}>(optional)</span><input style={{ ...inp, marginTop: 4 }} value={f.likes} onChange={set("likes")} maxLength={200} placeholder="football, cooking, dragons" /></label>
            <p style={{ margin: "8px 0 0", color: C.dim, fontSize: 13 }}>It remembers this in this browser only, until you say “forget”.</p>
          </>}
          {step === 4 && <>
            <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>Which AI should answer?</h2>
            <p style={{ margin: "0 0 8px", color: C.dim, fontSize: 13.5 }}>✓ % = how often each AI was right in our own testing (chat, guiding and forms). This is based on our tests only: on your computer and with your questions it can differ. Pick one, then press 🧪 Test it.</p>
            <div style={{ display: "grid", gap: 8 }}>
              {AIS.map((a) => (
                <label key={a.id} style={{ display: "flex", gap: 10, padding: 12, borderRadius: 12, cursor: "pointer", border: `1px solid ${f.ai === a.id ? C.acc : C.line}`, background: f.ai === a.id ? "#221a4f" : "transparent" }}>
                  <input type="radio" name="ai" checked={f.ai === a.id} onChange={() => { setF({ ...f, ai: a.id }); setTest(null) }} />
                  <span style={{ fontSize: 14, lineHeight: 1.5 }}>
                    <b>{a.title}</b> {window.VidiScore(a.id) != null ? <span style={{ color: C.ok }}>✓ {window.VidiScore(a.id)}% in tests</span> : <span style={{ color: C.dim }}>(not fully tested yet)</span>}
                    <span style={{ display: "block", color: C.dim }}>{a.what} {a.note}</span>
                  </span>
                </label>
              ))}
            </div>
            {isCloudName(f.ai) && <label style={{ display: "block", marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.45)", fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={cloudOk} onChange={(e) => setCloudOk(e.target.checked)} /> I understand: what I ask goes to Ollama's servers, so nothing private or for work.</label>}
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" style={big(!test?.busy && (!isCloudName(f.ai) || cloudOk))} disabled={test?.busy || (isCloudName(f.ai) && !cloudOk)} onClick={runTest}>🧪 Test it</button>
              {test && <span style={{ color: test.ok ? C.ok : test.bad ? "#fca5a5" : C.dim, fontSize: 14, lineHeight: 1.5 }}>{test.msg}{test.fix ? ` ${test.fix}` : ""}</span>}
            </div>
            {test?.need && !isCloudName(f.ai) && !backup && <button type="button" style={{ ...pill(true), marginTop: 10 }} onClick={() => getModel(f.ai)}>⬇ Download {f.ai} (3.3 GB)</button>}
            {backup?.name === f.ai && backup.p != null && !backup.done && <p style={{ margin: "8px 0 0" }}>Downloading {f.ai}... {Math.round(backup.p * 100)}%</p>}
            {test?.signin && <a href={test.signin} target="_blank" rel="noopener" style={{ ...pill(true), display: "inline-block", marginTop: 10, textDecoration: "none" }}>🔑 Sign in to Ollama</a>}
            {test?.bad && /not installed|does not allow/.test(test.msg) && <OllamaSetup />}
          </>}
          {step === 5 && <>
            <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>Your pet also works offline</h2>
            <p style={{ margin: 0, color: C.dim, lineHeight: 1.6 }}>The cloud needs internet and has a free limit. A small AI on your computer takes over by itself when you are offline or the free limit is used up, and it is private.</p>
            {bk ? <>
              <p style={{ margin: "10px 0 0" }}><b>{bk.name}</b> ({bk.size}) fits this computer{sys?.totalMB ? ` (${Math.round(sys.totalMB / 1024)} GB memory)` : ""}. It needs the free Ollama app.</p>
              {backup?.p != null && !backup.done && <>
                <p style={{ margin: "8px 0 0" }}>⬇ Downloading the offline AI ({bk.size}), so your pet also works without internet... {Math.round(backup.p * 100)}%</p>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.12)", marginTop: 6, overflow: "hidden" }}><div style={{ width: `${Math.round(backup.p * 100)}%`, height: "100%", background: "#7c5cff" }} /></div>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: C.dim }}>You can press Finish now: it keeps downloading. <button type="button" onClick={notNow} style={{ background: "none", border: 0, color: "#c4b5fd", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}>Not now</button></p>
              </>}
              {(backup?.skipped || !backup) && <>
                <button type="button" style={{ ...big(), marginTop: 10 }} onClick={() => getModel(bk.name)}>⬇ Download it ({bk.size})</button>
                <p style={{ margin: "8px 0 0", color: C.dim, fontSize: 13.5 }}>Or later: tell your pet “change the AI”.</p>
              </>}
              {backup?.done && <p style={{ margin: "8px 0 0", color: C.ok }}>✓ The backup is ready. Your pet uses it when the cloud cannot answer.</p>}
              {backup?.error && <><p style={{ margin: "8px 0 0", color: "#fca5a5" }}>{backup.error}</p><OllamaSetup /></>}
            </> : <p style={{ margin: "10px 0 0" }}>{sys ? "This computer has too little memory for an AI of its own, so your pet uses the cloud (it needs internet)." : "The plugin checks this computer's memory first."}</p>}
          </>}
          {step === 6 && <>
            <h2 style={{ margin: "0 0 6px", fontSize: 21 }}>🎉 {f.name || "Vidi"} is ready{f.user ? `, ${f.user}` : ""}!</h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>It waits at the right edge of the page: click it to say hi.</p>
            <Shot n={7} />
            {backup?.p != null && !backup.done && !backup.skipped && <p style={{ margin: "8px 0 0", color: C.dim }}>⬇ The offline AI is still downloading ({Math.round(backup.p * 100)}%). Keep this page open until it is done.</p>}
            <p style={{ margin: "10px 0 0", padding: "10px 12px", borderRadius: 10, background: "rgba(124,92,255,.12)", lineHeight: 1.6 }}>💡 Want another AI later? Just tell your pet <Say>change the AI</Say>: it shows the ones ready to use and the ones to download, as buttons.</p>
          </>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
        {step > 0 && step < 6 && <button type="button" style={pill(false)} onClick={() => setStep(step === 5 && !needBackup ? 4 : step - 1)}>← Back</button>}
        {step < last && <button type="button" style={big(step !== 4 || (!!test?.ok && (!isCloudName(f.ai) || cloudOk)))} disabled={step === 4 && !(test?.ok && (!isCloudName(f.ai) || cloudOk))} onClick={() => setStep(step + 1)}>{step === 0 ? "Let's start" : "Next →"}</button>}
        {step === last && <button type="button" style={big(step !== 4 || !!test?.ok)} disabled={step === 4 && !test?.ok} onClick={save}>✓ Finish</button>}
        {step === 4 && !test?.ok && <button type="button" style={{ ...pill(false), fontSize: 13 }} onClick={() => (needBackup ? setStep(5) : save())}>Skip the test</button>}
        {step === 6 && <button type="button" style={big()} onClick={() => { setStep(-1); document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" }) }}>Start the lessons →</button>}
      </div>
    </Card>
  )
}


export default function PetTraining() {
  const [kind, setKind] = useState("dragon")
  const [colour, setColour] = useState("")
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem("vd-pet-training") || "[]") } catch { return [] } })
  useEffect(() => { try { localStorage.setItem("vd-pet-training", JSON.stringify(done)) } catch { /* private window */ } }, [done])
  useEffect(() => { document.title = "Pet training · ShowMeWise" }, [])
  const toggle = (id) => setDone((d) => d.includes(id) ? d.filter((x) => x !== id) : [...d, id])
  // the open lesson (null: the course cards); the page goes back to the top of the lessons
  const [open, setOpen] = useState(null)
  const [setupKey, setSetupKey] = useState(0) // a new key starts the setup wizard over (↺ Reset)
  // "▶ Try it": the plugin's pet hears the sentence as if the user typed it (only on this page)
  const tryIt = (t) => window.postMessage({ source: "showmewise-app", type: "pet-try", text: t.replace(/\s*\((it asks[^)]*|also works)\)/i, "") }, location.origin)
  let setUp = false; try { setUp = !!localStorage.getItem(SETUP_KEY) } catch { /* private window */ }
  const openLesson = (id) => { setOpen(id); requestAnimationFrame(() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })) }
  const pill = (on) => ({ font: "inherit", fontSize: 13.5, cursor: "pointer", borderRadius: 999, padding: "6px 12px", border: `1px solid ${on ? C.acc : C.line}`, background: on ? "#2b2063" : "transparent", color: "#fff" })

  return (
    <div style={{ minHeight: "100vh", position: "relative", background: C.bg, color: C.ink, fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif" }}>
      <style>{window.VidiPetCSS}</style>
      {/* the same calm background and top bar as the rest of the website */}
      <div className="app-bg" />
      <div style={{ position: "relative", zIndex: 1 }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(15,11,36,0.92)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href="/#/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: C.ink, fontWeight: 700 }}><ShowMeWiseLogo size={26} /> ShowMeWise</a>
          <span style={{ color: C.dim, fontSize: 13 }}>· Pet training</span>
          <a href="/#/app" style={{ marginLeft: "auto", color: "#fff", fontSize: 13, textDecoration: "none", padding: "7px 14px", borderRadius: 10, background: "linear-gradient(135deg,#6d4aff,#3f62ff)" }}>Open the app</a>
        </div>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, padding: "32px 16px 80px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.8rem,5vw,2.4rem)" }}>Pet training <span style={{ fontSize: 14, color: C.dim, fontWeight: 400 }}>BETA</span></h1>
        <p style={{ margin: 0, color: C.dim, lineHeight: 1.6 }}>Your pet is a small helper from the ShowMeWise browser plugin. It lives at the edge of your web pages, chats with you, explains pages, fills forms, sets timers and searches the web. Learn each skill here and try it right on this page, in any order.</p>

        <p style={{ margin: 0, padding: "10px 14px", borderRadius: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.4)", color: "#fde68a", fontSize: 14, lineHeight: 1.5 }}>
          Everything to practise on this page is made up: the sample CV (Mira Hoffmann is not a real person), the form, the toolbar and the ads. Nothing you type here is sent anywhere.
        </p>
        <Card>
          <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>Before you start</h2>
          <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.9, listStyle: "decimal" }}>
            <li>{PLUGIN_URL ? <a href={PLUGIN_URL} target="_blank" rel="noopener" style={{ color: "#c4b5fd" }}>Add the ShowMeWise plugin to Chrome or Edge</a> : "Add the ShowMeWise plugin to Chrome or Edge (the store link comes here soon)."}</li>
            <li>Open the plugin (the ShowMeWise icon in the toolbar), then Your pet, and tick <b>Show my pet on web pages</b>. It asks for your OK once.</li>
            <li>Come back to this page: your pet waits at the right edge. Click it to start.</li>
          </ol>
          {/* the same steps as real Chrome shows them, a marker beside each button */}
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", color: "#c4b5fd", fontWeight: 700 }}>📸 Show me with pictures</summary>
            {SETUP_SHOTS.map(([file, text]) => (
              <figure key={file} style={{ margin: "14px 0 0" }}>
                <figcaption style={{ margin: "0 0 6px", fontWeight: 600 }}>{text}</figcaption>
                <img src={`/setup/${file}.png`} alt={text} loading="lazy" style={{ width: "100%", maxWidth: 760, borderRadius: 10, border: "1px solid rgba(255,255,255,.15)" }} />
              </figure>
            ))}
          </details>
          <p style={{ margin: "10px 0 0", color: C.dim, fontSize: 13.5 }}>On the rest of the ShowMeWise website the pet stays away, because ShowMeWise has its own Vidi there. This page is its training ground.</p>
        </Card>

        <PetSetup key={setupKey} kind={kind} setKind={setKind} colour={colour} setColour={setColour} />


        <div id="courses" style={{ display: "flex", alignItems: "center", gap: 12, scrollMarginTop: 80 }}>
          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,.08)", borderRadius: 9, overflow: "hidden" }}><div style={{ width: `${(done.length / LESSONS.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#7c5cff,#22d3ee)", transition: "width .4s" }} /></div>
          <b style={{ fontSize: 14 }}>{done.length} of {LESSONS.length} done</b>
          {/* start over: every lesson open again, and the setup from the beginning */}
          <button type="button" onClick={() => { if (!confirm("Start the training again? Your ✓ Done marks are cleared and the setup starts from the beginning. Your pet keeps what it knows.")) return; setDone([]); try { localStorage.removeItem(SETUP_KEY) } catch { /* private window */ } setOpen(null); setSetupKey((k) => k + 1) }}
            style={{ ...pill(false), fontSize: 12.5, padding: "5px 10px", whiteSpace: "nowrap" }}>↺ Reset</button>
        </div>

        {/* the lessons as course cards: pick one, it opens as its own little scenario */}
        {!open && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
            {LESSONS.map((l, n) => {
              const ok = done.includes(l.id), c = COURSE[l.id] || {}
              return (
                <button key={l.id} data-lesson={l.id} onClick={() => openLesson(l.id)}
                  style={{ textAlign: "left", font: "inherit", color: C.ink, cursor: "pointer", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", borderRadius: 16,
                    background: ok ? "linear-gradient(160deg,rgba(52,211,153,.16),rgba(22,15,46,.94))" : C.card, border: `1px solid ${ok ? "rgba(52,211,153,.6)" : C.line}` }}>
                  {/* the picture: your own pet doing the lesson, its big icon beside it */}
                  <div style={{ position: "relative", height: 118, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: ART[n % ART.length] }}>
                    {/* before the setup the whole pet family takes turns; afterwards it is your own pet */}
                    <PetPic kind={setUp ? kind : Object.keys(KINDS)[n % 5]} colour={setUp ? colour : ""} mood={MOOD[l.id] || "happy"} size={86} />
                    <span style={{ fontSize: 44, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))" }}>{l.icon}</span>
                    <span style={{ position: "absolute", top: 8, right: 8, fontSize: 12, padding: "3px 9px", borderRadius: 999, background: ok ? "rgba(16,94,68,.85)" : "rgba(15,11,36,.7)", color: ok ? "#a7f3d0" : "#e4ddff" }}>{ok ? "✓ Done" : `Lesson ${n + 1}`}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px 14px", flex: 1 }}>
                    <b style={{ fontSize: 15.5, lineHeight: 1.35 }}>{l.title}</b>
                    {/* two lines at most */}
                    <span style={{ color: C.dim, fontSize: 13.5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>{c.short}</span>
                    <span style={{ color: C.dim, fontSize: 12.5 }}>⏱ about {c.min || 2} min{c.files ? " · 📥 file" : ""}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {LESSONS.map((l, n) => open === l.id && (
          <Card key={l.id} id={l.id} style={{ borderColor: done.includes(l.id) ? "rgba(52,211,153,.6)" : C.line }}>
            <button onClick={() => openLesson(null)} style={{ ...pill(false), marginBottom: 12 }}>← All lessons</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", padding: "4px 10px", borderRadius: 14, background: ART[n % ART.length] }}><PetPic kind={kind} colour={colour} mood={MOOD[l.id] || "happy"} size={58} /><span style={{ fontSize: 30 }}>{l.icon}</span></span>
              <h2 style={{ margin: 0, fontSize: 20, flex: 1 }}>{n + 1}. {l.title}</h2>
              {done.includes(l.id) && <span style={{ color: C.ok, fontSize: 14, whiteSpace: "nowrap" }}>✓ Done</span>}
            </div>
            <p style={{ margin: "12px 0 0", lineHeight: 1.6, fontSize: 16 }}>{SIMPLE[l.id]?.[0] || l.what}</p>
            <p style={{ margin: "4px 0 0", lineHeight: 1.6, color: C.ok }}>👍 {SIMPLE[l.id]?.[1] || l.why}</p>
            {COURSE[l.id]?.files && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(124,92,255,.1)", border: `1px solid ${C.line}` }}>
                <b style={{ display: "block", marginBottom: 6 }}>📥 Files for this lesson</b>
                {COURSE[l.id].files.map((f) => <a key={f.href} href={f.href} download style={{ ...pill(false), display: "inline-block", textDecoration: "none", margin: "4px 8px 4px 0" }}>⬇ {f.label}</a>)}
                <p style={{ margin: "6px 0 0", color: C.dim, fontSize: 13 }}>Download it, then give it to your pet with 📎 in its chat (or drop it on the pet).</p>
              </div>
            )}
            <h3 style={{ margin: "16px 0 4px", fontSize: 15.5 }}>▶ Try it now</h3>
            <p style={{ margin: "0 0 6px", color: C.dim, fontSize: 13.5 }}>Follow the steps. Tap a ▶ button and your pet opens and does it right here, or type the words into its chat yourself.</p>
            {/* data-vidi-skip: the pet does not take these Try buttons for buttons of the practice page */}
            <ol data-vidi-skip="" style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7, listStyle: "decimal" }}>
              {(COURSE[l.id]?.walk || []).map((s, k) => (
                <li key={k} style={{ margin: "6px 0" }}>{s.do}{s.say && <span style={{ display: "block", lineHeight: 2.3 }}>{s.say.map((t) => (
                  // a sentence to say: one tap says it to the pet; an action ("press ＋", "drag it") stays a hint
                  /^(press|drag|make the chat|hide on this site|in the plugin|📎)|\(your name\)/i.test(t)
                    ? <span key={t} data-try={t} style={{ marginRight: 6 }}><Say>{t}</Say></span>
                    : <button key={t} type="button" data-try={t} onClick={() => tryIt(t)} title="Your pet says it for you"
                        style={{ font: "inherit", fontSize: 13.5, cursor: "pointer", margin: "0 6px 4px 0", padding: "3px 10px", borderRadius: 999, border: `1px solid ${C.acc}`, background: "#2b2063", color: "#fff" }}>▶ {t.replace(/\s*\((it asks[^)]*|also works)\)/i, "")}</button>
                ))}</span>}</li>
              ))}
            </ol>
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
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button onClick={() => toggle(l.id)} style={{ ...pill(done.includes(l.id)), padding: "9px 16px", borderColor: done.includes(l.id) ? C.ok : C.line, color: done.includes(l.id) ? C.ok : "#fff" }}>{done.includes(l.id) ? "✓ Done (tap to undo)" : "✓ Mark as done"}</button>
              {n + 1 < LESSONS.length && <button onClick={() => { if (!done.includes(l.id)) toggle(l.id); openLesson(LESSONS[n + 1].id) }} style={{ ...pill(true), padding: "9px 16px" }}>Next lesson: {LESSONS[n + 1].icon} {LESSONS[n + 1].title.split(",")[0]} →</button>}
            </div>
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
          <p style={{ margin: "10px 0 0" }}><a href="/#/policy" style={{ color: "#c4b5fd" }}>Privacy policy</a> · <a href="/#/legal" style={{ color: "#c4b5fd" }}>Legal notice</a> · <a href="/#/howto" style={{ color: "#c4b5fd" }}>How to use ShowMeWise</a></p>
        </Card>
      </div>
      </div>
    </div>
  )
}
