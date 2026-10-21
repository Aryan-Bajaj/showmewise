// One source for the "How to use" page AND the Vidi help chat, so both always
// say the same thing. Written in very simple English for people who are not
// technical. Pictures are real screenshots of the app (made from our own demo
// video); `marks` are numbered pins, x and y in percent of the picture.
// Keep every sentence true to the app: when the app changes, change this too.
import { MAX_VIDEO_MB, MAX_VIDEO_MIN } from "./limits"

const LIMIT = MAX_VIDEO_MB || MAX_VIDEO_MIN
  ? `On this website, one video can be up to ${[MAX_VIDEO_MB && `${MAX_VIDEO_MB} MB`, MAX_VIDEO_MIN && `${MAX_VIDEO_MIN} minutes`].filter(Boolean).join(" and ")}. Is your recording longer? Cut it into shorter parts first, or use the desktop app, which has no limit.`
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
    ],
  },
  {
    id: "before", title: "Before you start",
    body: [
      "Use a laptop or a desktop computer with Chrome or Edge. Phones and tablets do not work.",
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
    id: "upload", title: "Step 1. Choose your video", img: "upload",
    marks: [
      { n: 1, x: 50, y: 40, text: "The size limit of the website. Check it before you choose a long recording." },
      { n: 2, x: 50, y: 58, text: "Drop your video here, or click here to pick it from your computer. MP4, MOV and WEBM files work." },
      { n: 3, x: 50, y: 80, text: "The language people speak in the video. If it is not in the list, pick Another language. The guide is always written in English." },
      { n: 4, x: 50, y: 86, text: "How the speech is heard. Fast is good for clear English. Accurate hears names, codes and mixed languages better, but takes 3 to 4 times longer on most laptops." },
    ],
    body: [
      "First pick the language and the speech option. Then choose the video. VideoDoc starts at once.",
      "No sound in your video? That is fine. The guide is then made from the screen only.",
    ],
  },
  {
    id: "progress", title: "Step 2. Wait while VideoDoc reads the video", img: "progress",
    marks: [
      { n: 1, x: 50, y: 14, text: "How far it is. The time left shows up once the AI has written the first part." },
      { n: 2, x: 30, y: 40, text: "Each job, one after the other: taking pictures from the video, getting the sound, writing down the speech, reading the screen, starting the AI, writing the steps, checking the steps, tidying up, and writing the summary and questions." },
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
      { n: 1, x: 50, y: 6, text: "This window opens by itself when the speech and the screen have been read. The X closes it. Annotate in the top bar opens it again." },
    ],
    body: [
      "From top to bottom: the name of your guide, your company name, which AI writes the guide, what the guide will contain, two options for accuracy, and the start button.",
      "Most people only check the name and press Generate Procedure. The other settings are already set well for you. Each one is explained below.",
    ],
  },
  {
    id: "set-title", title: "Step 3a. Name of the guide and company", img: "set-title",
    marks: [
      { n: 1, x: 50, y: 22, text: "Document title: the heading of your guide, for example \"Create and share a dashboard\". Leave it empty and VideoDoc writes a title for you." },
      { n: 2, x: 50, y: 66, text: "Company name (you can skip it): shown at the top right of the saved files." },
    ],
    body: ["Detected tools: the programs VideoDoc saw in your video. Only shown when it found some."],
  },
  {
    id: "set-ollama", title: "Step 3b. Which AI writes the guide: Ollama", img: "set-backend-ollama",
    marks: [
      { n: 1, x: 75, y: 30, text: "Ollama. If it is running on your computer, VideoDoc finds it and picks it for you. \"Running · 6 models\" means it found 6 models." },
      { n: 2, x: 50, y: 78, text: "Select model: the best one is already picked. You can choose a smaller one to go faster." },
    ],
    body: [
      "Models with \"cloud\" in the name are never shown, because they would send your data to another computer.",
      "Some models can also look at the pictures of your screen (for example gemma3). They give the most exact steps.",
    ],
  },
  {
    id: "set-webllm", title: "Step 3c. Which AI writes the guide: in the browser (WebLLM)", img: "set-backend-webllm",
    marks: [
      { n: 1, x: 25, y: 22, text: "WebLLM: the AI runs inside your browser. Nothing to install. It downloads once and is kept for next time." },
      { n: 2, x: 20, y: 52, text: "Test my system: checks your computer and picks the model that fits it." },
      { n: 3, x: 50, y: 64, text: "Browser model: Fast (0.8 GB), Balanced (1.9 GB), Balanced+ (1.9 GB, the usual choice), Quality (2.2 GB), or Vision (3.5 GB, also looks at the pictures)." },
      { n: 4, x: 50, y: 78, text: "How exact and how fast this model is. If the model is too big for your computer, a warning shows here." },
    ],
    body: ["If your browser cannot run it, use Chrome or Edge on a computer, or install Ollama."],
  },
  {
    id: "set-ollama-missing", title: "Step 3d. Ollama says \"Not detected\"", img: "set-ollama-missing",
    marks: [
      { n: 1, x: 75, y: 18, text: "Not detected: Ollama is not running, or it does not allow this website yet." },
      { n: 2, x: 50, y: 60, text: "Do these 4 steps once: open PowerShell, paste setx OLLAMA_ORIGINS \"*\" and press Enter, close Ollama (right-click its icon at the bottom right of the screen, Quit) and open it again, then run ollama run gemma3." },
      { n: 3, x: 50, y: 95, text: "Retry detection now checks again. The page also finds Ollama by itself after a few seconds." },
    ],
    body: ["You do not have Ollama? Get it free from ollama.com, install it, then do step 4. Or just use the browser AI."],
  },
  {
    id: "set-output", title: "Step 3e. What the guide will contain", img: "set-output",
    marks: [{ n: 1, x: 50, y: 50, text: "Every guide has the same parts: contents, purpose, what you need before you start, numbered steps with results and pictures, things to notice, a summary, questions and answers, and a flow chart. Parts of the video where nothing happens are left out." }],
    body: [],
  },
  {
    id: "set-accuracy", title: "Step 3f. Accuracy options", img: "set-accuracy",
    marks: [
      { n: 1, x: 50, y: 40, text: "Self-verify each step: the AI checks every step a second time against the video and removes what it cannot see. Fewer mistakes, but it takes about twice as long." },
      { n: 2, x: 50, y: 78, text: "Consolidate procedure: a last tidy-up of the step names. Steps that say the same thing are joined." },
    ],
    body: ["Both are on. Turn Self-verify off if you need the guide faster."],
  },
  {
    id: "set-generate", title: "Step 3g. Start", img: "set-generate",
    marks: [{ n: 1, x: 50, y: 80, text: "Generate Procedure starts writing. It is grey when Ollama is picked but not found." }],
    body: ["Above the button you see how long it may take on this computer."],
  },
  {
    id: "writing", title: "Step 4. Watch the steps appear", img: "writing",
    marks: [
      { n: 1, x: 75, y: 45, text: "Each part of the video becomes one step with numbered actions (A1, A2 ...), what you get, and a tip." },
    ],
    body: [
      "You can already read the first steps while the rest is written.",
      "How long? A 1 minute video takes a few minutes. A 10 minute video can take an hour or more on a normal laptop.",
    ],
  },
  {
    id: "guide", title: "Step 5. Read and fix your guide", img: "guide",
    marks: [
      { n: 1, x: 75, y: 30, text: "All actions of this step, in the right order. Codes and numbers are copied from the screen." },
      { n: 2, x: 75, y: 70, text: "Pictures of the screen. The button or field you clicked has a number. Click a picture to make it big, click again to close it." },
    ],
    body: [
      "The AI can make mistakes. Read every step before you share the guide.",
      "Every step has Edit, Move up, Move down and Delete.",
      "A step marked \"check this\" is one the AI was less sure about. Look at it first.",
      "Check these short codes: if the same code is written in different ways, fix it once with Replace all, or press Looks good.",
      "On the left: your video and small pictures from it. Click a picture to jump to that moment in the video.",
    ],
  },
  {
    id: "edit", title: "Step 5a. Change a step", img: "edit",
    marks: [
      { n: 1, x: 50, y: 15, text: "Step title: the name of the step." },
      { n: 2, x: 50, y: 40, text: "What to do: one action per box. Remove deletes an action. + Add an action adds a new one." },
      { n: 3, x: 50, y: 75, text: "What you get and Tip: both optional." },
    ],
    body: ["Press Save changes (or Ctrl + Enter). Cancel (or Esc) keeps the old version. Your changes are in every saved file."],
  },
  {
    id: "export", title: "Step 6. Save your guide (export)", img: "export",
    marks: [
      { n: 1, x: 22, y: 60, text: "HTML: a web page in one file. Pictures with marks, short clips of each step, a checklist that remembers your ticks, and questions and answers." },
      { n: 2, x: 50, y: 60, text: "PDF: ready to print, with a cover page, contents and page numbers." },
      { n: 3, x: 78, y: 60, text: "DOCX: the same guide as a Word file you can change." },
    ],
    body: ["The files are made on your computer and go to your Downloads folder. Nothing is uploaded."],
  },
  {
    id: "vidchat", title: "Step 7. Ask questions about the video (Vid Chat)", img: "chat",
    marks: [
      { n: 1, x: 75, y: 50, text: "Type a question in your own words. The answer shows which step it comes from, with its picture and a play button." },
    ],
    body: [
      "Vid Chat works when the guide is done, or already when the speech has been written down.",
      "It only answers from your video. If the answer is not in it, it tells you, and offers Want an answer anyway?",
      "Search the web opens a normal Google-style search in a new tab with your question. Your video and guide are not sent.",
    ],
  },
  {
    id: "docchat", title: "Step 8. Ask questions about a document (Doc Chat)", img: "docchat",
    marks: [{ n: 1, x: 50, y: 45, text: "Choose a document (web page, Word, text, Markdown, CSV or JSON) and ask questions about it." }],
    body: ["Doc Chat needs no video. Open it with Doc Chat in the top bar.", "If Ollama runs on your computer, it is picked for you with a quick model for chatting. You can switch to the browser AI.", "Ask anything about the document: what it is about, how to do a step, a name or a number in it."],
  },
  {
    id: "vidi", title: "Help from Vidi",
    img: "vidi-answers",
    marks: [
      { n: 1, x: 88, y: 12, text: "Vidi's chat window. It opens with the Ask Vidi button at the bottom right of every page." },
      { n: 2, x: 85, y: 55, text: "Your questions on the right, Vidi's answers on the left, often with the matching picture from this page and a link to it." },
      { n: 3, x: 85, y: 90, text: "Type your question, or paste an error message or a screenshot here." },
    ],
    body: [
      "Vidi (Latin for \"I saw\") is the helper of VideoDoc. Ask it anything about using VideoDoc, in your own words.",
      "It knows which page you are on, so its answers fit what you see.",
      "It watches for error messages. When one appears, a small bubble asks: \"I can see an error on your screen. Do you need help with it?\" Press Yes and Vidi explains the error and what to do. Press No to close the bubble. You can then keep asking.",
      "Do not understand a message? Copy it into the chat, or take a screenshot (Windows key + Shift + S) and paste it with Ctrl + V. Vidi reads the text in the picture on your computer.",
      "How Vidi answers: without any AI it shows the right part of this page at once. For written answers it uses Ollama if you have it, or a small browser AI (about 0.8 GB, downloaded once). Change how Vidi answers is at the bottom of the chat.",
      "Vidi only talks about VideoDoc. For questions about what is in your own video, use Vid Chat. For a document, use Doc Chat.",
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
      "Doc Chat says \"This file type does not work here\" or \"Could not read any text from that file\": use a .txt, .md, .csv, .json, .html or .docx file. PDF files do not work. A scanned document (a picture of text) has no text to read.",
      "Vid Chat says \"I couldn't find this in it\": the answer is not in your video or guide. Ask in other words, press Answer from the AI's knowledge, or Search the web.",
      "\"... could not be shown. Your guide is safe and you can still export it\": one part of the page had a problem, the rest still works. Press Try again next to the message. Your guide is not lost.",
    ],
  },
  {
    id: "trouble", title: "If something goes wrong",
    body: [
      "\"This file could not be read as a video\": the file is not a video, or it is broken. Choose an MP4, MOV or WEBM screen recording.",
      "\"Not detected\" next to Ollama: see Step 3d.",
      "It is very slow: pick a smaller model, turn Self-verify off, close other programs and plug in the laptop. Cut a long video into shorter parts.",
      "The computer went to sleep, or the tab was closed: the work stops. Start again with New video.",
      "A step is wrong or missing: change it with Edit. Next time, try a bigger model or Accurate speech.",
      "The video is too big: the website takes up to the size shown on the upload page. Cut the video into parts.",
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
    ],
  },
]

// Words that mean the question is about VideoDoc at all (anything else is off topic)
const TOPIC = /video|record|guide|step|upload|file|mp4|mov|webm|ollama|model|ai\b|llm|webllm|speech|language|transcri|screen|export|save|pdf|docx|word|html|chat|limit|size|mb|gb|minute|long|slow|fast|time|error|fail|stuck|sleep|install|download|browser|chrome|edge|privacy|free|account|edit|title|company|start|use|how|help|work|gpu|graphics|memory|ram|computer|laptop|lid|phone|mobile|sound|audio|desktop|accurate|cancel|new|vidi|videodoc|setting|option/i

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
    return { s, score: score * (s.rank ?? 1) }
  }).filter((x) => x.score > 0.2).sort((a, b) => b.score - a.score)
  return { onTopic: TOPIC.test(question || ""), sections: scored.slice(0, top).map((x) => x.s) }
}

export const sectionText = (s) => [s.title, ...(s.marks || []).map((m) => `(${m.n}) ${m.text}`), ...(s.body || [])].join("\n")
