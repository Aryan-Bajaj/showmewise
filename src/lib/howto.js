// One source for the "How to use" page AND the Vidi help chat, so both always
// say the same thing. Written in very simple English for people who are not
// technical. Pictures are real screenshots of the app (made from our own demo
// video); `marks` are numbered pins, x and y in percent of the picture.
// Keep every sentence true to the app: when the app changes, change this too.
import { MAX_VIDEO_MB, MAX_VIDEO_MIN } from "./limits"

const LIMIT = MAX_VIDEO_MB || MAX_VIDEO_MIN
  ? `Size limit: on this website, one video can be up to ${[MAX_VIDEO_MB && `${MAX_VIDEO_MB} MB`, MAX_VIDEO_MIN && `${MAX_VIDEO_MIN} minutes`].filter(Boolean).join(" and ")}. Is your recording longer? Cut it into shorter parts first, or use the desktop app, which has no limit.`
  : "There is no size limit in this version, but very long videos need a lot of memory."

export const LIMIT_TEXT = LIMIT

export const HOWTO = [
  {
    id: "what", title: "What VideoDoc does",
    body: [
      "You record your screen while you show how to do something, and you talk while you do it.",
      "VideoDoc watches that recording. It listens to what you say, reads what is on the screen, and writes a step-by-step guide.",
      "The guide has numbered steps, pictures with the clicked buttons marked, a short summary and questions and answers.",
      "You can save the guide as a web page (HTML), a PDF or a Word file.",
      "Everything happens on your own computer: your video is never uploaded anywhere.",
    ],
  },
  {
    id: "before", title: "Before you start", rank: 0.8,
    body: [
      "Use a laptop or a desktop computer with Chrome, Edge or Firefox. Phones and tablets do not work. The browser AI needs Chrome or Edge; in Firefox, use Ollama.",
      "Your computer needs at least 8 GB of memory (RAM). 16 GB is better.",
      "Plug in the laptop and close programs you do not need. Making a guide is hard work for a computer.",
      "The first time, VideoDoc downloads the parts it needs. The speech part is about 970 MB (about 1.6 GB for Accurate). The AI that writes is 0.8 to 3.5 GB, unless you use Ollama. These downloads happen only once.",
      LIMIT,
      "Your video stays on your computer. It is never uploaded. You need no account, and it is free.",
    ],
  },
  {
    id: "words", title: "Words you will see", rank: 0.4, // explains words; the real step should win
    body: [
      "AI: the computer program that writes your guide.",
      "Model: one version of that AI. A bigger model writes better, but it is slower and needs more memory.",
      "WebLLM: the AI runs inside your browser. Nothing to install.",
      "Ollama: a free program you can install (ollama.com) that runs the AI on your computer. Usually faster and better than the browser AI.",
      "OCR: reading the text on the screen.",
      "Transcribe: turning speech into written text.",
      "Export: saving the guide as a file.",
    ],
  },
  {
    id: "upload", title: "Step 1. Start: choose your video", img: "upload",
    marks: [
      { n: 1, x: 57.8, y: 60.2, dir: "right", text: "The size limit of the website. Check it before you choose a long recording." },
      { n: 2, x: 29.0, y: 50.1, dir: "left", text: "Drop your video here, or click here to pick it from your computer. MP4, MOV and WEBM files work." },
      { n: 3, x: 37.1, y: 73.1, dir: "left", text: "The language people speak in the video. If it is not in the list, pick Another language. The guide is always written in English." },
      { n: 4, x: 40.1, y: 78.3, dir: "left", text: "How the speech is heard. Fast is good for clear English. Accurate hears names, codes and mixed languages better, but takes 3 to 4 times longer on most laptops." },
      { n: 5, x: 29.0, y: 92.5, dir: "left", text: "Key words (optional): names or codes from the video, separated by commas. The guide spells them exactly like this." },
    ],
    body: [
      "First pick the language and the speech option. Then choose the video. VideoDoc starts at once.",
      "No sound in your video? That is fine. The guide is then made from the screen only.",
      "Key words (optional): type names or codes from the video, separated by commas, for example ME21N, Weekly Overview. The guide spells them exactly like this, and a part where one is said or shown uses it.",
    ],
  },
  {
    id: "progress", title: "Step 2. Wait while VideoDoc reads the video", img: "progress",
    marks: [
      { n: 1, x: 86.8, y: 18.4, dir: "left", text: "How far it is. The time left shows up once the AI has written the first part." },
      { n: 2, x: 10.9, y: 34.6, dir: "left", text: "Each job, one after the other: taking pictures from the video, getting the sound, writing down the speech, reading the screen, starting the AI, writing the steps, checking the steps, tidying up, and writing the summary and questions." },
    ],
    body: [
      "The first time, you see the speech part downloading (for example 300 of 968 MB). Next time it is already there.",
      "Keep this tab open and in front. Then your computer stays awake. If the computer sleeps, the work stops.",
      "If you try to close or reload the tab, the browser asks first, so you do not lose the work by mistake.",
      "Cancel processing stops it. New video (top bar) lets you start again with another file.",
    ],
  },
  {
    id: "settings", title: "Step 3. Choose your settings", img: "set-dialog",
    marks: [
      { n: 1, x: 88.5, y: 6.2, dir: "left", text: "This window opens by itself when the speech and the screen have been read. The X closes it. Annotate in the top bar opens it again." },
    ],
    body: [
      "From top to bottom: the name of your guide, your company name, which AI writes the guide, what the guide will contain, two options for accuracy, and the start button.",
      "Most people only check the name and press Generate Procedure. The other settings are already set well for you. Each one is explained below.",
    ],
  },
  {
    id: "set-title", title: "Step 3a. Name of the guide and company", img: "set-title",
    marks: [
      { n: 1, x: 97, y: 24, dir: "left", text: "Document title: the heading of your guide, for example \"Create and share a dashboard\". Leave it empty and VideoDoc writes a title for you." },
      { n: 2, x: 97, y: 78, dir: "left", text: "Company name (you can skip it): shown at the top right of the saved files." },
    ],
    body: ["Detected tools: the programs VideoDoc saw in your video. Only shown when it found some."],
  },
  {
    id: "set-ollama", title: "Step 3b. Which AI writes the guide: Ollama", img: "set-backend-ollama",
    marks: [
      { n: 1, x: 86.4, y: 51.4, dir: "right", text: "Ollama. If it is running on your computer, VideoDoc finds it and picks it for you. \"Running · 6 models\" means it found 6 models." },
      { n: 2, x: 15.4, y: 68.5, dir: "right", text: "Select model: the best one is already picked. You can choose a smaller one to go faster." },
    ],
    body: [
      "Models with \"cloud\" in the name are never shown, because they would send your data to another computer.",
      "Some models can also look at the pictures of your screen (for example gemma3). They give the most exact steps.",
    ],
  },
  {
    id: "set-webllm", title: "Step 3c. Which AI writes the guide: in the browser (WebLLM)", img: "set-backend-webllm",
    marks: [
      { n: 1, x: 16.6, y: 21.2, dir: "right", text: "WebLLM: the AI runs inside your browser. Nothing to install. It downloads once and is kept for next time." },
      { n: 2, x: 86, y: 47.8, dir: "right", text: "Test my system: checks your computer and picks the model that fits it." },
      { n: 3, x: 53, y: 55.2, dir: "right", text: "Browser model: Small (0,9 GB, only for chat), Medium (1 GB, the usual choice), Large (about 2 GB, needs more free memory) or Vision (3,5 GB). Test my computer picks the size that fits." },
      { n: 4, x: 99, y: 79, dir: "left", text: "How exact and how fast this model is. If the model is too big for your computer, a warning shows here." },
    ],
    body: ["If your browser cannot run it, use Chrome or Edge on a computer, or install Ollama."],
  },
  {
    id: "set-ollama-missing", title: "Step 3d. Ollama says \"Not detected\"", img: "set-ollama-missing",
    marks: [
      { n: 1, x: 71, y: 21.4, dir: "right", text: "Not detected: Ollama is not running, or it does not allow this website yet." },
      { n: 2, x: 66, y: 31.1, dir: "right", text: "Do these 4 steps once: open PowerShell, paste setx OLLAMA_ORIGINS \"*\" and press Enter, close Ollama (right-click its icon at the bottom right of the screen, Quit) and open it again, then run ollama run gemma3." },
      { n: 3, x: 50, y: 96, dir: "up", text: "Retry detection now checks again. The page also finds Ollama by itself after a few seconds." },
    ],
    body: ["You do not have Ollama? Get it free from ollama.com, install it, then do step 4. Or just use the browser AI."],
  },
  {
    id: "set-output", title: "Step 3e. What the guide will contain", img: "set-output",
    marks: [{ n: 1, x: 60, y: 17, dir: "right", text: "Every guide has the same parts: contents, purpose, what you need before you start, numbered steps with results and pictures, things to notice, a summary, questions and answers, and a flow chart. Parts of the video where nothing happens are left out." }],
    body: [],
  },
  {
    id: "set-accuracy", title: "Step 3f. Accuracy options", img: "set-bottom",
    marks: [
      { n: 1, x: 42.8, y: 40.2, dir: "right", text: "Self-verify each step: off by default. The AI checks every step a second time and removes what it cannot see. In our tests it also removed correct details, and it takes about a third longer." },
      { n: 2, x: 46.1, y: 55.9, dir: "right", text: "Consolidate procedure: a last tidy-up of the step names. Steps that say the same thing are joined." },
    ],
    body: ["Consolidate is on, Self-verify is off. Switch Self-verify on only if a guide has steps that never happened in the video."],
  },
  {
    id: "set-generate", title: "Step 3g. Generate Procedure", img: "set-bottom",
    marks: [{ n: 1, x: 95.2, y: 69.3, dir: "up", text: "How long it may take on this computer. The real time left shows once writing starts." }, { n: 2, x: 62.8, y: 92.7, dir: "right", text: "Generate Procedure starts writing. It is grey when Ollama is picked but not found." }],
    body: [],
  },
  {
    id: "writing", title: "Step 4. Watch it write", img: "writing",
    marks: [
      { n: 1, x: 10.9, y: 25.3, dir: "left", text: "The time left, measured on your computer once the first part is written." },
      { n: 2, x: 13.0, y: 69.4, dir: "left", text: "Which part it is writing now. Your steps appear below while it works." },
      { n: 3, x: 18.5, y: 98, dir: "right", text: "Cancel processing stops it. What is already written stays." },
    ],
    body: [
      "You can already read the first steps while the rest is written.",
      "How long? A 1 minute video takes a few minutes. With the most accurate model, a 10 minute video took about 1¾ hours on a normal 16 GB laptop in our tests. A smaller model is faster.",
    ],
  },
  {
    id: "progress", title: "The progress list: what each line means (Skipped, kept from the last try, times)",
    body: [
      "Each line is one job, with what came out of it on the right and how long it took. Why does a job skip? It is switched off or not needed, see below.",
      "Self-Verify Steps: Skipped means it is switched off. It is off by default, because in our tests it also removed correct details and took about a third longer. Switch it on in the AI settings (Self-verify each step) if you want it. Nothing is missing because of it.",
      "Consolidate Procedure: Skipped means it is switched off, or the guide has only one part, so there is nothing to tidy or join.",
      "Transcribe Audio: Skipped means the video has no sound, or the browser could not read it. The guide is written from the screen only.",
      "Purpose · Summary · FAQ · Flow: skipped means the AI gave no usable summary this time. Your steps are fine. Press Re-annotate to try again.",
      "\"kept from the last try\" (with 0s): you chose the same video with the same speech settings as your last run (finished or not). The speech and the screen text were saved then, so they are not read again. That is why it takes 0 seconds.",
      "\"Picking up where it stopped: ... parts already written\": parts written in the last try are kept; only the rest is written now.",
      "VideoDoc knows it is the same video when the file name, the exact size, the time the file was last saved, the speech language and the Fast or Accurate choice all match. A new recording (even with one extra sentence) is a new file, so it starts fresh. Written parts are only kept with the same AI model, settings and key words.",
      "\"... entries annotated\": how many parts the guide has. \"... segments\": how many pieces of speech were written down. \"... frames\": how many pictures were taken from the video.",
      "A very long time, for example 356m, or \"computer slept 5h\": the work waits while the computer sleeps and goes on when it wakes. The time the computer slept is not counted and is shown on its own. Keep the laptop open, plugged in and the tab in front.",
      "\"Ollama · gemma3...\" with 0s next to Load AI Model: Ollama loads the model itself, so this line is done at once. With the browser AI it shows the download and loading.",
    ],
  },
  {
    id: "done", title: "Step 5. When it is done", img: "done",
    marks: [
      { n: 1, x: 10.8, y: 18.6, dir: "left", text: "COMPLETE: every job has a green tick, with how long it took." },
      { n: 2, x: 86.4, y: 4.6, dir: "left", text: "Re-annotate: write the guide again, for example with another model. The video is not read again." },
      { n: 3, x: 93.7, y: 6.8, dir: "down", text: "New video: start again with another recording. Save your guide first." },
    ],
    body: ["Scroll down to read your guide, the summary, the questions and answers, and to save it."],
  },
  {
    id: "guide", title: "Step 5a. Read and fix your guide", img: "guide",
    marks: [
      { n: 1, x: 76.0, y: 49.9, dir: "right", text: "All actions of this step, in the right order. Codes and numbers are copied from the screen." },
      { n: 3, x: 74.1, y: 42.8, dir: "right", text: "Edit, Move up, Move down and Delete: on every step." },
      { n: 4, x: 78.5, y: 28.1, dir: "left", text: "Self-check: how well the guide matches the video (100 is best), and how many parts it has." },
      { n: 5, x: 18.3, y: 80.2, dir: "right", text: "Your video and small pictures from it. Click a picture to jump to that moment." },
      { n: 2, x: 84.2, y: 87.8, dir: "up", text: "Pictures of the screen. The button or field you clicked has a number. Click a picture to make it big, click again to close it." },
    ],
    body: [
      "The AI can make mistakes. Read every step before you share the guide.",
      "Every step has Edit, Move up, Move down and Delete.",
      "A step marked \"check this\" is one the AI was less sure about. Look at it first.",
      "Said in the video, but not in this step: something you said (and is on screen) is missing from the step. Press + Add to put it in, or Hide.",
      "At the top: how many steps need a quick look. Show only these lists just those steps.",
      "Check these short codes: if the same code is written in different ways, fix it once with Replace all, or press Looks good.",
      "On the left: your video and small pictures from it. Click a picture to jump to that moment in the video.",
    ],
  },
  {
    id: "edit", title: "Step 5b. Change a step", img: "edit",
    marks: [
      { n: 1, x: 57.4, y: 14.8, dir: "right", text: "Step title: the name of the step." },
      { n: 2, x: 65.7, y: 28, dir: "right", text: "What to do: one action per box. Remove deletes an action. + Add an action adds a new one." },
      { n: 3, x: 62.7, y: 75.4, dir: "right", text: "What you get and Tip: both optional." },
    ],
    body: ["Press Save changes (or Ctrl + Enter). Cancel (or Esc) keeps the old version. Your changes are in every saved file."],
  },
  {
    id: "faq-flow", title: "Step 5c. Summary, questions and flow chart", img: "faq-flow",
    marks: [
      { n: 1, x: 17.2, y: 7.2, dir: "right", text: "Flow diagram: all parts of the process from start to end. It follows your step edits by itself. In Edit document you can rename, add or remove boxes and phases." },
      { n: 2, x: 13.9, y: 39.1, dir: "right", text: "Questions and answers about your process. Click a question to open its answer." },
    ],
    body: ["Above them: the purpose of the guide and a short summary. All of this is also in the saved files."],
  },
  {
    id: "export", title: "Step 6. Save your guide (export)", img: "export",
    marks: [
      { n: 1, x: 23.6, y: 70.7, dir: "up", text: "HTML: a web page in one file. Pictures with marks, short clips of each step, a checklist that remembers your ticks, and questions and answers." },
      { n: 2, x: 49.8, y: 70.7, dir: "up", text: "PDF: ready to print, with a cover page, contents and page numbers." },
      { n: 3, x: 76.1, y: 70.7, dir: "up", text: "DOCX: the same guide as a Word file you can change." },
    ],
    body: ["The files are made on your computer and go to your Downloads folder. Nothing is uploaded.", "Videos in the files: only the HTML file has moving clips (click one to see it big). Word has short GIFs in some parts. A PDF cannot play videos, so it has still pictures only."],
  },
  {
    id: "vidchat", title: "Step 7. Ask questions about the video (Vid Chat)", img: "chat",
    marks: [
      { n: 1, x: 39.8, y: 48.9, dir: "right", text: "The answer shows which step it comes from, with its picture and the time; click the time to play that moment." },
      { n: 2, x: 23.2, y: 54.6, dir: "right", text: "Search the web for more: opens a web search with your question only." },
      { n: 3, x: 21.2, y: 76.6, dir: "right", text: "Not in your video? It says so, and offers Answer from the AI's knowledge or Search the web." },
      { n: 4, x: 23.2, y: 98, dir: "up", text: "Type a question in your own words. The answer shows which step it comes from, with its picture and a play button." },
    ],
    body: [
      "Each answer shows the marked screenshot of the steps it names: only the buttons and fields the answer talks about are marked. Click a picture to make it big.",
      "Vid Chat works when the guide is done, or already when the speech has been written down.",
      "It only answers from your video. If the answer is not in it, it tells you, and offers Want an answer anyway?",
      "Search the web opens the search site Perplexity in a new tab, with only the question you typed. Your video and guide are not sent.",
      "Add a document (top right of Vid Chat): add a manual, notes or a PDF that belongs to the video. Answers then come from the video and the document together. The document is read on your computer and is not uploaded.",
    ],
  },
  {
    id: "check", title: "Test my computer: which browser AI size runs best",
    body: [
      "No Ollama? VideoDoc can use an AI that runs inside your browser. Test my computer finds the size that runs well on your computer, so nothing gets stuck. Open it from the home page, the upload page, the AI settings or the plugin.",
      "It tries the sizes one by one, small first: Small (Llama 3.2 1B), Medium (Qwen2.5 1.5B), Large (Qwen2.5 3B). For each one you see how fast it is and if it answered a test question right. You decide whether to try the next, bigger one.",
      "Bigger gives better answers but needs more free memory. Small is quick, but its answers are often weak.",
      "Many laptops have built-in graphics: then the AI uses the normal memory. Close tabs and programs you do not need before the test. With the VideoDoc plugin, the test shows your free memory and how many tabs are open.",
      "The sizes you do not need are deleted after the test, so they do not take space. The best one is kept and used from then on.",
      "Ollama on your computer is still faster and more exact than the browser AI.",
    ],
  },
  {
    id: "record", title: "Record your screen (recorder)",
    body: [
      "No recording yet? Press Record your screen on the upload page. Choose the whole screen, one app window or a browser tab, then do the task and explain it out loud. Press Stop when you are done, or Stop sharing in the browser bar.",
      "The guide starts by itself after you stop. The recording stays on your computer.",
      "Allow the microphone when the browser asks, so your voice is recorded. If it is blocked, the video has no voice and the guide is written from the screen only.",
      "On this website a recording stops by itself at the size limit. If the tab closes while recording, the next visit offers the recording again (Use it or Delete it).",
    ],
  },
  {
    id: "plugin", title: "The VideoDoc browser plugin (extension) and Vidi in the plugin",
    body: [
      "The VideoDoc plugin for Chrome and Edge puts VideoDoc in a small window under its icon in the toolbar. Open on the side keeps it next to your page.",
      "Record your screen from the plugin: the whole screen, any app window or a tab. When you stop, the guide is written by itself with the AI you used last time, and you get a notification when it is ready.",
      "Before you record, open Key words, language and speech in the plugin (optional): type the names and codes said in the video, pick the spoken language, and Fast or Accurate speech. Same as on the upload page; the plugin remembers them.",
      "The plugin shows the steps and the time left while VideoDoc works. It keeps the computer awake while it records or writes.",
      "Ask Vidi in the plugin: about your video, about the page you are on, about a document (PDF, Word, web page or text), or Help for questions about VideoDoc itself.",
      "This page: if the answer is not on the page, Vidi reads the links on it that match your question (same site, up to 3) and says which pages it read. Reading pages needs your OK once.",
      "The plugin uses the VideoDoc website in a tab of its own, so the models are downloaded only once and an unfinished guide picks up where it stopped. If that tab is closed, press Continue in the plugin.",
      "Nothing is uploaded: the plugin and the website run on your computer.",
    ],
  },
  {
    id: "docchat", title: "Step 8. Ask questions about a document (Doc Chat)", img: "docchat",
    marks: [{ n: 1, x: 65.2, y: 46.9, dir: "right", text: "Choose a document (PDF, Word, web page, text, Markdown, CSV or JSON) and ask questions about it." }],
    body: ["Doc Chat needs no video. Open it with Doc Chat in the top bar.", "If Ollama runs on your computer, it is picked for you with a quick model for chatting. You can switch to the browser AI.", "Ask anything about the document: what it is about, how to do a step, a name or a number in it."],
  },
  {
    id: "vidi", title: "Help from Vidi",
    img: "vidi-answers",
    marks: [
      { n: 1, x: 74.0, y: 20.4, dir: "left", text: "Vidi's chat window. It opens with the Ask Vidi button at the bottom right of every page." },
      { n: 2, x: 74.0, y: 62, dir: "left", text: "Your questions on the right, Vidi's answers on the left, often with the matching picture from this page and a link to it." },
      { n: 3, x: 74.7, y: 74.5, dir: "left", text: "Type your question, or paste an error message or a screenshot here." },
    ],
    body: [
      "Vidi (Latin for \"I saw\") is the helper of VideoDoc. Ask it anything about using VideoDoc, in your own words.",
      "It knows which page you are on, so its answers fit what you see.",
      "It watches for error messages. When one appears, a small bubble asks: \"I can see an error on your screen. Do you need help with it?\" Press Yes and Vidi explains the error and what to do. Press No to close the bubble. You can then keep asking.",
      "Do not understand a message? Copy it into the chat, or take a screenshot (Windows key + Shift + S) and paste it with Ctrl + V. Vidi reads the text in the picture on your computer.",
      "How Vidi answers: without any AI it shows the right part of this page at once. For written answers it uses Ollama if you have it, or a small browser AI (about 1 GB, downloaded once). Change how Vidi answers is at the bottom of the chat.",
      "Vidi only talks about VideoDoc. For questions about what is in your own video, use Vid Chat. For a document, use Doc Chat.",
      "The first time, Vidi asks what to call you (you can say No thanks). It remembers your name and what you asked about last, only in your browser on this computer, to greet you next time. Forget me (at the bottom of the chat) clears it.",
    ],
  },
  {
    id: "errors", title: "Error messages and what to do",
    body: [
      "\"This video is ... MB — the online version accepts up to ... MB\" or \"This recording is ... min\": your video is too big or too long for the website. Cut it into shorter parts (any free video editor can do that), then upload the parts one by one.",
      "\"That file is not a video\" or \"This file could not be read as a video\": you picked something that is not a video, or the file is broken. Pick an MP4, MOV or WEBM recording. Can it play in your video player? If not, record it again.",
      "\"No sound in this video\" (next to Extract Audio): the video has no sound, or the browser cannot read its sound. VideoDoc makes the guide from the screen only. Did you talk in the video? Then save it again as MP4 (most screen recorders and editors can do that) and upload it again.",
      "\"The graphics card could not load the speech model, using the processor instead (slower)\": nothing is wrong. Your graphics card could not take the Accurate speech model, so the normal processor does it. It only takes longer.",
      "\"Processing cancelled. Whatever finished is kept below\": you pressed Cancel. The steps that were already written stay. Press Annotate to write the rest, or New video to start over.",
      "\"Annotation failed ... Check the selected model is installed (Ollama) or try WebLLM\": the AI could not write. With Ollama: is Ollama still open? Is the model installed (ollama run gemma3)? Or pick WebLLM instead.",
      "\"Ollama not reachable\": the page cannot talk to Ollama. Open Ollama, and do Step 3d once.",
      "\"Ollama refused the request\": Ollama got the request but could not do it, for example because the model is missing or the computer is out of memory. Check the model name, close other programs, or pick a smaller model.",
      "\"WebLLM failed to load\": the browser AI could not start. Use Chrome or Edge on a computer, close other tabs, and pick a smaller browser model (Fast). Updating your graphics driver can help.",
      "\"Not detected\" next to Ollama: see Step 3d.",
      "\"HTML export failed\" (or PDF, DOCX): saving did not work. Try again. If it fails again, try another format, or reload the page after saving what you can.",
      "\"Leave site? Changes you made may not be saved\": the browser asks this because VideoDoc is still working. Press Cancel to stay. If you leave, the work is lost.",
      "Chrome asks to let the site \"access other apps and services on this device\": this is Chrome asking if the page may talk to Ollama on your computer. Press Allow. Your data still stays on your computer.",
      "\"This copy only has the English speech model\" (desktop app): run the setup again with the option for all languages.",
      "Doc Chat says \"This file type does not work here\" or \"Could not read any text from that file\": use a .pdf, .docx, .html, .txt, .md, .csv or .json file. A scanned document (a picture of text) has no text to read.",
      "Vid Chat says \"I couldn't find this in it\": the answer is not in your video or guide. Ask in other words, press Answer from the AI's knowledge, or Search the web.",
      "\"... could not be shown. Your guide is safe and you can still export it\": one part of the page had a problem, the rest still works. Press Try again next to the message. Your guide is not lost.",
    ],
  },
  {
    id: "trouble", title: "If something goes wrong",
    body: [
      "\"This file could not be read as a video\": the file is not a video, or it is broken. Choose an MP4, MOV or WEBM screen recording.",
      "\"Not detected\" next to Ollama: see Step 3d.",
      "It is very slow: pick a smaller model, keep Self-verify off, close other programs and plug in the laptop. Cut a long video into shorter parts.",
      "The computer went to sleep, the tab was closed or the browser crashed: choose the same video again with the same settings. VideoDoc picks up where it stopped: speech and screen are not read again, and parts already written are kept.",
      "A step is wrong or missing: change it with Edit. Next time, try a bigger model or Accurate speech.",
      "The video is too big: the website takes up to the size shown on the upload page. Cut the video into parts.",
    ],
  },
  {
    id: "limits", title: "Limits, limitations and accuracy: how accurate is it, mistakes, why it works this way (free and private)",
    body: [
      "Why it works this way: VideoDoc is free and runs completely on your own computer. No cloud, no account, no cost per video. The AI is an open model on your machine, so the speed and the result depend on your computer and the model you pick.",
      "How accurate is it? We test every release against manuals written by hand for real screen recordings and read each guide step by step. With gemma3 12B on a normal 16 GB laptop (Accurate speech, key words typed in), 60 to 67,5 % of all actions came out fully right in the first draft.",
      "A bigger model gives a better guide: a small 4B model got about 30 % in our tests. Pick the biggest model your computer can run. The browser AI is quick to start but smaller than Ollama. In the browser, on our 1-minute demo video: Medium found 11 of 15 steps (6 fully right) in about 10 minutes; Small found only 2, so it is too weak for guides.",
      "Big paid cloud AIs are usually faster and stronger, but your video would have to leave your computer. VideoDoc keeps it with you.",
      "Your computer sets the speed: with the biggest model a 10 minute video took about 1¾ hours on a normal 16 GB laptop. A stronger computer or a smaller model is faster. Keep the computer awake while it works.",
      "So a guide is a strong first draft that you finish. Read it and fix it with Edit before you share it. Start with the steps that need a quick look.",
      "Often missed: a click where nothing visible changes, and a button with only an icon and no text. Small clicks that were seen go to the checklist, not into the guide.",
      "Help it with key words: type the names and codes of your app into the key words box. In our tests this helped the most.",
      "Each run is a little different: an AI never writes the same text twice. In our tests the same video scored up to 10 points higher or lower.",
      "The guide is written in English for now, not in Hindi, German or another language, even when the video is in that language.",
      "Made for computers: Chrome, Edge or Firefox on a laptop or desktop. The plugin and the browser AI need Chrome or Edge; in Firefox, use Ollama. Phones and tablets are not strong enough to run the AI on the device.",
      "Saved files: the HTML guide has moving clips. Word has short GIFs in some parts, PDF has still pictures only, no videos. Doc Chat and Vid Chat read PDF files, but not scanned pages (pictures of text).",
      LIMIT,
    ],
  },
  {
    id: "privacy", title: "Privacy and your data (short version)",
    body: [
      "Your video, its transcript and the guide never leave your computer. Nobody can see them, not even us.",
      "No account, no sign-up, no analytics, no ads, no tracking cookies. We do not sell or share any data, because we do not collect any.",
      "The website comes from Netlify, our host. Like every host, Netlify may keep normal server logs (for example your IP address and the time).",
      "The AI models are downloaded once, mainly from Hugging Face, and kept in your browser. Those servers only see a normal download, never your video.",
      "Ollama runs on your own computer; the page talks to it there. Chrome may ask to allow local network access: press Allow.",
      "Search the web only runs when you click it. It opens Perplexity in a new tab with just your question.",
      "Vidi reads error messages and pasted screenshots on your computer only.",
      "Stored in your browser: downloaded models, checklist ticks of a saved HTML guide, how Vidi answers, and the transcript and screen text of the last video, so the same video starts faster (another video replaces them; parts of an unfinished guide are kept until it is done). Clear the site data in your browser settings to remove it all.",
      "Under data protection law (GDPR) you have rights over your data. VideoDoc holds no personal data about you. For hosting logs, contact Netlify.",
      "The full text is on the Privacy, terms and credits page (Privacy in the top bar).",
    ],
  },
  {
    id: "terms", title: "Terms of use and rules (short version)",
    body: [
      "VideoDoc is free. It is a personal portfolio project, provided as it is, without any warranty. It may change, pause or stop at any time.",
      "The AI can be wrong or incomplete. Check every guide before you share it or rely on it. You are responsible for the guides you make and share.",
      "Only use recordings you are allowed to use. Remove personal or confidential information before you share a guide.",
      "Do not use VideoDoc for anything illegal or to harm others.",
      "Making a guide works your computer hard for a long time. Plug in the laptop, close programs you do not need, and save your other work first.",
      LIMIT,
      "As far as the law allows, there is no liability for any loss or damage from using VideoDoc.",
      "The AI models have their own licenses (for example Gemma by Google, Qwen by Alibaba Cloud, Phi by Microsoft, Llama by Meta). Using a model means you accept its license.",
      "VideoDoc is open source. Questions, ideas or problems: open an issue on GitHub.",
      "The terms can change; the date on the Privacy, terms and credits page shows the latest version.",
    ],
  },
  {
    id: "faq", title: "Questions people ask",
    body: [
      "Is it free? Yes. No account, no payment.",
      "Is my video uploaded? No. Everything happens on your computer.",
      "Can I close the laptop lid while it works? No. The computer goes to sleep and the work stops. Keep it open and plugged in.",
      "Can I use another tab meanwhile? Yes, but keep the VideoDoc tab open. It works best when its tab is in front.",
      "Which languages? The video can be in English, Hindi or Hinglish, German, Spanish, French or another language. The guide is in English.",
      "Can I change the guide after it is written? Yes, with Edit on every step, before you save it.",
      "Why does it say Skipped? A job that is switched off (Self-verify is off by default) or not needed. See The progress list.",
      "Why 0s and \"kept from the last try\"? It is the same video as your last run, so the speech and screen text were reused.",
    ],
  },
]

// Words that mean the question is about VideoDoc at all (anything else is off topic)
const TOPIC = /video|record|guide|step|upload|file|mp4|mov|webm|ollama|model|ai\b|llm|webllm|speech|language|transcri|screen|export|save|pdf|docx|word|html|chat|limit|size|mb|gb|minute|long|slow|fast|time|error|fail|stuck|sleep|install|download|browser|chrome|edge|privacy|free|account|edit|title|company|start|use|how|help|work|gpu|graphics|memory|ram|computer|laptop|lid|phone|mobile|sound|audio|desktop|accurate|cancel|new|vidi|videodoc|setting|option|verify|consolidat|accura|ocr|annotat|procedure|frame|clip|gif|checklist|faq|summary|flow|tip|result|marker|picture|screenshot|button|click|tab|ctrl|error|message|wrong|missing|skip|kept|resum|progress|segment|entr|annotat/i

const STOP = new Set("the and for you your can how what which does with this that are not from into when then there here will have use using about its just get got want need".split(" "))
const words = (t) => ((t || "").toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((w) => !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, ""))
const docs = HOWTO.map((s) => new Set(words([s.title, ...(s.body || []), ...(s.marks || []).map((m) => m.text)].join(" "))))
// a word found in few parts says more about the question than one found everywhere
const weight = (w) => Math.log((HOWTO.length + 1) / (1 + docs.filter((d) => d.has(w)).length))

// The parts that best match a question (weighted word overlap; the help text is small)
export function findHelp(question, top = 2) {
  const q = [...new Set(words(question))]
  const scored = HOWTO.map((s, i) => {
    const title = new Set(words(s.title))
    const score = q.reduce((sum, w) => sum + (docs[i].has(w) ? weight(w) * (title.has(w) ? 2 : 1) : 0), 0)
    return { s, score: score * (s.rank ?? 1), n: q.filter((w) => docs[i].has(w)).length }
  }).filter((x) => x.score > 0.2).sort((a, b) => b.score - a.score)
  // on topic: it uses VideoDoc words, or it clearly matches a part of the help
  return { onTopic: TOPIC.test(question || "") || ((scored[0]?.score || 0) > 1.2 && scored[0].n >= 2), sections: scored.slice(0, top).map((x) => x.s) }
}

export const sectionText = (s) => [s.title, ...(s.marks || []).map((m) => `(${m.n}) ${m.text}`), ...(s.body || [])].join("\n")

// A known error message, looked up in the help text without any AI: the line
// that quotes it says exactly what to do. (The AI used to answer "This file
// could not be read as a video" with the general start help.)
export function errorHelp(message) {
  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
  const msg = norm(message)
  if (msg.length < 8) return null
  const lines = HOWTO.filter((s) => s.id === "errors" || s.id === "trouble").flatMap((s) => s.body || [])
  let best = null, bestLen = 0
  for (const line of lines) {
    // the quoted messages in the line ("...")
    for (const q of line.match(/"([^"]{6,})"/g) || []) {
      // "..." inside a quote stands for any text: compare the parts around it
      const parts = norm(q).split(/\s*\.\.\.\s*|\s{2,}/).filter((p) => p.length >= 6)
      const hit = parts.length && parts.every((p) => msg.includes(p))
      const len = parts.join("").length
      if (hit && len > bestLen) { best = line; bestLen = len }
    }
  }
  return best
}
