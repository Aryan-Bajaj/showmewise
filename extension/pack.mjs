// Makes the Chrome Web Store package: dist-extension/videodoc-plugin-<version>.zip
// The local test address (127.0.0.1:8899) is taken out of the manifest, and the
// test list and this script are left out. Usage: node extension/pack.mjs
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

const SRC = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1")
const OUT = path.join(SRC, "..", "dist-extension")
const TMP = path.join(OUT, "plugin")
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true })

const SKIP = new Set(["pack.mjs", "TESTING.md", "STORE.md"])
for (const f of fs.readdirSync(SRC)) if (!SKIP.has(f)) fs.cpSync(path.join(SRC, f), path.join(TMP, f), { recursive: true })

const man = JSON.parse(fs.readFileSync(path.join(TMP, "manifest.json"), "utf8"))
const live = (list) => list.filter((u) => !u.includes("127.0.0.1"))
man.host_permissions = live(man.host_permissions)
man.content_scripts.forEach((c) => { c.matches = live(c.matches) })
fs.writeFileSync(path.join(TMP, "manifest.json"), JSON.stringify(man, null, 2) + "\n")
// the background worker lists the test address too; the store copy only knows the real site
const bg = path.join(TMP, "bg.js")
fs.writeFileSync(bg, fs.readFileSync(bg, "utf8").replace(', "http://127.0.0.1:8899"]', "]"))

const zip = path.join(OUT, `videodoc-plugin-${man.version}.zip`)
fs.rmSync(zip, { force: true })
// Windows: its own tar makes zip files (the one from Git does not)
const TAR = process.platform === "win32" ? "C:/Windows/System32/tar.exe" : "tar"
execFileSync(TAR, ["-a", "-c", "-f", zip, "-C", TMP, "."])
console.log("made", zip, Math.round(fs.statSync(zip).size / 1024), "KB")
