# VideoDoc plugin: test list

Every release of the plugin (and the website's recorder) goes through this list.
Each line says what a user does and what must happen.

## Recording (website button and plugin)

| # | The user... | It must... |
|---|---|---|
| R1 | records the whole screen, talks, works in another app, stops | give a video with sound and a known length; the guide starts |
| R2 | records one app window, then minimises it | keep recording; the guide shows that window |
| R3 | records a browser tab | work the same |
| R4 | closes the screen picker without choosing | say "Recording was not started", nothing else changes |
| R5 | blocks the microphone | record without voice and say why |
| R6 | ends with the browser's own "Stop sharing" bar | finish like the Stop button |
| R7 | closes the shared window while recording | finish the recording |
| R8 | closes the VideoDoc tab while recording | offer the cut-short recording on the next visit ("Use it") |
| R9 | stops after 1 to 2 seconds | not crash; say the video is too short or empty |
| R10 | records past the website's limit | stop by itself at the limit |
| R11 | starts a recording while a guide is being written | refuse with a clear message |

## Plugin

| # | The user... | It must... |
|---|---|---|
| P1 | records with no VideoDoc tab open | open the VideoDoc tab by itself (pinned) |
| P2 | has two VideoDoc tabs open | use one of them, not mix them |
| P3 | opens the side panel in the middle of a run | show the current steps |
| P4 | closes the VideoDoc tab while it writes | show "Continue"; Continue picks up where it stopped |
| P5 | waits for the guide | get a notification; clicking it opens the guide |
| P6 | leaves the laptop alone during a run | the computer must not sleep (powercfg /requests shows the request) |
| P7 | recorded with no AI used before | be told to choose the AI in the VideoDoc tab |
| P8 | turns off "start by itself" | not start writing by itself |

## Chat

| # | The user... | It must... |
|---|---|---|
| C1 | asks "This video" with no video yet | say to record or upload a video first |
| C2 | asks "This video" while only the speech is ready | answer from the speech |
| C3 | asks "This page" and refuses the permission | say it needs the OK, nothing else |
| C4 | asks "This page" on a browser or store page | say these pages are protected |
| C5 | asks something that is only on a linked page | read the matching links (same site, at most 3) and say which |
| C6 | picks a PDF, a Word file, a web page | answer from it |
| C7 | picks a scanned PDF | say it has no text to read |
| C8 | picks a file over 25 MB or a wrong type | refuse with a clear message |
| C9 | asks on a page that contains code or HTML tags | show them as plain text, never run them |
| C10 | has no Ollama | fall back to the browser AI (not tested on the 4 GB laptop: WebGPU froze it) |

## Security checklist (from the saved security Reel)

- No secrets or keys in the code or the package.
- Permissions: only what is used; reading other sites is optional and asked for on first use.
- No code loaded from the internet (Chrome store rule); strict content security policy.
- The helper script runs only on the VideoDoc website; messages from other pages and frames are ignored.
- Text from pages and answers is shown as plain text (textContent), never as HTML.
- Nothing is uploaded; the chat and the guide run on the computer.

## Your pet (BETA), automatic test: `pet_check.mjs`

- Shows on a normal page after the OK for pages; not on the VideoDoc website.
- Covers no button, link, picture or text, also on a page whose right edge is full of buttons.
- Click opens the chat, Escape closes it, typing in it does not trigger the page's shortcuts.
- Timer, reminder (with its text), alarm (24-hour time), list and cancel; "timer" alone and an impossible time ask again; ringing shows Stop, a notification and plays the chime; "stop" ends it.
- The time, renaming the pet, my name and what I like are remembered.
- Crazy inputs: empty message, HTML in a message (shown as text), a huge message (cut to 2000 letters), five messages at once.
- AI: knows my name, general question, "this page", web search with links and "More results", a VideoDoc question goes to Help, the feedback buttons.
- Drag to the left (kept after reload), Hide on this site, off and on in all tabs, hidden in full screen.
- All five pets, a pet from a picture, a 3D pet (.glb), choosing and renaming in the panel.
- A reminder missed while the browser was closed is told on start; it falls asleep after two quiet minutes and wakes up happy.
- After many quick clicks the chat keeps a real size (never 0), so New chat and Close stay on the screen; New chat and Earlier chats work.

## Pet guide, intro and fresh questions: `pet_guide.mjs`, `pet_setup.mjs`, `pet_fresh.mjs`

- Guide with a made-up tool and manual (18 checks): asks when unclear, one step at a time, Done, next step, stop, off topic questions answered normally, and a single field never asks "which one?".
- Intro and setup (25 checks): greeting on browser start, suggestion buttons, Meet your pet questions, Ollama missing, blocked and ready, cloud with a local backup, phone width.
- Fresh questions (26 checks): new facts, typos, empty message, Hinglish, a huge request, explain a page without copying it, same name buttons on a shop page, and help in the middle of a task goes on from the step the user is at.
- All of them run with the local and the cloud AI in `regress.sh`, one after the other.

## Store and search checklist (from the saved SEO Reel)

- Clear name and short description with the words people search ("screen recorder", "step-by-step guide", "chat with page").
- 1280 x 800 screenshots of the real panel, a small promo tile, the privacy policy link.
- The website mentions the plugin and links to its store page.

## Browsers

- Chrome and Edge: the plugin.
- Firefox: the website (with its own Record button) works; the plugin needs a Firefox version (sidebar instead of side panel, no desktopCapture) and comes later.
