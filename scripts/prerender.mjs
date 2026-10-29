// Pre-render: saves the finished text of the info pages into plain HTML files
// (dist/features.html, dist/howto.html, ...), so search engines and AI bots that
// do not run JavaScript still read the whole page. People get the normal app:
// React replaces this copy as soon as it starts.
//
// Run after the website build: npm run build:site
// Needs Chrome on this computer. Without it the build stays as it is (a warning only).
import { createServer } from 'node:http'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = 'dist'
const SITE = 'https://showmewise.netlify.app'
const PAGES = [
  { path: '/', file: 'index.html',
    description: 'Turn a screen recording into a step-by-step guide with the clicks marked, as HTML, PDF or Word. Free, no account, and your video stays on your computer.' },
  { path: '/features', file: 'features.html',
    description: 'Everything ShowMeWise can do: record once and get a marked guide, ask your video or document, and the browser plugin with its pet helper.' },
  { path: '/howto', file: 'howto.html',
    description: 'How to use ShowMeWise: from a screen recording to a finished guide in eight steps, with real screenshots of the app.' },
  { path: '/policy', file: 'policy.html',
    description: 'ShowMeWise privacy, terms and credits: what stays on your computer, what the website loads, and the open-source parts it uses.' },
  { path: '/legal', file: 'legal.html',
    description: 'Legal notice for ShowMeWise, a free, non-commercial, open-source project by Aryan Bajaj.' },
]

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm', '.txt': 'text/plain', '.xml': 'application/xml' }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

let chromium
try { ({ chromium } = await import('playwright-core')) } catch { console.warn('prerender: playwright-core missing, skipped'); process.exit(0) }

const template = await readFile(join(DIST, 'index.html'), 'utf8')

// a small server for dist, same as Netlify: file, else page.html, else index.html
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  for (const f of [p, p + '.html', '/index.html']) {
    try {
      const full = join(DIST, f)
      if (!(await stat(full)).isFile()) continue
      res.writeHead(200, { 'Content-Type': TYPES[extname(full)] || 'application/octet-stream', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' })
      return res.end(f === '/index.html' ? template : await readFile(full))
    } catch {}
  }
  res.writeHead(404); res.end()
}).listen(0)
const base = `http://localhost:${server.address().port}`

let browser
try {
  browser = await chromium.launch({ channel: 'chrome' })
} catch (e) {
  console.warn('prerender: Chrome not found, skipped (' + e.message.split('\n')[0] + ')')
  server.close(); process.exit(0)
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  for (const pg of PAGES) {
    await page.goto(base + pg.path, { waitUntil: 'load' })
    await page.waitForFunction(() => document.querySelector('#root h1'), null, { timeout: 15000 })
    await page.waitForTimeout(800)
    const { html, title } = await page.evaluate(() => {
      const root = document.querySelector('#root').cloneNode(true)
      root.querySelectorAll('canvas, script, style').forEach((n) => n.remove())
      return { html: root.innerHTML, title: document.title }
    })
    const url = SITE + pg.path
    let out = template
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(pg.description)}"`)
      .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
      .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
      .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*"/g, `$1${esc(title)}"`)
      // the copy sits hidden in .pre until React draws the page (readers without JavaScript see it)
      .replace(/<div id="root">[\s\S]*?<\/main>\s*<\/div>/, `<div id="root"><div class="pre">${html}</div></div>`)
    if (pg.path !== '/') out = out.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/, '')
    if (!out.includes('class="pre"')) throw new Error('root not found in index.html for ' + pg.path)
    await writeFile(join(DIST, pg.file), out)
    console.log(`prerender: ${pg.file}  ${Math.round(out.length / 1024)} KB  "${title}"`)
  }
} finally {
  await browser.close(); server.close()
}
