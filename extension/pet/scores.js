// How often each AI was right in our own tests (posts of 24 Oct 2026: the pet's chat,
// guiding through a made-up tool, and filling a form from a made-up CV). Shown next to
// each AI so the user can choose; results on other computers and pages can differ.
// A model not listed was not tested. Used by the plugin (bg.js) and the website.
;(function (g) {
  g.VidiScores = {
    "gemma3:4b": { chat: [21, 21], guide: [17, 17], fill: [7, 7], speed: "quick (about 3 to 10 s)", where: "local" },
    "gemma4:31b-cloud": { chat: [22, 22], guide: [17, 17], fill: [7, 7], speed: "quick (about 2 to 4 s)", where: "cloud" },
    "gemma3:12b": { guide: [13, 16], speed: "slow (about 50 s a step)", where: "local" },
    webllm: { speed: "slow (about 15 to 50 s), nothing to install", where: "browser" },
  }
  // one number for a model: all its test checks together, in %
  g.VidiScore = (name) => {
    const s = g.VidiScores[name]; if (!s) return null
    const all = ["chat", "guide", "fill"].filter((k) => s[k])
    if (!all.length) return null
    const right = all.reduce((n, k) => n + s[k][0], 0), total = all.reduce((n, k) => n + s[k][1], 0)
    return Math.round((right * 100) / total)
  }
})(typeof self !== "undefined" ? self : window)
