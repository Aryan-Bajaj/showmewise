// Vidi's moves (the pet lives in a closed box on each page, so its style comes with it).
// The mood is set on the wrapper: data-mood = idle, happy, think, talk, sleep, alert or sad.
window.VidiPetCSS = String.raw`.vp { position: relative; width: 100%; height: 100%; }
.vp svg { width: 100%; height: 100%; overflow: visible; display: block; filter: drop-shadow(0 0 .6px rgba(0,0,0,.45)) drop-shadow(0 3px 4px rgba(0,0,0,.16)); }
.vp :is(.body, .head, .eye, .eyes, .tail, .wing, .ear, .mouth, .shadow) { transform-box: fill-box; }
.vp .body { transform-origin: 50% 100%; animation: vp-breathe 3.2s ease-in-out infinite; }
.vp .head { transform-origin: 50% 90%; animation: vp-bob 4s ease-in-out infinite; }
.vp .eye { transform-origin: 50% 50%; animation: vp-blink 4.6s infinite; }
.vp .eye + .eye { animation-delay: .03s; }
.vp .tail { transform-origin: 0% 90%; animation: vp-sway 2.6s ease-in-out infinite; }
.vp .wl { transform-origin: 100% 80%; animation: vp-flapl 3s ease-in-out infinite; }
.vp .wr { transform-origin: 0% 80%; animation: vp-flapr 3s ease-in-out infinite; }
.vp .el { transform-origin: 70% 100%; animation: vp-twitch 7s infinite; }
.vp .er { transform-origin: 30% 100%; animation: vp-twitch 7s 2.5s infinite; }
.vp .shadow { transform-origin: 50% 50%; }
.vp .mouth.open { opacity: 0; transform-origin: 50% 0%; }
.vp .fx { position: absolute; right: -6%; top: -14%; font: 700 14px/1 system-ui, sans-serif; color: #a78bfa; pointer-events: none; opacity: 0; }

@keyframes vp-breathe { 50% { transform: scaleY(1.035) scaleX(.99); } }
@keyframes vp-bob { 0%, 100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-1px) rotate(-2deg); } 70% { transform: translateY(.5px) rotate(2deg); } }
@keyframes vp-blink { 0%, 90%, 100% { transform: scaleY(1); } 93% { transform: scaleY(.08); } }
@keyframes vp-sway { 50% { transform: rotate(-9deg); } }
@keyframes vp-flapl { 50% { transform: rotate(-10deg); } }
@keyframes vp-flapr { 50% { transform: rotate(10deg); } }
@keyframes vp-twitch { 0%, 94%, 100% { transform: rotate(0); } 96% { transform: rotate(-12deg); } 98% { transform: rotate(6deg); } }

/* happy: hops, wags, flaps, smiles wide */
.vp[data-mood=happy] svg { animation: vp-hop .7s cubic-bezier(.3,.7,.4,1) 3; }
.vp[data-mood=happy] .shadow { animation: vp-shadow .7s 3; }
.vp[data-mood=happy] .tail { animation-duration: .45s; }
.vp[data-mood=happy] .wl, .vp[data-mood=happy] .wr { animation-duration: .35s; }
.vp[data-mood=happy] .mouth.open { opacity: 1; }
.vp[data-mood=happy] .mouth.smile { opacity: 0; }
.vp[data-mood=happy] .eye { animation: none; transform: scaleY(.55); }
@keyframes vp-hop { 0%, 100% { transform: translateY(0) scale(1, 1); } 15% { transform: translateY(0) scale(1.06, .92); } 50% { transform: translateY(-14%) scale(.96, 1.05); } 85% { transform: translateY(0) scale(1.04, .95); } }
@keyframes vp-shadow { 50% { transform: scale(.7); opacity: .12; } }

/* thinking: head tilted, eyes up, dots */
.vp[data-mood=think] .head { animation: vp-ponder 2.4s ease-in-out infinite; }
.vp[data-mood=think] .eyes { transform: translate(1.5px, -2px); }
.vp[data-mood=think] .fx { opacity: 1; animation: vp-dots 1.2s steps(4) infinite; }
@keyframes vp-ponder { 50% { transform: rotate(9deg) translateY(-1px); } }
@keyframes vp-dots { 0% { clip-path: inset(0 100% 0 0); } 100% { clip-path: inset(0 0 0 0); } }

/* talking: mouth moves while the answer is written */
.vp[data-mood=talk] .mouth.open { animation: vp-talk .32s ease-in-out infinite alternate; }
.vp[data-mood=talk] .mouth.smile { opacity: 0; }
.vp[data-mood=talk] .head { animation: vp-nod .64s ease-in-out infinite alternate; }
@keyframes vp-talk { from { opacity: 1; transform: scaleY(.3); } to { opacity: 1; transform: scaleY(1); } }
@keyframes vp-nod { to { transform: rotate(-3deg) translateY(.5px); } }

/* sleeping: eyes shut, slow breath, zzz */
.vp[data-mood=sleep] .eye { animation: none; transform: scaleY(.08); }
.vp[data-mood=sleep] .body { animation-duration: 5s; }
.vp[data-mood=sleep] .head { animation: vp-doze 5s ease-in-out infinite; }
.vp[data-mood=sleep] .tail, .vp[data-mood=sleep] .wl, .vp[data-mood=sleep] .wr, .vp[data-mood=sleep] .el, .vp[data-mood=sleep] .er { animation-play-state: paused; }
/* three Z's, small to big, floating up one after another (towards the page: --zx) */
.vp[data-mood=sleep] .fx { opacity: 1; white-space: nowrap; }
.vp .fx i { font-style: normal; display: inline-block; }
.vp[data-mood=sleep] .fx i { opacity: 0; animation: vp-z 3s ease-in infinite; }
.vp[data-mood=sleep] .fx i:nth-child(2) { animation-delay: 1s; font-size: 1.25em; }
.vp[data-mood=sleep] .fx i:nth-child(3) { animation-delay: 2s; font-size: 1.55em; }
@keyframes vp-z { 0% { opacity: 0; transform: translate(0, 8px) scale(.6) rotate(-10deg); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--zx, 12px), -22px) scale(1.1) rotate(8deg); } }
@keyframes vp-doze { 50% { transform: rotate(6deg) translateY(2px); } }
@keyframes vp-zzz { 0% { opacity: 0; transform: translate(0, 6px) scale(.7); } 40% { opacity: 1; } 100% { opacity: 0; transform: translate(8px, -10px) scale(1.1); } }

/* alert: timer or alarm, a shake with bounce */
.vp[data-mood=alert] svg { animation: vp-shake .5s ease-in-out infinite; }
.vp[data-mood=alert] .eye { animation: none; transform: scale(1.15); }
.vp[data-mood=alert] .mouth.open { opacity: 1; }
.vp[data-mood=alert] .mouth.smile { opacity: 0; }
.vp[data-mood=alert] .fx { opacity: 1; color: #f59e0b; animation: vp-ring .5s ease-in-out infinite; }
@keyframes vp-shake { 0%, 100% { transform: rotate(0) translateY(0); } 25% { transform: rotate(-6deg) translateY(-4%); } 75% { transform: rotate(6deg) translateY(-4%); } }
@keyframes vp-ring { 50% { transform: rotate(18deg) scale(1.15); } }

/* sad: something went wrong */
.vp[data-mood=sad] .head { animation: none; transform: rotate(-4deg) translateY(3px); }
.vp[data-mood=sad] .el { animation: none; transform: rotate(-12deg); }
.vp[data-mood=sad] .er { animation: none; transform: rotate(12deg); }
.vp[data-mood=sad] .tail { animation-duration: 6s; }
.vp[data-mood=sad] .mouth.smile { transform: scaleY(-1); transform-origin: 50% 50%; }

/* a pet made from the user's picture: the picture itself moves */
.vp .pic { width: 100%; height: 100%; border-radius: 42% 42% 38% 38%; object-fit: cover; display: block; transform-origin: 50% 100%;
  animation: vp-breathe 3.2s ease-in-out infinite; box-shadow: 0 6px 14px rgba(0,0,0,.25); }
.vp[data-mood=happy] .pic { animation: vp-hop .7s cubic-bezier(.3,.7,.4,1) 3; }
.vp[data-mood=think] .pic { animation: vp-ponder 2.4s ease-in-out infinite; }
.vp[data-mood=talk] .pic { animation: vp-nod .4s ease-in-out infinite alternate; }
.vp[data-mood=sleep] .pic { animation: vp-doze 5s ease-in-out infinite; filter: saturate(.7) brightness(.9); }
.vp[data-mood=alert] .pic { animation: vp-shake .5s ease-in-out infinite; }
.vp[data-mood=sad] .pic { animation: none; transform: rotate(-5deg) translateY(4%); filter: saturate(.6); }

@media (prefers-reduced-motion: reduce) { .vp *, .vp svg, .vp .pic { animation: none !important; } }
`
