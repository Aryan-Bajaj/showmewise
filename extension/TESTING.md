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

## Store and search checklist (from the saved SEO Reel)

- Clear name and short description with the words people search ("screen recorder", "step-by-step guide", "chat with page").
- 1280 x 800 screenshots of the real panel, a small promo tile, the privacy policy link.
- The website mentions the plugin and links to its store page.

## Browsers

- Chrome and Edge: the plugin.
- Firefox: the website (with its own Record button) works; the plugin needs a Firefox version (sidebar instead of side panel, no desktopCapture) and comes later.
