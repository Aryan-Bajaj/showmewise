// Plays Vidi's chime for timers and alarms: two soft bell notes, again and
// again for the given seconds, until "Stop" closes this hidden page.
chrome.runtime.onMessage.addListener((m) => {
  if (m?.to !== "sound") return
  const ac = new AudioContext()
  const bell = (t, f) => {
    const o = ac.createOscillator(), g = ac.createGain()
    o.type = "sine"; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1.2)
  }
  for (let s = 0; s < (m.seconds || 6); s += 2) { bell(ac.currentTime + s, 880); bell(ac.currentTime + s + 0.35, 1175) }
})
