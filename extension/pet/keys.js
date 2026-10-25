// Runs before the page's own code: keys typed into the pet stop here, so the
// page's keyboard shortcuts never see them. (The page only sees the closed
// <vidi-pet> box, not a text field, so shortcuts on Stack Overflow fired.)
// The pet still gets its own keys (Escape) through window.__vidiKey.
;(() => {
  if (window.top !== window || window.__vidiKeys) return
  window.__vidiKeys = true
  for (const type of ["keydown", "keyup", "keypress"]) {
    window.addEventListener(type, (e) => {
      if (e.target?.tagName !== "VIDI-PET") return
      if (type === "keydown") window.__vidiKey?.(e)
      e.stopImmediatePropagation()
    }, true)
  }
})()
