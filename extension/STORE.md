# Chrome Web Store listing

Copy these into the developer dashboard when uploading `dist-extension/videodoc-plugin-1.0.0.zip`
(made with `node extension/pack.mjs`).

## Name
VideoDoc: record, guide, chat

## Short description (132 characters max)
Record your screen and get a step-by-step guide. Ask Vidi about your video, any page or a PDF. Free, runs on your computer.

## Category
Productivity (Tools as second choice)

## Language
English

## Detailed description
Turn a screen recording into a step-by-step guide, right from your browser bar.

RECORD ANY APP
Press Record, choose the whole screen, one app window or a tab, and do your task while you explain it out loud. Optional: type the names and codes of your app as key words first, so they are spelled right. Press Stop: VideoDoc writes the guide by itself, with numbered steps, marked screenshots, short clips, a checklist and questions and answers. Save it as HTML, PDF or Word.

A SMALL WINDOW, NOT IN YOUR WAY
The steps and the time left are in a small window under the VideoDoc icon. You get a notification when your guide is ready. The computer stays awake while it records or writes.

ASK VIDI
Vidi answers from your video, from the page you are on, from a document (PDF, Word, web page or text), or about VideoDoc itself. If the answer is not on the page, Vidi reads the links on it that match your question and tells you which pages it read.

SHOW ME ON THE PAGE
Lost on a page? Vidi marks the right button on the real page, with a numbered tag beside it, and puts a screenshot in the chat. It never clicks for you.

FREE AND PRIVATE
VideoDoc is free and runs on your own computer through the VideoDoc website (videodoc.netlify.app): no account, no upload, no tracking. It works with Ollama on your computer, or with a smaller AI that runs in the browser. A guide is a strong first draft: read it before you share it.

## Single purpose (for the review)
Turn screen recordings into written guides and answer questions about them, the page the user is on and the user's documents.

## Why each permission is needed (for the review)
- desktopCapture: to record the screen, a window or a tab when the user presses Record.
- sidePanel: to show VideoDoc next to the page when the user chooses "Open on the side".
- notifications: to say when a guide is ready.
- storage: to keep the user's settings and the current chat until the browser closes.
- power: to keep the computer awake while a recording or a guide is in progress, so the work is not cut off.
- scripting and activeTab: to read the text of the page the user asks about, and to mark buttons on it when the user presses "Show me on the page".
- Host permission for videodoc.netlify.app: the plugin uses the VideoDoc website in a tab to do the work on the user's computer.
- Optional host permission for all sites: asked for only when the user first asks about a page, so Vidi can read that page and up to 3 linked pages of the same site.

## Remote code
No. All code is in the package. AI models are data files downloaded by the VideoDoc website, not code run by the plugin.

## Data use (privacy tab)
- No data is collected, sold or sent to the developer.
- Page text and documents are read on the user's computer only to answer the user's question.
- Privacy policy: https://videodoc.netlify.app/#/policy

## Pictures to upload
- Icon 128 x 128: `extension/icons/icon128.png`
- Screenshots 1280 x 800: `dist-extension/store/shot-*.png`
- Small promo tile 440 x 280: `dist-extension/store/promo-440x280.png`
