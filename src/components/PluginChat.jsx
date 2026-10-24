// Answers chat questions from the browser plugin's side panel, with the same
// chat engine as Vid Chat and Doc Chat, on this computer. Shows nothing.
// What it can answer from: the video guide open in this tab, a page the user
// is looking at, or a document the user picked in the panel. When a page does
// not hold the answer, it picks the links whose words match the question and
// asks the panel to read those pages (same site, at most 3), then asks again.
import { useEffect, useRef } from "react"
import useRAG from "../hooks/useRAG"
import { post, videoDocs } from "../lib/bridge"
import { extractText, chunkText } from "../hooks/useDocParser"
import { DEFAULT_WEBLLM_MODEL, callOllama, callWebLLM } from "../lib/llm"
import { findHelp } from "../lib/howto"
import { SYSTEM as VIDI_SYSTEM, vidiPrompt } from "./Vidi.jsx"

// words, with plural and verb endings cut ("plans" = "plan", "pricing" = "pric")
const words = (t) => new Set((String(t || "").toLowerCase().match(/[a-z0-9]{3,}/g) || [])
  .filter((w) => !/^(the|and|for|you|how|what|which|does|with|this|that|are|can|from|about|into|your|html?|php|aspx?|www)$/.test(w))
  .map((w) => w.replace(/(ing|es|s)$/, "")))

// the links of the same site, once each
function siteLinks(links, base) {
  let host = ""
  try { host = new URL(base).host } catch { /* no base */ }
  const seen = new Set()
  return (links || []).filter((l) => {
    try { const u = new URL(l.href), k = u.href.split("#")[0]; return u.host === host && /^https?:$/.test(u.protocol) && k !== base.split("#")[0] && !seen.has(k) && seen.add(k) } catch { return false }
  })
}

// links whose text or address share words with the question, best first
export function pickLinks(question, links, base, max = 3) {
  const q = words(question)
  return siteLinks(links, base)
    .map((l) => ({ ...l, score: [...words(l.text + " " + decodeURIComponent(new URL(l.href).pathname).replace(/[/_.-]/g, " "))].filter((w) => q.has(w)).length }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
}

// no word in common ("cost" vs "Plans and pricing"): the AI picks by meaning
async function pickLinksByAI(question, links, base, mode, model) {
  const list = siteLinks(links, base).filter((l) => l.text).slice(0, 60)
  if (!list.length) return []
  const prompt = `Question: ${question}\n\nLinks on the page:\n${list.map((l, i) => `${i + 1}. ${l.text}`).join("\n")}\n\nWhich links most likely lead to the answer? Reply with up to 3 numbers separated by commas, best first, or 0 if none.`
  const sys = "You pick links. Reply with numbers only."
  const raw = mode === "ollama" ? await callOllama(prompt, sys, model, { maxTokens: 20, temperature: 0 }) : await callWebLLM(prompt, sys, null, { maxTokens: 20, model })
  return [...new Set((String(raw).match(/\d+/g) || []).map(Number))].filter((n) => n >= 1 && n <= list.length).slice(0, 3).map((n) => list[n - 1])
}

async function pickModel() {
  try {
    const d = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) }).then((r) => r.json())
    const local = (d.models || []).filter((m) => !/cloud/.test(m.name))
    const size = (m) => parseFloat(m.details?.parameter_size) || 99
    const quick = local.find((m) => /^gemma3:4b/.test(m.name)) || [...local].sort((a, b) => size(a) - size(b))[0]
    if (quick) return ["ollama", quick.name]
  } catch { /* no Ollama */ }
  return ["webllm", DEFAULT_WEBLLM_MODEL]
}

// a fetched page as plain text, without menus, scripts and styles
function htmlText(html) {
  const d = new DOMParser().parseFromString(html || "", "text/html")
  d.querySelectorAll("script,style,noscript,svg,template,nav,footer,header").forEach((x) => x.remove())
  d.querySelectorAll("p,div,li,tr,h1,h2,h3,h4,br,section,article").forEach((x) => x.append("\n"))
  return { title: d.title, text: (d.body?.textContent || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() }
}

// a huge page or document: only the parts that share the most words with the
// question are read closely (reading all 1.800 parts of a 1,6 MB page took 4 min)
const BIG = 300
function closest(docs, question) {
  const q = words(question)
  const score = (d) => [...words(d.text)].filter((w) => q.has(w)).length
  const top = new Set(docs.map((d, i) => [score(d), i]).sort((a, b) => b[0] - a[0]).slice(0, BIG - 10).map(([, i]) => i))
  return docs.filter((_, i) => i < 10 || top.has(i))
}

const passagesOf = (text, label, url) => chunkText(text).map((c, i) => ({ label: `${label}${i ? ` (${i + 1})` : ""}`, text: c, url, timestamp: null, frame: null, annotation: null }))

export default function PluginChat() {
  const { buildIndex, ask } = useRAG()
  const ctx = useRef({ key: null, docs: [], links: [], base: "", read: new Set() })
  const busy = useRef(Promise.resolve())

  useEffect(() => {
    const on = (e) => {
      const m = e.detail || {}
      // one question at a time, in order
      busy.current = busy.current.then(() => handle(m)).catch(() => {})
    }
    const handle = async (m) => {
      const status = (label) => post("chat-status", { id: m.id, label })
      // the answer as it is being written, at most every 0,2 s (the plugin shows it word by word)
      let lastSent = 0
      const typing = (t) => { const now = Date.now(); if (now - lastSent > 200) { lastSent = now; post("chat-partial", { id: m.id, text: t }) } }
      let built = false
      const indexDocs = async () => {
        built = true
        if (c.docs.length > BIG) status("This is long: picking the parts that fit your question...")
        await buildIndex(c.docs.length > BIG ? closest(c.docs, m.question) : c.docs, (l) => status(l))
      }
      const c = ctx.current
      try {
        // "Show me on the page": which of the page's buttons and fields the answer is about
        if (m.scope === "pick") {
          const [mode, model] = await pickModel()
          const prompt = `Question: ${m.question}\nAnswer: ${m.answer}\n\nThings on the page:\n${m.elements.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nWhich of these does the answer tell the user to use? Only the ones needed, usually just one, in the order of the answer. Reply with the numbers separated by commas (at most 3), or 0 if none fits.`
          const sys = "You point at buttons and fields on a page. Reply with numbers only."
          const raw = mode === "ollama" ? await callOllama(prompt, sys, model, { maxTokens: 20, temperature: 0 }) : await callWebLLM(prompt, sys, null, { maxTokens: 20, model })
          const picks = [...new Set((String(raw).match(/\d+/g) || []).map(Number))].filter((n) => n >= 1 && n <= m.elements.length).slice(0, 3).map((n) => n - 1)
          return post("chat-answer", { id: m.id, picks })
        }
        // questions about VideoDoc itself (limits, how to use, the plugin): Vidi's help
        if (m.scope === "help" || /\b(videodoc|vidi|plugin|extension)\b/i.test(m.question)) {
          const { onTopic, sections } = findHelp(m.question)
          if (!onTopic) return post("chat-answer", { id: m.id, answer: "Sorry, I can only help with VideoDoc: recording, the guide, saving it, the chats and the plugin." })
          const [mode, model] = await pickModel()
          status("Looking in the VideoDoc help...")
          const prompt = vidiPrompt(m.question, sections, "the VideoDoc browser plugin")
          const answer = mode === "ollama" ? await callOllama(prompt, VIDI_SYSTEM, model, { maxTokens: 200, temperature: 0.2, onToken: typing }) : await callWebLLM(prompt, VIDI_SYSTEM, null, { maxTokens: 200, model, onToken: typing })
          return post("chat-answer", { id: m.id, answer: answer.trim(), model, sources: sections.slice(0, 1).map((h) => ({ label: h.title, url: `${location.origin}/#/howto` })) })
        }
        if (m.scope === "video") {
          const docs = videoDocs()
          if (!docs.length) throw new Error("There is no video guide in VideoDoc yet. Record or upload a video first.")
          if (c.key !== "video:" + docs.length) { status("Reading the video guide..."); c.docs = docs; c.links = []; await indexDocs(); c.key = "video:" + docs.length }
        } else if (m.scope === "page") {
          if (c.key !== "page:" + m.page.url) {
            status("Reading this page...")
            c.docs = passagesOf(m.page.text, m.page.title || "This page", m.page.url)
            c.links = m.page.links || []; c.base = m.page.url; c.read = new Set([m.page.url])
            if (!c.docs.length) throw new Error("This page has no text to read.")
            // words that are only in links (menus) are not "on the page": the answer is behind them
            let body = m.page.text
            for (const l of c.links) if ((l.text || "").length > 2) body = body.split(l.text).join(" ")
            c.bodyWords = words(body)
            await indexDocs(); c.key = "page:" + m.page.url
          }
        } else if (m.scope === "doc") {
          if (c.key !== "doc:" + m.doc.name + m.doc.size) {
            status(`Reading ${m.doc.name}...`)
            const bytes = Uint8Array.from(atob(m.doc.data), (ch) => ch.charCodeAt(0))
            const text = await extractText(new File([bytes], m.doc.name))
            c.docs = passagesOf(text, m.doc.name)
            if (!c.docs.length) throw new Error(`Could not read any text from ${m.doc.name}. A scanned PDF is only pictures of text.`)
            c.links = []; await indexDocs(); c.key = "doc:" + m.doc.name + m.doc.size
          }
        }
        // pages the panel fetched for this question: added to what is searched
        if (m.pages?.length) {
          for (const p of m.pages) {
            const got = p.text != null ? p : htmlText(p.html)
            c.read.add(p.url); c.docs.push(...passagesOf(got.text, got.title || p.title || p.url, p.url))
          }
          status("Reading the linked pages..."); await indexDocs()
        }
        // a huge page asked again: pick the parts for this new question
        if (!built && c.docs.length > BIG) await indexDocs()
        const [mode, model] = await pickModel()
        // Most of the question's words are nowhere on the page: the answer is
        // likely behind a link. Checked without the AI, because a small model
        // sometimes answers a different question instead of saying "not here".
        const linkable = m.scope === "page" && !m.pages && m.followLinks
        const qw = [...words(m.question)], pw = c.bodyWords || words(c.docs.map((d) => d.text).join(" "))
        const offPage = linkable && qw.length >= 2 && qw.filter((w) => pw.has(w)).length / qw.length < 0.5
        let r = { notFound: true, answer: "" }
        if (!offPage) {
          status(mode === "ollama" ? `Answering with ${model}...` : "Answering with the browser AI...")
          r = await ask(m.question, mode, model, (l) => l && status(l), typing)
        }
        // not on this page: maybe behind one of its links
        // the model may say it in words instead ("That isn't covered here")
        const missing = r.notFound || /\b(isn.?t|not|wasn.?t) (covered|mentioned|included|in (this|the) (doc|document|page|text))|couldn.?t find|no information|does(n.?t| not) (say|mention|contain)/i.test(r.answer || "")
        if (missing && linkable) {
          let next = pickLinks(m.question, c.links, c.base).filter((l) => !c.read.has(l.href))
          if (!next.length) { status("Looking at the links on this page..."); next = (await pickLinksByAI(m.question, c.links, c.base, mode, model).catch(() => [])).filter((l) => !c.read.has(l.href)) }
          if (next.length) return post("chat-need-pages", { id: m.id, links: next.map(({ text, href }) => ({ text, href })) })
        }
        // no link fits after all: answer from the page as it is
        if (offPage) { status("Answering..."); r = await ask(m.question, mode, model, (l) => l && status(l), typing) }
        post("chat-answer", {
          id: m.id, answer: String(r.answer || "").trim() || "I could not find anything about that in it. Try other words, or the Help tab for questions about VideoDoc.", notFound: !!r.notFound, model,
          sources: (r.sources || []).slice(0, 3).map((s) => ({ label: s.label, title: s.title, timestamp: s.timestamp, url: c.docs.find((d) => d.label === s.label)?.url || null, text: (s.text || "").slice(0, 300) })),
          readPages: m.pages?.map((p) => ({ title: c.docs.find((d) => d.url === p.url)?.label || p.title, url: p.url })) || [],
        })
      } catch (e) {
        post("chat-answer", { id: m.id, error: e.message })
      }
    }
    window.addEventListener("videodoc:chat", on)
    return () => window.removeEventListener("videodoc:chat", on)
  }, [buildIndex, ask])
  return null
}
