# Chrome Web Store listing

Copy these into the developer dashboard when uploading `dist-extension/showmewise-plugin-1.0.0.zip`
(made with `node extension/pack.mjs`).

## Name
ShowMeWise: record, guide, chat

## Short description (132 characters max)
Record your screen and get a step-by-step guide. Ask Vidi about your video, any page or a PDF. Free, runs on your computer.

## Category
Productivity (Tools as second choice)

## Language
English

## Detailed description
Turn a screen recording into a step-by-step guide, right from your browser bar.

RECORD ANY APP
Press Record, choose the whole screen, one app window or a tab, and do your task while you explain it out loud. Optional: type the names and codes of your app as key words first, so they are spelled right. Press Stop: ShowMeWise writes the guide by itself, with numbered steps, marked screenshots, short clips, a checklist and questions and answers. Save it as HTML, PDF or Word.

A SMALL WINDOW, NOT IN YOUR WAY
The steps and the time left are in a small window under the ShowMeWise icon. You get a notification when your guide is ready. The computer stays awake while it records or writes.

ASK VIDI
Vidi answers from your video, from the page you are on, from a document (PDF, Word, web page or text), or about ShowMeWise itself. If the answer is not on the page, Vidi reads the links on it that match your question and tells you which pages it read.

SHOW ME ON THE PAGE
Lost on a page? Vidi marks the right button on the real page, with a numbered tag beside it, and puts a screenshot in the chat. It never clicks for you.

YOUR PET VIDI (BETA)
Vidi can sit at the edge of your web pages as a small animated pet: a dragon, wolf, cat, fox or owl, your own picture or your own 3D pet. It moves out of the way of buttons and text by itself. Click it to ask about the page, about ShowMeWise or anything else, to search the web (with links to the sources), or to set timers, alarms and reminders. Rename it, and it remembers your name. Give it your CV and it fills forms for you (it says which CV it uses, and never touches passwords or presses Submit). Ask "what do you know about me?" to see everything it keeps, and open the file it has. Turn it off or hide it on any site with one click.

GUIDE ME (BETA)
Give the pet the manual of a tool and ask how to do something. It asks when the task is unclear, then shows one step at a time, marked on the real page with a picture. It never clicks for you. When a page has the same button twice, it marks the one you asked about.

FREE AND PRIVATE
ShowMeWise is free and runs on your own computer through the ShowMeWise website (showmewise.netlify.app): no account, no upload, no tracking. It works with Ollama on your computer, or with a smaller AI that runs in the browser. A guide is a strong first draft: read it before you share it.

## Single purpose (for the review)
An assistant for learning and documenting how software is used: it turns screen recordings into written guides and answers questions about them, the page the user is on and the user's documents. Vidi, the assistant, can be shown as a small pet on the page (optional, BETA) and also handles the small helper tasks people ask an assistant for (timers, reminders, a web search with sources).

## Why each permission is needed (for the review)
- desktopCapture: to record the screen, a window or a tab when the user presses Record.
- sidePanel: to show ShowMeWise next to the page when the user chooses "Open on the side".
- notifications: to say when a guide is ready.
- storage: to keep the user's settings and the current chat until the browser closes, and the pet's chat, name and memory (including the one file the user gave it and form details the user chose to save) until the user clears them. Nothing is sent anywhere.
- alarms: for the timers, alarms and reminders the user sets with the pet.
- offscreen: to play the short chime of a timer or alarm (a background worker cannot play sound).
- search: "More results" opens the user's own search engine with the words they searched for.
- system.memory: for "Test my computer" on the ShowMeWise website: the free memory decides which AI model can run without slowing the computer down. Only the number is read; it stays on the computer.
- power: to keep the computer awake while a recording or a guide is in progress, so the work is not cut off.
- scripting and activeTab: to read the text of the page the user asks about, and to mark buttons on it when the user presses "Show me on the page".
- Host permission for showmewise.netlify.app: the plugin uses the ShowMeWise website in a tab to do the work on the user's computer.
- Optional host permission for all sites: asked for only when the user first asks about a page or turns on the pet, so Vidi can read that page and up to 3 linked pages of the same site, show the pet on pages, and get web search answers from Wikipedia and DuckDuckGo.

## Remote code
No. All code is in the package (including three.js for the user's own 3D pet). AI models are data files downloaded by the ShowMeWise website, not code run by the plugin.

## Data use (privacy tab)
- No data is collected, sold or sent to the developer.
- Page text and documents are read on the user's computer only to answer the user's question.
- When the user asks the pet to search the web, only the search words go to Wikipedia and DuckDuckGo.
- Privacy policy: https://showmewise.netlify.app/#/policy

## Pictures to upload
- Icon 128 x 128: `extension/icons/icon128.png`
- Screenshots 1280 x 800: `dist-extension/store/shot-*.png`
- Small promo tile 440 x 280: `dist-extension/store/promo-440x280.png`
