// Vidi's ready pets, drawn as small vector pictures (our own drawings).
// Every pet has the same parts (body, head, eyes, mouth, tail, ears or wings)
// so one set of animations in pet.css moves them all.
// Colours: --c1 main, --c2 dark, --c3 light (belly, face), --c4 accent.
;(function () {
  const eyes = (l, r, y) => `<g class="eyes">
    <g class="eye"><ellipse cx="${l}" cy="${y}" rx="4.6" ry="5.6" fill="#1d1530"/><circle cx="${l + 1.6}" cy="${y - 2}" r="1.7" fill="#fff"/></g>
    <g class="eye"><ellipse cx="${r}" cy="${y}" rx="4.6" ry="5.6" fill="#1d1530"/><circle cx="${r + 1.6}" cy="${y - 2}" r="1.7" fill="#fff"/></g></g>`
  const mouth = (x, y) => `<path class="mouth smile" d="M${x - 5} ${y} q5 4.5 10 0" stroke="var(--c2)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse class="mouth open" cx="${x}" cy="${y + 1.5}" rx="3.6" ry="3" fill="#5a1730"/>`
  const cheeks = (l, r, y) => `<ellipse cx="${l}" cy="${y}" rx="4.5" ry="2.6" fill="#ff7aa8" opacity=".45"/><ellipse cx="${r}" cy="${y}" rx="4.5" ry="2.6" fill="#ff7aa8" opacity=".45"/>`
  const shadow = `<ellipse class="shadow" cx="60" cy="112" rx="28" ry="4.5" fill="#000" opacity=".22"/>`
  const feet = `<ellipse cx="47" cy="105" rx="9" ry="5" fill="var(--c2)"/><ellipse cx="73" cy="105" rx="9" ry="5" fill="var(--c2)"/>`

  const ART = {
    dragon: `${shadow}
      <g class="tail"><path d="M80 98 C100 100 109 86 104 70" stroke="var(--c1)" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M104 72 l-8 -5 l10 -9 l3 12z" fill="var(--c4)"/></g>
      <g class="wing wl"><path d="M42 72 C24 50 12 54 9 66 C15 64 19 67 21 72 C25 68 30 70 32 77z" fill="var(--c2)"/></g>
      <g class="wing wr"><path d="M78 72 C96 50 108 54 111 66 C105 64 101 67 99 72 C95 68 90 70 88 77z" fill="var(--c2)"/></g>
      <g class="body"><path d="M60 62 C79 62 87 80 85 96 C83 107 37 107 35 96 C33 80 41 62 60 62z" fill="var(--c1)"/>
        <ellipse cx="60" cy="89" rx="14" ry="14" fill="var(--c3)"/>
        <path d="M49 84 h22 M48 90 h24 M50 96 h20" stroke="var(--c1)" stroke-width="1.4" opacity=".5"/>
        <ellipse cx="43" cy="84" rx="5" ry="7.5" fill="var(--c1)" transform="rotate(20 43 84)"/><ellipse cx="77" cy="84" rx="5" ry="7.5" fill="var(--c1)" transform="rotate(-20 77 84)"/>${feet}</g>
      <g class="head">
        <path class="ear el" d="M45 30 l-7 -15 l13 8z" fill="var(--c4)"/><path class="ear er" d="M75 30 l7 -15 l-13 8z" fill="var(--c4)"/>
        <ellipse cx="60" cy="44" rx="26" ry="22" fill="var(--c1)"/>
        <path d="M53 23 l3 -6 l3 6z M58 22 l3 -7 l3 7z M63 23 l3 -6 l3 6z" fill="var(--c4)"/>
        <ellipse cx="60" cy="55" rx="13" ry="8.5" fill="var(--c3)"/>
        <circle cx="56" cy="52" r="1.3" fill="var(--c2)"/><circle cx="64" cy="52" r="1.3" fill="var(--c2)"/>
        ${cheeks(41, 79, 52)}${eyes(48, 72, 41)}${mouth(60, 57)}</g>`,

    wolf: `${shadow}
      <g class="tail"><path d="M80 100 C104 102 110 82 100 66 C98 80 92 88 80 92z" fill="var(--c1)"/><path d="M100 66 C104 72 104 78 101 82 C99 76 98 71 100 66z" fill="var(--c3)"/></g>
      <g class="body"><path d="M60 62 C79 62 87 80 85 96 C83 107 37 107 35 96 C33 80 41 62 60 62z" fill="var(--c1)"/>
        <path d="M60 64 C70 70 72 84 66 98 L60 92 L54 98 C48 84 50 70 60 64z" fill="var(--c3)"/>${feet}</g>
      <g class="head">
        <g class="ear el"><path d="M38 38 L36 10 L56 26z" fill="var(--c1)"/><path d="M41 32 L40 17 L51 26z" fill="var(--c4)"/></g>
        <g class="ear er"><path d="M82 38 L84 10 L64 26z" fill="var(--c1)"/><path d="M79 32 L80 17 L69 26z" fill="var(--c4)"/></g>
        <path d="M60 22 C80 22 88 36 86 48 C84 58 74 66 60 66 C46 66 36 58 34 48 C32 36 40 22 60 22z" fill="var(--c1)"/>
        <path d="M60 40 C70 42 74 52 72 58 C68 64 52 64 48 58 C46 52 50 42 60 40z" fill="var(--c3)"/>
        <path d="M34 48 L42 52 L36 56z M86 48 L78 52 L84 56z" fill="var(--c3)"/>
        <ellipse cx="60" cy="50" rx="4" ry="3" fill="#1d1530"/>
        ${cheeks(42, 78, 53)}${eyes(48, 72, 39)}${mouth(60, 56)}</g>`,

    cat: `${shadow}
      <g class="tail"><path d="M80 100 C100 100 104 86 100 72 C98 64 104 58 108 60" stroke="var(--c1)" stroke-width="7" fill="none" stroke-linecap="round"/></g>
      <g class="body"><path d="M60 64 C78 64 84 82 83 96 C82 107 38 107 37 96 C36 82 42 64 60 64z" fill="var(--c1)"/>
        <ellipse cx="60" cy="90" rx="12" ry="13" fill="var(--c3)"/>${feet}</g>
      <g class="head">
        <g class="ear el"><path d="M36 36 L38 12 L56 26z" fill="var(--c1)"/><path d="M40 31 L41 18 L51 26z" fill="var(--c4)"/></g>
        <g class="ear er"><path d="M84 36 L82 12 L64 26z" fill="var(--c1)"/><path d="M80 31 L79 18 L69 26z" fill="var(--c4)"/></g>
        <ellipse cx="60" cy="45" rx="27" ry="22" fill="var(--c1)"/>
        <path d="M52 25 l3 7 M60 24 v8 M68 25 l-3 7" stroke="var(--c2)" stroke-width="2" stroke-linecap="round" opacity=".55"/>
        <path d="M57 51 h6 l-3 3z" fill="var(--c4)"/>
        <path d="M33 49 h11 M33 54 l11 -2 M87 49 h-11 M87 54 l-11 -2" stroke="var(--c2)" stroke-width="1.2" opacity=".6"/>
        ${cheeks(42, 78, 53)}${eyes(48, 72, 42)}${mouth(60, 56)}</g>`,

    fox: `${shadow}
      <g class="tail"><path d="M78 100 C108 104 114 76 98 60 C100 78 94 90 78 92z" fill="var(--c1)"/><path d="M98 60 C106 66 108 74 106 80 C102 74 99 68 98 60z" fill="var(--c3)"/></g>
      <g class="body"><path d="M60 62 C78 62 85 80 84 96 C83 107 37 107 36 96 C35 80 42 62 60 62z" fill="var(--c1)"/>
        <path d="M60 64 C69 72 70 86 64 100 L56 100 C50 86 51 72 60 64z" fill="var(--c3)"/>${feet}</g>
      <g class="head">
        <g class="ear el"><path d="M34 40 L32 8 L56 26z" fill="var(--c1)"/><path d="M38 33 L37 16 L50 26z" fill="var(--c2)"/></g>
        <g class="ear er"><path d="M86 40 L88 8 L64 26z" fill="var(--c1)"/><path d="M82 33 L83 16 L70 26z" fill="var(--c2)"/></g>
        <path d="M60 24 C80 24 88 36 87 46 C85 54 72 66 60 66 C48 66 35 54 33 46 C32 36 40 24 60 24z" fill="var(--c1)"/>
        <path d="M33 46 C40 48 50 52 60 66 C48 66 35 56 33 46z M87 46 C80 48 70 52 60 66 C72 66 85 56 87 46z" fill="var(--c3)"/>
        <ellipse cx="60" cy="58" rx="3.6" ry="2.6" fill="#1d1530"/>
        ${eyes(48, 72, 41)}${mouth(60, 61)}</g>`,

    owl: `${shadow}
      <g class="body"><path d="M60 22 C84 22 92 46 90 72 C88 98 78 106 60 106 C42 106 32 98 30 72 C28 46 36 22 60 22z" fill="var(--c1)"/>
        <path d="M60 60 C74 60 80 74 78 88 C76 100 44 100 42 88 C40 74 46 60 60 60z" fill="var(--c3)"/>
        <path d="M52 72 q3 3 6 0 M62 72 q3 3 6 0 M48 82 q3 3 6 0 M58 82 q3 3 6 0 M68 82 q3 3 6 0 M53 92 q3 3 6 0 M63 92 q3 3 6 0" stroke="var(--c2)" stroke-width="1.4" fill="none" opacity=".6"/>
        <path d="M50 106 v4 M54 106 v4 M66 106 v4 M70 106 v4" stroke="var(--c4)" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="wing wl"><path d="M32 56 C20 66 20 88 32 98 C36 86 36 70 32 56z" fill="var(--c2)"/></g>
      <g class="wing wr"><path d="M88 56 C100 66 100 88 88 98 C84 86 84 70 88 56z" fill="var(--c2)"/></g>
      <g class="head">
        <g class="ear el"><path d="M36 30 L34 12 L50 24z" fill="var(--c2)"/></g><g class="ear er"><path d="M84 30 L86 12 L70 24z" fill="var(--c2)"/></g>
        <circle cx="47" cy="42" r="12" fill="var(--c3)"/><circle cx="73" cy="42" r="12" fill="var(--c3)"/>
        <circle cx="47" cy="42" r="12" fill="none" stroke="var(--c4)" stroke-width="2"/><circle cx="73" cy="42" r="12" fill="none" stroke="var(--c4)" stroke-width="2"/>
        <path d="M56 50 L64 50 L60 57z" fill="var(--c4)"/>
        ${eyes(47, 73, 42)}<g class="mouth smile"></g><g class="mouth open"></g></g>`,
  }

  // colour choices for each pet: [main, dark, light, accent]
  const COLOURS = {
    dragon: { Emerald: ["#3fb97a", "#25804f", "#c8f2c0", "#ffb547"], Ruby: ["#e2535f", "#a3303b", "#ffd2b8", "#ffd166"], Night: ["#5b5fd6", "#33358f", "#c9cbff", "#7ff0d0"] },
    wolf: { Grey: ["#8a94a6", "#5b6474", "#eef1f5", "#f0a3b5"], Snow: ["#e8ecf2", "#a9b3c2", "#ffffff", "#f0a3b5"], Shadow: ["#4a4e5a", "#2b2e36", "#b9bfca", "#f0a3b5"] },
    cat: { Ginger: ["#f2a65a", "#c46f2a", "#fff1dd", "#f37ea0"], Grey: ["#9aa3b3", "#6a7282", "#f1f3f7", "#f37ea0"], Black: ["#3a3a44", "#1f1f26", "#8d8d9c", "#f37ea0"] },
    fox: { Red: ["#ee7a32", "#a8481a", "#fff4e8", "#ee7a32"], Arctic: ["#e9eef5", "#9fb0c6", "#ffffff", "#9fb0c6"], Silver: ["#7f8794", "#4b525e", "#eef0f3", "#7f8794"] },
    owl: { Brown: ["#a9784f", "#6f4b2e", "#f6e6cf", "#f2b632"], Snowy: ["#eef1f6", "#9aa6b8", "#ffffff", "#f2b632"], Purple: ["#8a6ad6", "#55409a", "#ece4ff", "#ffcf5a"] },
  }

  window.VidiPets = {
    kinds: Object.keys(ART),
    colours: COLOURS,
    svg(kind, colour) {
      // only a known pet and colour go into the picture code (anything else: the dragon)
      if (!Object.prototype.hasOwnProperty.call(ART, kind)) kind = "dragon"
      const set = COLOURS[kind]
      const c = (Object.prototype.hasOwnProperty.call(set, colour) && set[colour]) || Object.values(set)[0]
      return `<svg class="pet ${kind}" viewBox="0 0 120 120" style="--c1:${c[0]};--c2:${c[1]};--c3:${c[2]};--c4:${c[3]}" aria-hidden="true">${ART[kind] || ART.dragon}</svg>`
    },
  }
})()
