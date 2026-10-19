import { buildGuide, renderGuideShots, figureCaption } from './guideModel'

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Convert LLM markdown output to safe HTML
function mdToHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[*-]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1</p>')
}

// Fallback media when a step has no clip: the step's frames as a slideshow.
function getClipFrames(allFrames, centerTs, windowSecs = 15) {
  if (!allFrames?.length) return []
  return allFrames
    .filter(f => Math.abs(f.timestamp - centerTs) <= windowSecs)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(f => f.imageData)
    .filter(Boolean)
}

function buildAnimatedMedia(frames, index) {
  const n = frames.length
  const frameDuration = 0.7
  const totalDuration = n * frameDuration
  const pct = +(100 / n).toFixed(3)
  const name = `af${index}`
  const imgs = frames.map((src, i) =>
    `<img src="${src}" class="anim-frame" alt="" style="animation:${name} ${totalDuration}s steps(1,end) infinite;animation-delay:${(i * frameDuration).toFixed(2)}s">`).join('')
  return `<style>@keyframes ${name}{0%,${pct}%{opacity:1}${+(pct + 0.01).toFixed(3)}%,100%{opacity:0}}</style><div class="anim-wrap">${imgs}</div>`
}

export async function exportHTML(docs, videoName, allFrames, meta = {}) {
  const g = buildGuide(docs, meta)
  await renderGuideShots(g, { maxW: 1600 })
  const mermaidSvg = meta.mermaidSvg || ''
  const clips = meta.clips instanceof Map ? meta.clips : new Map()
  const gifs = meta.gifs instanceof Map ? meta.gifs : new Map()
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const sections = []
  const sec = (id, title, body, lead = '') => {
    sections.push({ id, title })
    return `
<section id="${id}" class="sec reveal">
  <div class="sec-head"><span class="sec-n">${sections.length}</span><h2>${esc(title)}</h2></div>
  ${lead ? `<p class="lead">${lead}</p>` : ''}
  ${body}
</section>`
  }
  const table = (cols, rows, cls = '') => `
  <div class="tbl-wrap"><table class="tbl ${cls}">
    <thead><tr>${cols.map(c => `<th style="width:${c.w}%">${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`

  // ── 1 Purpose ──
  const purposeHtml = sec('purpose', 'Purpose', `
  <div class="card prose">
    ${g.purpose.map(p => `<p>${esc(p)}</p>`).join('')}
    ${g.parts.length ? `<p>The process covers the following tasks:</p><ul>${g.parts.map(p => `<li><a href="#part-${p.letter}">${esc(p.title)}</a></li>`).join('')}</ul>` : ''}
  </div>
  ${g.summary.length ? `<div class="card prose insh"><div class="mini">In short</div>${g.summary.map(mdToHtml).join('')}</div>` : ''}`)

  // ── 2 Before you start ──
  const needsHtml = g.needs.length ? sec('before', 'Before you start',
    g.needs.some(n => n.detail)
      ? table([{ label: 'What', w: 32 }, { label: 'Details', w: 68 }], g.needs.map(n => [`<b>${esc(n.what)}</b>`, esc(n.detail || '-')]), 'label-col')
      : table([{ label: 'What you need', w: 100 }], g.needs.map(n => [esc(n.what)])),
    'Have the following ready before you begin.') : ''

  // ── 3 Process at a glance ──
  const glanceHtml = sec('glance', 'Process at a glance', `
  <div class="glance">
    ${g.parts.map((p, i) => `
    <a class="g-card" href="#part-${p.letter}">
      <span class="g-n">${p.letter}</span>
      <span class="g-t">${esc(p.title)}</span>
      <span class="g-d">${esc(p.first)}</span>
    </a>${i < g.parts.length - 1 ? '<span class="g-arrow" aria-hidden="true">&rarr;</span>' : ''}`).join('')}
  </div>
  ${table([{ label: 'Part', w: 9 }, { label: 'Task', w: 33 }, { label: 'What you do', w: 58 }], g.parts.map(p => [`<span class="pill">${p.letter}</span>`, esc(p.title), esc(p.first)]))}`,
  `The process has ${g.parts.length} part${g.parts.length === 1 ? '' : 's'}. Click a card to jump to it.`)

  // ── 4 Step by step ──
  const partsHtml = g.parts.map((p, i) => {
    const clip = clips.get(p.timestamp)
    const gif = gifs.get(p.timestamp)
    const frames = getClipFrames(allFrames, p.timestamp, 12)
    const media = clip
      ? `<video src="${clip}" autoplay muted loop playsinline></video>`
      : gif ? `<img src="${gif}" alt="${esc(p.title)}">`
      : frames.length > 1 ? buildAnimatedMedia(frames, i)
      : frames.length === 1 ? `<img src="${frames[0]}" alt="${esc(p.title)}">` : ''
    const zoom = p.doc.zoomFrame ? `<figure class="zoom"><img src="${p.doc.zoomFrame}" alt="Where it happens"><figcaption>Zoomed: where this part happens on screen</figcaption></figure>` : ''
    const groups = p.groups.map(grp => {
      const shot = grp.shotIdx >= 0 ? p.shots[grp.shotIdx] : null
      return `
      <div class="grp">
        ${grp.subs.map(s => `
        <div class="sub"><span class="sub-id">${s.id}</span><p>${esc(s.text)}</p></div>`).join('')}
        ${shot?.rendered ? `
        <figure class="shot"><img src="${shot.rendered.dataUrl}" alt="${esc(figureCaption(p, shot))}" data-zoom loading="lazy">
          <figcaption>${esc(figureCaption(p, shot))}</figcaption></figure>` : ''}
      </div>`
    }).join('')
    return `
  <article class="part reveal" id="part-${p.letter}">
    <header class="part-head">
      <span class="part-badge">Part ${p.letter}</span>
      <h3>${esc(p.title)}</h3>
      ${p.label ? `<span class="ts">${esc(p.label)}</span>` : ''}
    </header>
    <div class="part-body">
      <div class="part-steps">${groups}
        ${p.result ? `<div class="result"><span>Result</span><p>${esc(p.result)}</p></div>` : ''}
        ${p.tip ? `<div class="box ${p.lowConfidence ? 'warn' : 'tip'}"><b>${p.lowConfidence ? 'Important' : 'Tip'}</b><p>${esc(p.tip)}</p></div>` : ''}
      </div>
      ${media || zoom ? `<aside class="part-media"><div class="watch">${media ? `<div class="mini">Watch it</div><div class="clip">${media}</div>` : ''}${zoom}</div></aside>` : ''}
    </div>
  </article>`
  }).join('')
  const stepsHtml = sec('steps', 'Step by step', partsHtml,
    'Follow the parts in order. Each numbered action matches a marker on the screenshot below it. Click a screenshot to enlarge it.')

  // ── Checklist ──
  const checklistHtml = sec('checklist', 'Checklist', `
  <div class="card check">
    ${g.checklist.map((c, i) => `<label class="ck"><input type="checkbox" data-ck="${i}"><span class="pill">${c.part}</span><span>${esc(c.text)}</span></label>`).join('')}
  </div>`, 'Tick each item as you go. Your ticks stay on this device.')

  // ── Quick reference ──
  const quickHtml = g.quickRef.some(q => q.entries) ? sec('quick', 'Quick reference',
    table([{ label: 'Part', w: 9 }, { label: 'Task', w: 41 }, { label: 'Key entries', w: 50 }], g.quickRef.map(q => [`<span class="pill">${q.part}</span>`, esc(q.title), esc(q.entries || '-')]))) : ''

  // ── Questions and answers ──
  const faqHtml = g.faqs.length ? sec('faq', 'Questions and answers', `
  <div class="faq-list">
    ${g.faqs.map((f, i) => `
    <details class="faq"${i === 0 ? ' open' : ''}>
      <summary><span>${esc(f.q)}</span><i>+</i></summary>
      <div class="faq-a">${mdToHtml(f.a)}</div>
    </details>`).join('')}
  </div>`, 'Questions raised in the recording, plus ones a new reader may have.') : ''

  // ── Process flow ──
  const flowHtml = mermaidSvg ? sec('flow', 'Process flow', `<div class="card flow">${mermaidSvg}</div>`, 'How the parts connect, end to end.') : ''

  // Full transcript: hidden from readers, embedded so the file can be given to
  // an AI assistant for deeper questions.
  const transcript = Array.isArray(meta.transcript) ? meta.transcript : []
  const transcriptHtml = transcript.length ? `
<div id="videodoc-transcript" data-purpose="ai-context" aria-hidden="true" style="display:none">
${transcript.map((c) => {
    const ts = c.timestamp?.[0] ?? 0
    return `[${String(Math.floor(ts / 60)).padStart(2, '0')}:${String(Math.floor(ts % 60)).padStart(2, '0')}] ${esc(c.text || '')}`
  }).join('\n')}
</div>` : ''

  const body = [purposeHtml, needsHtml, glanceHtml, stepsHtml, checklistHtml, quickHtml, faqHtml, flowHtml].join('\n')
  const tocHtml = `
<section id="contents" class="sec reveal">
  <div class="sec-head"><h2>Contents</h2></div>
  <ol class="toc">
    ${sections.map(s => `<li><a href="#${s.id}">${esc(s.title)}</a>${s.id === 'steps' ? `<ol class="toc-parts">${g.parts.map(p => `<li><a href="#part-${p.letter}"><b>Part ${p.letter}</b> ${esc(p.title)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}
  </ol>
</section>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(g.title)}</title>
<style>
:root{
  --bg:#f7f6fc;--card:#ffffff;--ink:#1b1640;--ink2:#46426a;--ink3:#8a86a8;--line:#e4e0f3;
  --acc:#6d4aff;--acc2:#4b2fd1;--tint:#f1edff;--tint2:#faf9ff;--ok:#0f8c64;--okbg:#e8f7f0;
  --tip:#2296be;--tipbg:#eaf7fc;--warn:#c8820a;--warnbg:#fff7e6;--r:14px
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink);font-size:16px;line-height:1.65}
a{color:inherit}
nav{position:sticky;top:0;z-index:50;background:rgba(247,246,252,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.nav-in{max-width:1180px;margin:0 auto;padding:0 24px;height:58px;display:flex;align-items:center;gap:20px}
.brand{font-weight:700;font-size:15px;display:flex;align-items:center;gap:9px;text-decoration:none}
.brand i{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#3f62ff,#22d3ee);display:inline-block}
.nav-t{color:var(--ink3);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.nav-l{display:flex;gap:4px;list-style:none}
.nav-l a{text-decoration:none;font-size:13px;color:var(--ink2);padding:6px 12px;border-radius:8px}
.nav-l a:hover{background:var(--tint);color:var(--acc2)}
.pbar{position:fixed;top:0;left:0;height:3px;background:var(--acc);z-index:60;width:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.cover{padding:72px 0 40px;display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:end}
.kicker{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--acc2);background:var(--tint);padding:5px 12px;border-radius:20px;margin-bottom:18px}
.cover h1{font-size:46px;line-height:1.1;color:var(--acc);letter-spacing:-.01em;margin-bottom:16px}
.cover .sub{font-size:18px;color:var(--ink);max-width:560px}
.details{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.details div{display:grid;grid-template-columns:120px 1fr;border-bottom:1px solid var(--line)}
.details div:last-child{border-bottom:none}
.details b{background:var(--tint);padding:10px 14px;font-size:13px;color:var(--ink)}
.details span{padding:10px 14px;font-size:14px;color:var(--ink2)}
.sec{padding:44px 0 12px}
.sec-head{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.sec-n{width:34px;height:34px;border-radius:10px;background:var(--acc);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}
h2{font-size:28px;line-height:1.2;color:var(--ink)}
.lead{color:var(--ink2);margin-bottom:18px;max-width:760px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:22px 26px}
.prose p{margin-bottom:10px}.prose p:last-child{margin-bottom:0}.prose ul{padding-left:22px;margin:6px 0}
.prose a{color:var(--acc2);text-decoration:none}.prose a:hover{text-decoration:underline}
.insh{margin-top:14px;border-left:4px solid var(--acc)}
.mini{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--acc2);margin-bottom:8px}
.toc{list-style:none;counter-reset:t;columns:2;column-gap:40px}
.toc>li{counter-increment:t;margin-bottom:10px;break-inside:avoid}
.toc>li>a{font-weight:700;text-decoration:none}
.toc>li>a::before{content:counter(t);display:inline-block;width:26px;color:var(--acc)}
.toc a:hover{color:var(--acc2)}
.toc-parts{list-style:none;margin:6px 0 0 26px}
.toc-parts li{font-size:14px;color:var(--ink2);margin-bottom:4px}
.toc-parts a{text-decoration:none}.toc-parts b{color:var(--acc2);margin-right:4px}
.tbl-wrap{overflow-x:auto;margin-top:16px;border-radius:var(--r);border:1px solid var(--line)}
.tbl{width:100%;border-collapse:collapse;background:var(--card);font-size:14.5px}
.tbl th{background:var(--acc);color:#fff;text-align:left;padding:11px 14px;font-size:13px;letter-spacing:.02em}
.tbl td{padding:11px 14px;border-top:1px solid var(--line);vertical-align:top;color:var(--ink2)}
.tbl tbody tr:nth-child(even) td{background:var(--tint2)}
.label-col td:first-child{background:var(--tint)!important;color:var(--ink)}
.pill{display:inline-flex;min-width:26px;height:24px;padding:0 7px;border-radius:7px;background:var(--acc);color:#fff;font-weight:800;font-size:12px;align-items:center;justify-content:center}
.glance{display:flex;flex-wrap:wrap;align-items:stretch;gap:10px}
.g-card{flex:1 1 180px;max-width:250px;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px;text-decoration:none;display:flex;flex-direction:column;gap:6px;transition:transform .15s,box-shadow .15s,border-color .15s}
.g-card:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(60,40,160,.12);border-color:#cfc6ff}
.g-n{width:30px;height:30px;border-radius:50%;background:var(--acc);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.g-t{font-weight:700;line-height:1.3}
.g-d{font-size:13px;color:var(--ink3);line-height:1.45}
.g-arrow{align-self:center;color:#b9adff;font-size:20px}
.part{background:var(--card);border:1px solid var(--line);border-radius:18px;margin:22px 0 28px;overflow:hidden;scroll-margin-top:70px}
.part-head{display:flex;align-items:center;gap:14px;padding:16px 24px;background:linear-gradient(90deg,var(--tint),#fff);border-bottom:1px solid var(--line)}
.part-badge{background:var(--acc);color:#fff;font-weight:800;font-size:12.5px;letter-spacing:.06em;padding:5px 12px;border-radius:8px;white-space:nowrap}
.part-head h3{flex:1;font-size:19px;line-height:1.3}
.ts{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;color:var(--acc2);background:#fff;border:1px solid var(--line);padding:3px 10px;border-radius:20px}
.part-body{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:0}
.part-steps{padding:22px 24px}
.part-media{border-left:1px solid var(--line);background:var(--tint2)}
.watch{position:sticky;top:72px;padding:22px 22px}
.clip{border-radius:12px;overflow:hidden;background:#0f0b24;box-shadow:0 10px 30px rgba(20,10,60,.18)}
.clip video,.clip img{width:100%;display:block}
.anim-wrap{position:relative;aspect-ratio:16/9}
.anim-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0}
.zoom{margin-top:14px}.zoom img{width:100%;border-radius:10px;border:1px solid #d9d0ff}
.zoom figcaption{font-size:12px;color:var(--ink3);margin-top:4px}
.grp{margin-bottom:18px}
.sub{display:flex;gap:12px;align-items:flex-start;margin-bottom:9px}
.sub-id{flex-shrink:0;min-width:38px;height:26px;border-radius:7px;background:var(--acc);color:#fff;font-weight:800;font-size:12.5px;display:flex;align-items:center;justify-content:center}
.sub p{padding-top:1px}
.shot{margin:12px 0 4px}
.shot img{width:100%;display:block;border-radius:10px;border:1px solid var(--line);cursor:zoom-in;box-shadow:0 6px 22px rgba(30,20,90,.08)}
.shot figcaption{font-size:12.5px;color:var(--ink3);font-style:italic;text-align:center;margin-top:6px}
.result{display:flex;gap:12px;align-items:flex-start;background:var(--okbg);border-radius:10px;padding:11px 14px;margin-top:8px}
.result span{font-weight:800;color:var(--ok);font-size:13px;padding-top:1px}
.box{border-left:4px solid var(--tip);background:var(--tipbg);border-radius:0 10px 10px 0;padding:11px 14px;margin-top:10px}
.box b{display:block;font-size:13px;color:var(--tip);margin-bottom:2px}
.box.warn{border-color:var(--warn);background:var(--warnbg)}.box.warn b{color:var(--warn)}
.check{display:flex;flex-direction:column;gap:2px;padding:10px 14px}
.ck{display:flex;gap:12px;align-items:center;padding:10px 8px;border-radius:9px;cursor:pointer}
.ck:hover{background:var(--tint2)}
.ck input{width:18px;height:18px;accent-color:var(--acc);flex-shrink:0}
.ck input:checked~span:last-child{text-decoration:line-through;color:var(--ink3)}
.faq-list{display:flex;flex-direction:column;gap:10px}
.faq{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:14px;padding:15px 20px;font-weight:700}
.faq summary::-webkit-details-marker{display:none}
.faq summary:hover{background:var(--tint2)}
.faq i{font-style:normal;width:24px;height:24px;border-radius:50%;background:var(--tint);color:var(--acc2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .2s}
.faq[open] i{transform:rotate(45deg)}
.faq-a{padding:0 20px 16px;color:var(--ink2)}.faq-a p{margin-top:10px}
.flow{text-align:center;overflow-x:auto}.flow svg{max-width:100%;height:auto}
footer{margin-top:50px;background:var(--ink);color:#d8d4f0;text-align:center;padding:36px 20px;font-size:13.5px}
footer b{color:#c4b5fd}
.lb{position:fixed;inset:0;background:rgba(15,11,36,.88);display:none;align-items:center;justify-content:center;z-index:100;padding:24px;cursor:zoom-out}
.lb::after{content:'✕  Close';position:absolute;top:14px;right:18px;color:#fff;font:600 14px/1 system-ui,sans-serif;opacity:.85}.lb.on{display:flex}.lb img{max-width:100%;max-height:100%;border-radius:10px}
.reveal{opacity:0;transform:translateY(16px);transition:opacity .5s ease,transform .5s ease}
.reveal.visible{opacity:1;transform:none}
@media(max-width:900px){
  .cover{grid-template-columns:1fr;padding-top:44px}.cover h1{font-size:34px}
  .part-body{grid-template-columns:1fr}.part-media{border-left:none;border-top:1px solid var(--line)}
  .toc{columns:1}.nav-l{display:none}.g-arrow{display:none}.g-card{max-width:none}
}
@media print{nav,.pbar,.lb{display:none}.reveal{opacity:1;transform:none}.part{break-inside:avoid-page}.watch{position:static}}
</style>
</head>
<body>
<div class="pbar" id="pbar"></div>
<nav><div class="nav-in">
  <a class="brand" href="#top"><i></i>VideoDoc</a>
  <span class="nav-t">${esc(g.title)}</span>
  <ul class="nav-l">
    <li><a href="#glance">At a glance</a></li>
    <li><a href="#steps">Steps</a></li>
    <li><a href="#checklist">Checklist</a></li>
    ${g.faqs.length ? '<li><a href="#faq">FAQ</a></li>' : ''}
  </ul>
</div></nav>
<div class="wrap" id="top">
  <header class="cover">
    <div>
      <span class="kicker">Process guide</span>
      <h1>${esc(g.title)}</h1>
      ${g.subtitle ? `<p class="sub">${esc(g.subtitle)}</p>` : ''}
    </div>
    <div class="details">${g.details.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>
  </header>
  ${tocHtml}
  ${body}
</div>
${transcriptHtml}
<footer>Made with <b>VideoDoc</b> &bull; ${esc(date)} &bull; ${g.parts.length} parts &bull; ${g.figures} marked screenshots</footer>
<div class="lb" id="lb"><img alt=""></div>
<script>
(function(){
  var bar=document.getElementById('pbar');
  addEventListener('scroll',function(){var e=document.documentElement;bar.style.width=(e.scrollTop/(e.scrollHeight-e.clientHeight)*100)+'%'});
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting)x.target.classList.add('visible')})},{threshold:.05});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  var lb=document.getElementById('lb'),li=lb.querySelector('img');
  document.querySelectorAll('[data-zoom]').forEach(function(im){im.addEventListener('click',function(){li.src=im.src;lb.classList.add('on')})});
  lb.addEventListener('click',function(){lb.classList.remove('on')});
  addEventListener('keydown',function(e){if(e.key==='Escape')lb.classList.remove('on')});
  var key='vd-check-'+document.title;
  var saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
  document.querySelectorAll('[data-ck]').forEach(function(c){
    c.checked=!!saved[c.dataset.ck];
    c.addEventListener('change',function(){saved[c.dataset.ck]=c.checked;try{localStorage.setItem(key,JSON.stringify(saved))}catch(e){}});
  });
})();
</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${g.title}-docs.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
}
