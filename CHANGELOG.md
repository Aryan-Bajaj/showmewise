# Changelog

All notable changes to VideoDoc, version by version. Newest first.

## v5 (current)

The manual release: the clicks marked on the screen, in documents that read like a real process manual.

* **Marked screenshots.** Each action is pinned to its exact button or field with a numbered marker, using the OCR word positions and the narration timing. No marker is ever guessed.
* **Reads buttons and popups.** Short how-tos are read in full HD, and coloured buttons are found and read one by one.
* **Markers in clips and GIFs**, taken down as soon as the screen changes.
* **Process manual exports.** PDF, Word and HTML share one structure: cover, contents, purpose, what you need, the process at a glance, Part A, B, C with numbered actions and marked screenshots, result and tip boxes, checklist, quick reference, FAQ, page numbers.
* **Vid Chat shows the step** it answered from, with its marked screenshot and a play button, plus an optional web search.
* **Simple editing** with plain fields and labelled buttons.
* **Fixes.** The whole audio is transcribed (each window used to stop after 30 seconds), short videos split into several steps, and app names must appear on screen or in the audio. A screen error in one panel no longer blanks the page: the rest of the guide and the exports keep working.
* **Reads meeting recordings and dark screens.** A shared screen inside a meeting window is cut out from the margins and webcam tiles, so the text, the AI, the screenshots and the clips all see the app at full size. Dark-theme apps are read properly (light text on a dark background used to give almost nothing). A frame is taken about every 3 seconds in full HD.
* **Nothing important left out.** After each part is written, the codes, numbers, values, field names and actions that were said are checked against it; anything missing is asked for again by name. The AI also gets the screen text together with up to three pictures of each part.
* **Sturdier runs.** A dropped request to the local AI is tried again, and a part that still fails gets a second chance at the end. Every part that is left out says why in the browser console.
* **Honest progress.** No guessed run time: the time left is measured on your computer once writing starts. The transcription bar moves every few seconds and the download shows its size.
* **Accurate speech (optional).** Whisper large v3 turbo on the graphics card, for names, codes and mixed languages. If the graphics card cannot load it, the processor takes over by itself.
* **Long runs finish.** The page keeps the computer awake while a video is processed. The speech model is closed when the transcript is done, so its memory (up to 2 GB) goes back to the AI that writes the guide; a 16 GB laptop no longer swaps and each part is about 4 times faster. The AI gets a larger text window (8192 tokens), so long parts with three pictures are no longer refused.
* **No more graphics crash.** The animated app background kept the graphics card busy for hours while the page only waited, and on a full laptop that ended in a Windows crash. The app now uses a still background (0 % graphics load while waiting, measured).
* **Cleaner steps.** Folders of a menu tree read off the screen ("Expand Favorites") are no longer written as actions, and tips that only say something is irrelevant are dropped. A clear value on screen is never rewritten. The same action written twice in a row is kept once. Lines about what the trainer talks about ("Mention the option to save as") become the action itself ("Save as"), and remarks ("Acknowledge that this is test data") become the tip.
* **Silent clicks.** Windows, tabs and fields that appear on screen while nobody speaks are listed in time order for the AI, so a click that is only shown (not said) can become a step. Before, only the first part of the screen text of a long part reached the AI.
* **Measured, then decided.** Two long test runs judged against hand-written manuals: Self-verify removed correct details and added 20 to 30 minutes, so it is now off by default. Consolidate no longer moves a part to an earlier place in the guide (it only merges neighbours). The blur effects are gone (they kept the graphics card at 40 to 77 % while processing), which also made speech recognition about 30 % faster. Run-time notes now quote the measured times.
* **How to use page.** Every screen and every setting explained in plain English with real screenshots and numbered pins, plus all error messages with what to do.
* **Vidi, the help chat.** A help button at the bottom right of every page. It answers from the How to use text, knows which page you are on, notices error messages by itself and offers help (Yes / No), and reads pasted screenshots on your computer. Short answers unless you ask for details. Works without any AI, with Ollama, or with a small browser AI.
* **Ollama found, Ollama used.** When Ollama runs, the settings and Doc Chat choose it with its best (or quickest) model. Cloud models are never offered.
* **Harder to break.** A file that is not a video gets a clear message, a video without sound is documented from the screen, New video starts over after an error, closing the tab mid-run asks first, two buttons that did nothing were removed, edit boxes grow with their text.
* **Better chat answers.** Vid Chat now searches the written steps (it used to search only the transcript), finds exact words as well as meaning, answers order questions (first, after, last) from the right part, skips the summary sections of a guide saved by VideoDoc (they mixed other parts into an answer), and shows lists and bold text cleanly. Text in a video or document can not give the AI orders.
* **Site.** New logo, privacy and terms page, share previews, sitemap, security headers, updated dependencies. On a phone, a notice says up front that VideoDoc is made for a computer and how much it would download. The in-browser model sizes on the site now match the app. Every sentence on the home page was checked against the app: no quality percentage that was never measured, no "done in minutes", honest speech accuracy, and the roadmap no longer lists languages that already work. On a phone the top bar and the size strip fit in one line, the phone notice is no longer covered by the help button, and the How to use pictures show their numbers when tapped (large, swipe sideways).

## v4

Accuracy release, driven by testing against a real 32 minute screen recording of a business app and checking every generated step against the actual video.

* **Structured output.** The model replies in schema constrained JSON on every engine (Ollama, llama.cpp, WebLLM), so malformed or chatty replies are impossible. The schema forces the model to describe what it sees on screen before it may decide a segment has no step, which fixed the biggest source of missed steps in real meeting recordings.
* **Screen share detection.** Webcam only minutes at the start of a meeting can no longer produce fabricated steps.
* **Scene based steps.** Step boundaries follow pixel level screen changes instead of a fixed clock, so steps line up with what actually happened.
* **Recall guard.** A skipped segment with real evidence (spoken action words or a busy screen) gets a second look before it is allowed to vanish.
* **Grounded summaries.** The executive summary no longer invents decisions, outcomes or next steps to round off the story, and never names software that was not on screen.
* **Cleaner input.** Meeting chatter, filler and speech recognition repeats are scrubbed from the transcript before the model sees it. Garbled OCR identifiers are stripped from results.
* **Editing.** Steps can now be reordered and removed, not just edited, and every change flows into the exports.
* **Two builds.** A hosted web build with per video size and length limits, and a fully offline desktop build that bundles llama.cpp with the gemma 3 vision model (see desktop/README.md).

## v3 — Sees and hears, like a person

The biggest leap yet. The AI now watches the screen and hears every word, so a recording becomes a real Desktop Procedure you can follow without opening the video.

* **Vision.** The AI sees the actual screenshots (gemma3 via Ollama, or Phi-3.5-Vision in the browser), not just OCR text. It names exact buttons and works out "click here" by looking.
* **Whisper Small.** A far more accurate transcript: names, accents and technical jargon.
* **A real Desktop Procedure.** Index, Purpose, Prerequisites, numbered steps (action, result, note, screen capture), Key Observations, Executive Summary, FAQ, and a flow diagram.
* **Sharp WebM step clips.** True colour, clearer and smaller than GIFs, inlined into the self-contained HTML.
* **Smarter steps.** One clean step per segment, off-topic and silent stretches skipped, duplicates merged. A one-hour video reads as roughly 30 to 35 steps, not 48 fragments.
* **Steps say WHERE.** Each action names the app, ribbon, tab or menu, not just the element.
* **RAG-grounded FAQ.** Diverse questions from the discussion, each answer retrieved from the transcript and enriched with the model's general knowledge, without inventing specifics.
* **Clean phased flow diagram**, **hidden transcript for AI tools**, **stronger model picker**, **faster and safer pipeline** (cancel, progress bar, no stalls), and **domain mishearing fixes**.

## v2 — Eyes, motion, and chat

* **OCR** reads on-screen text; tools (Excel, SAP, VBA and more) are auto-detected.
* **Animated step GIFs** of the real action.
* **Vid Chat (RAG):** ask your recording questions, with grounded answers and the matching frame.
* **Chunking** for long videos, with whole-video coverage.
* **You name the guide**, a browser-first **model picker**, and a standalone **Doc Chat** app.

## v1 — The basics

* Transcribe a recording and grab frames every few seconds.
* One LLM call per segment to write the steps.
* A few static screenshots per step.
* Export to HTML.
