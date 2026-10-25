// Runnable check: node src/lib/coverage.check.mjs
import assert from "node:assert"
import { inOtherPart } from "./coverage.js"
const docs = [
  { step: { steps: ["Open the Dashboards tab", "Click New dashboard", "Type Weekly Overview"] } },
  { step: { steps: ["Click Add widget", "Select Bar chart"] } },
  { step: { steps: ["Click Edit", "Type Tasks this week", "Click Save"] } },
  { step: { steps: ["Click Share", "Switch on anyone with the link", "Copy the link"] } },
]
// the noise seen on 24 Oct 2026: things another part already has
assert.equal(inOtherPart("Use 'Add widget'.", docs, 3), true)
assert.equal(inOtherPart("Use 'New dashboard'.", docs, 1), true)
assert.equal(inOtherPart("Click Share.", docs, 2), true)
// real gaps stay
assert.equal(inOtherPart("Use 'Export PDF'.", docs, 3), false)
assert.equal(inOtherPart("Click Duplicate.", docs, 2), false)
console.log("coverage checks ok")
