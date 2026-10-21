// AI answers come as light Markdown ("**Adding a widget:**", "* Click Add").
// Shown raw, the stars make the answer hard to read. This turns headings,
// bullets, numbered steps and bold into real text, building React elements
// (never innerHTML), so an answer can not inject anything into the page.
const bold = (t) => t.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part.replace(/\*\*/g, '')))

export default function ChatText({ text }) {
  const blocks = []
  for (const raw of (text || '').split('\n')) {
    const line = raw.replace(/\s+$/, '')
    const bullet = line.match(/^\s*[*\-•]\s+(.*)$/)
    const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
    const head = line.match(/^\s*#{1,4}\s+(.*)$/)
    const indent = /^\s{2,}/.test(raw) ? 1 : 0
    if (bullet || num) {
      const kind = num ? 'ol' : 'ul'
      const item = { text: (num ? num[2] : bullet[1]), indent }
      const last = blocks[blocks.length - 1]
      if (last?.kind === kind) last.items.push(item); else blocks.push({ kind, items: [item], start: num ? Number(num[1]) : 1 })
    } else if (head) blocks.push({ kind: 'h', text: head[1] })
    else if (line.trim()) blocks.push({ kind: 'p', text: line.trim() })
    else blocks.push({ kind: 'gap' })
  }
  return (
    <div style={{ lineHeight: 1.6 }}>
      {blocks.map((b, i) => {
        if (b.kind === 'gap') return <div key={i} style={{ height: 6 }} />
        if (b.kind === 'h') return <div key={i} style={{ fontWeight: 700, margin: '8px 0 4px' }}>{bold(b.text)}</div>
        if (b.kind === 'p') {
          const only = b.text.replace(/\*\*/g, '')
          // a line like "Adding a widget:" introduces a list: show it as a small heading
          return <div key={i} style={{ margin: '2px 0', fontWeight: /:\s*$/.test(only) && only.length < 60 ? 700 : 400 }}>{bold(b.text)}</div>
        }
        const List = b.kind
        return (
          <List key={i} start={b.start} style={{ margin: '4px 0 6px', paddingLeft: 22, listStyle: b.kind === 'ol' ? 'decimal' : 'disc' }}>
            {b.items.map((it, j) => <li key={j} style={{ margin: '3px 0', marginLeft: it.indent * 14 }}>{bold(it.text)}</li>)}
          </List>
        )
      })}
    </div>
  )
}
