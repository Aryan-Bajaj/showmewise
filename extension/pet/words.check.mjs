// Runnable check: node extension/pet/words.check.mjs
// Commands in five languages must become the same English command, and the
// English ones must stay as they are ("alarm" must not become "alarms").
import fs from "node:fs"
import vm from "node:vm"
import assert from "node:assert"
const src = fs.readFileSync(new URL("./pet-bg.js", import.meta.url), "utf8")
const part = (from, to) => src.slice(src.indexOf(from), src.indexOf(to))
const ctx = {}
vm.runInNewContext(part("const WORDS = [", '// "in 5 minutes"') + part("const UNIT", "// Commands in German") + part("function parseWhen", "// a duration in") + "; this.toEnglish = toEnglish; this.parseWhen = parseWhen", ctx)
const mins = (q) => { const w = ctx.parseWhen(ctx.toEnglish(q.toLowerCase())); return w && Math.round((w.when - Date.now()) / 60000) }
const en = (q) => ctx.toEnglish(q.toLowerCase())
// English stays English
for (const q of ["timer 10 minutes", "alarm at 7:30", "cancel the alarm", "show my alarms", "remind me in 20 minutes to stretch"]) assert.equal(en(q), q.toLowerCase(), q)
// the same command in other languages
assert.equal(mins("Timer 10 Minuten"), 10)
assert.match(en("Timer 10 Minuten"), /\btimer\b/)
assert.equal(mins("10 minute ka timer"), 10)
assert.equal(mins("recuérdame en 5 minutos beber agua"), 5)
assert.match(en("recuérdame en 5 minutos"), /remind me/)
assert.equal(mins("rappelle-moi dans 5 minutes"), 5)
assert.match(en("Wecker um 7:30"), /alarm at 7:30/)
assert.match(en("réveil à 7h30"), /alarm at 7:30/)
assert.match(en("kal 7 baje alarm"), /tomorrow at 7 alarm/)
assert.match(en("wie spät ist es?"), /what time is it/)
assert.match(en("lösche den Timer"), /cancel/)
assert.match(en("zeig meine Wecker"), /show my alarm/)
for (const q of ["Führe mich durch das Anlegen", "guíame para crear un tablero", "guide-moi pour créer un tableau"]) assert.match(en(q), /guide me/, q)
console.log("words checks ok")
