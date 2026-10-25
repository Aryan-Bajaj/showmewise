// Runnable check: node src/components/guide.check.mjs
// The guide's fallback finds the manual's section for what the user asked, without the AI.
import fs from "node:fs"
import vm from "node:vm"
import assert from "node:assert"
const src = fs.readFileSync(new URL("./PluginChat.jsx", import.meta.url), "utf8")
const words = src.slice(src.indexOf("const words = "), src.indexOf("\n", src.indexOf(".map((w) => w.replace(")))
const fn = src.slice(src.indexOf("export function manualSection"), src.indexOf("// the language of a message")).replace("export ", "")
const ctx = {}; vm.runInNewContext(`${words}\n${fn}\nthis.manualSection = manualSection`, ctx)
const manual = "Brightdesk user manual\nCreate a new board\nClick the New board button.\nType a name in the Board name field.\nClick Create board.\nInvite a person\nOpen People from the top menu.\nClick Invite, type their e-mail and click Send invite."
assert.equal(ctx.manualSection(manual, "how do I make a new board?").title, "Create a new board")
assert.equal(ctx.manualSection(manual, "how do I make a new board?").steps.length, 3)
assert.equal(ctx.manualSection(manual, "I want to invite my colleague").title, "Invite a person")
assert.equal(ctx.manualSection(manual, "naya board kaise banau?").title, "Create a new board")
assert.equal(ctx.manualSection(manual, "what is the weather"), null)
console.log("guide checks ok")
