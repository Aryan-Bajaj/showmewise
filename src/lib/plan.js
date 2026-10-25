// Whole-recording action list. The AI reads the full transcript once and lists
// every action the viewer must do, with the time it is said. The tools then
// check each one against the speech at that time (an action nobody said is
// dropped) and hand it to the part it falls in, where it joins the checklist
// the part must cover. So an action said in passing is not lost because its
// part was busy with something else.
import { actionKey } from "./coverage.js"

export const PLAN_SCHEMA = {
  type: "object",
  properties: { actions: { type: "array", items: { type: "object", properties: { t: { type: "string" }, do: { type: "string" } }, required: ["t", "do"] } } },
  required: ["actions"],
}

export const PLAN_PROMPT = `You are given the timestamped transcript of a screen recording in which someone shows how to do a task.
List EVERY action the viewer has to do, in the order they happen, as short orders ("Enter the account number", "Click Save", "Open transaction XY12").
Use the exact names that are said: buttons, fields, menus, codes and values.
Include actions that are only said in passing ("then we save it", "double click on the row").
Leave out greetings, explanations and talk that is not an action. Never invent an action that is not in the transcript.
"t" is the time of the line where the action is said, copied from the transcript (mm:ss).
Answer only as JSON: {"actions":[{"t":"mm:ss","do":"..."}]}`

const ts = (s) => { const m = Math.floor(s / 60), x = Math.floor(s % 60); return `${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` }
const secs = (t) => { const m = String(t || "").match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null }

// The transcript as "[mm:ss] text" lines, cut into pieces the model can read whole.
export function planBatches(chunks, maxChars = 3500) {
  const lines = (chunks || []).filter((c) => c.text?.trim()).map((c) => `[${ts(c.timestamp?.[0] ?? 0)}] ${c.text.trim()}`)
  const out = []
  let cur = ""
  for (const l of lines) {
    if (cur && cur.length + l.length + 1 > maxChars) { out.push(cur); cur = "" }
    cur += (cur ? "\n" : "") + l
  }
  if (cur) out.push(cur)
  return out
}

// The model's answer → [{ t, do }], only well-formed items.
// The model's answer → [{ t, do }], only well-formed items. An answer cut off
// at the word limit is still read: every complete {"t", "do"} item counts
// (a cut-off list used to lose ALL its actions on a real run).
export function parsePlan(raw) {
  const text = String(raw || "")
  let list = []
  const m = text.match(/\{[\s\S]*\}/)
  try { list = m ? JSON.parse(m[0]).actions || [] : [] } catch { list = [] }
  if (!Array.isArray(list) || !list.length) {
    list = [...text.matchAll(/\{\s*"t"\s*:\s*"([^"]*)"\s*,\s*"do"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g)].map((x) => ({ t: x[1], do: x[2].replace(/\\"/g, '"') }))
  }
  return list
    .map((a) => ({ t: secs(a?.t), do: String(a?.do || "").replace(/\s+/g, " ").trim().slice(0, 120) }))
    // "Click Share, switch on anyone with the link, and copy the link": three clicks said in one
    // sentence are three actions. As one, "Click Share" alone counted as the whole sentence, and the
    // switch and the copy were never asked for (seen on real runs: the Share part kept one step).
    .flatMap((a) => {
      const parts = a.do.replace(/\.$/, "").split(/,\s*(?:and\s+|then\s+)?|\s+(?:and|then)\s+/i).map((s) => s.trim()).filter(Boolean)
      const VERB = /^(click|tap|press|select|choose|pick|type|enter|open|switch|turn|copy|paste|save|drag|check|tick|untick|add|remove|delete|close|scroll|go to|fill|upload|download|sign|log)\b/i
      if (parts.length < 2 || !parts.every((p) => VERB.test(p))) return [a]
      return parts.map((p) => ({ t: a.t, do: p[0].toUpperCase() + p.slice(1) + "." }))
    })
    // a thin item ("Click", "login") says nothing a reader can do
    .filter((a) => a.t != null && a.do.length >= 4 && !/^(click|copy|paste|select|open|go|type|enter|press|choose|tap)\W*$/i.test(a.do))
    // only points, names nothing ("go to this tab here", "click here"): a reader cannot follow it
    .filter((a) => !(/\b(here|this|that|there)\b/i.test(a.do) && !/\d|'|"|[A-Z]/.test(a.do.slice(1))))
}

// Keep an action only when its words were said near its time (±20 s): the
// tools check the model. An action without specific words ("Save") needs its
// verb nearby.
export function groundPlan(items, chunks, near = 20) {
  const around = (t) => (chunks || [])
    .filter((c) => Math.abs((c.timestamp?.[0] ?? 0) - t) <= near)
    .map((c) => c.text).join(" ").toLowerCase()
  const out = []
  for (const it of items) {
    const said = around(it.t)
    if (!said) continue
    const key = actionKey(it.do)
    const ok = key.length
      ? key.some((w) => said.includes(w.slice(0, 5)))
      : said.includes(it.do.toLowerCase().split(/\s+/)[0])
    if (ok && !out.some((o) => o.do.toLowerCase() === it.do.toLowerCase())) out.push(it)
  }
  return out
}

// Add each planned action to the checklist of the part it falls in, when the
// part's own list does not have it yet.
export function addPlanToWindows(windows, plan, max = 12) {
  for (const it of plan) {
    const w = windows.find((x) => it.t >= x.a && it.t < x.b) || windows.find((x) => it.t < x.b) || windows[windows.length - 1]
    if (!w) continue
    const k = actionKey(it.do)
    // said AND shown: a name of the action must be on screen in this part, or
    // it carries a code or number. Loose talk ("take out the filter here")
    // otherwise turns into vague steps (seen on a real run).
    const screen = (w.seen || "").toLowerCase()
    const names = k.length ? k : [it.do.toLowerCase().split(" ")[0].replace(/\W/g, "")]
    if (!/\d/.test(it.do) && !names.some((x) => x.length >= 4 && screen.includes(x.slice(0, 5)))) continue
    const list = w.actions || (w.actions = [])
    // (a different verb is a different action: "Copy the link" is not "Switch on anyone with the link",
    // although both name the link; it was dropped as a repeat, seen on a real run)
    const verb = (s) => (s.toLowerCase().match(/\b(click|tap|press|select|choose|pick|type|enter|open|switch|turn|copy|paste|save|drag|check|tick|untick|add|remove|delete|close|scroll|fill|upload|download)\b/) || [])[1] || ""
    const have = list.some((a) => {
      const va = verb(a), vb = verb(it.do)
      if (va && vb && va !== vb) return false
      const ka = actionKey(a); return k.length ? k.every((x) => ka.some((y) => y.slice(0, 5) === x.slice(0, 5))) : a.toLowerCase() === it.do.toLowerCase()
    })
    if (have || list.length >= max) continue
    // put it where it falls in time inside the part (the list is in order)
    // and after the listed action added before it (the plan is in time order)
    const after = w.lastPlan != null ? list.indexOf(w.lastPlan) + 1 : 0
    const at = Math.max(after, Math.round(((it.t - w.a) / Math.max(1, w.b - w.a)) * list.length))
    list.splice(Math.min(list.length, at), 0, it.do)
    w.lastPlan = it.do
  }
  return windows
}
