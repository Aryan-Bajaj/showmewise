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
import { DEFAULT_WEBLLM_MODEL } from "../lib/llm"

const words = (t) => new Set((String(t || "").toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((w) => !/^(the|and|for|you|how|what|which|does|with|this|that|are|can|from|about|into|your)$/.test(w)))

// links whose text or address share words with the question, best first
export function pickLinks(question, links, base, max = 3) {
  const q = words(question)
  let host = ""
  try { host = new URL(base).host } catch { /* no base */ }
  const seen = new Set()
  return (links || [])
    .filter((l) => { try { const u = new URL(l.href); return u.host === host && /^https?:$/.test(u.protocol) && !seen.has(u.href.split("#")[0]) && seen.add(u.href.split("#")[0]) } catch { return false } })
    .map((l) => ({ ...l, score: [...words(l.text + " " + decodeURIComponent(new URL(l.href).pathname).replace(/[/_-]/g, " "))].filter((w) => q.has(w)).length }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
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
      try {
        const c = ctx.current
        if (m.scope === "video") {
          const docs = videoDocs()
          if (!docs.length) throw new Error("There is no video guide in VideoDoc yet. Record or upload a video first.")
          if (c.key !== "video:" + docs.length) { status("Reading the video guide..."); c.docs = docs; c.links = []; await buildIndex(docs, (l) => status(l)); c.key = "video:" + docs.length }
        } else if (m.scope === "page") {
          if (c.key !== "page:" + m.page.url) {
            status("Reading this page...")
            c.docs = passagesOf(m.page.text, m.page.title || "This page", m.page.url)
            c.links = m.page.links || []; c.base = m.page.url; c.read = new Set([m.page.url])
            if (!c.docs.length) throw new Error("This page has no text to read.")
            await buildIndex(c.docs, (l) => status(l)); c.key = "page:" + m.page.url
          }
        } else if (m.scope === "doc") {
          if (c.key !== "doc:" + m.doc.name + m.doc.size) {
            status(`Reading ${m.doc.name}...`)
            const bytes = Uint8Array.from(atob(m.doc.data), (ch) => ch.charCodeAt(0))
            const text = await extractText(new File([bytes], m.doc.name))
            c.docs = passagesOf(text, m.doc.name)
            if (!c.docs.length) throw new Error(`Could not read any text from ${m.doc.name}. A scanned PDF is only pictures of text.`)
            c.links = []; await buildIndex(c.docs, (l) => status(l)); c.key = "doc:" + m.doc.name + m.doc.size
          }
        }
        // pages the panel fetched for this question: added to what is searched
        if (m.pages?.length) {
          for (const p of m.pages) { c.read.add(p.url); c.docs.push(...passagesOf(p.text, p.title || p.url, p.url)) }
          status("Reading the linked pages..."); await buildIndex(c.docs, (l) => status(l))
        }
        const [mode, model] = await pickModel()
        status(mode === "ollama" ? `Answering with ${model}...` : "Answering with the browser AI...")
        const r = await ask(m.question, mode, model, (l) => l && status(l))
        // not on this page: maybe behind one of its links
        if (r.notFound && m.scope === "page" && !m.pages && m.followLinks) {
          const next = pickLinks(m.question, c.links, c.base).filter((l) => !c.read.has(l.href))
          if (next.length) return post("chat-need-pages", { id: m.id, links: next.map(({ text, href }) => ({ text, href })) })
        }
        post("chat-answer", {
          id: m.id, answer: r.answer, notFound: !!r.notFound, model,
          sources: (r.sources || []).slice(0, 3).map((s) => ({ label: s.label, title: s.title, timestamp: s.timestamp, url: c.docs.find((d) => d.label === s.label)?.url || null, text: (s.text || "").slice(0, 300) })),
          readPages: m.pages?.map((p) => ({ title: p.title, url: p.url })) || [],
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
