# VideoDoc Desktop — What's inside, how it works, what it downloads

A transparency / "software bill of materials" sheet for IT & security review.
**Summary:** everything runs on the user's machine. The only data that ever crosses
the network is software/models coming *to* the user — never the user's content.

---

## 1. What's inside (components used)

| Component | What it does | License | Open-source |
|---|---|---|---|
| **React + Vite** | The user interface, shown in the browser (Edge/Chrome) at `localhost:8080`. | MIT | Yes |
| **llama.cpp** (`llama-server`) | The local AI **engine** that runs the language model on your CPU/GPU and also serves the app's files. | MIT | Yes |
| **gemma3 12B** (Google) | The **AI model** that writes the documentation. Multimodal — it can read screenshots. A smaller 4B variant is available for lower-spec machines. | Gemma Terms (open weights) | Open weights |
| **Whisper** (OpenAI) | Converts the video's **audio → transcript**. | MIT | Yes |
| **Transformers.js** (Hugging Face) | Runs the Whisper model inside the app (no server). | Apache-2.0 | Yes |
| **Tesseract.js** | **OCR** — reads the text shown on screen in each frame. | Apache-2.0 | Yes |
| jsPDF / docx / Mermaid | Export to PDF / Word, and draw the flow diagram. | MIT | Yes |

> There is no separate native app shell — the "app" is a local web page that the
> bundled `llama-server` serves on `127.0.0.1:8080`, opened in the user's default
> browser. This is why the installer needs no admin rights and no WebView runtime.

> Every AI component is **open-source and auditable**. None of them "phone home."

## 2. How it works (data flow — step by step)

```
   Your video file
        │  (read locally — never uploaded)
        ▼
 ① Extract frames        → screenshots                  [on your machine]
 ② Extract audio (light speech filter) → Whisper → transcript [on your machine]
 ③ Tesseract OCR reads on-screen text from frames        [on your machine]
        │
        ▼
 ④ gemma3 (via llama.cpp) reads the whole transcript once
    (every action, checked against the speech and screen),
    then transcript + screen text + screenshots per part
    →  writes the step-by-step guide                      [on your machine]
    Clicks nobody says: found by the mouse pointer in the
    frames, by plain code (no AI)                          [on your machine]
        │
        ▼
 ⑤ You review & edit (steps and flow diagram)  →  ⑥ Export to PDF / HTML / Word
```

**At no step does your video, audio, screenshots or text leave the computer.**
The app and the AI engine communicate over `127.0.0.1` (loopback) — internal only.

## 3. What it downloads (and from where)

There are **two ways to ship** — IT chooses:

**A) Model bundled in the installer (recommended for offline / regulated environments)**
- Downloads: **nothing.** The installer already contains the AI models (gemma3 12B).
- The app makes **zero network connections** (with auto-update disabled).
- Because the bundle is large (~7.6 GB with the 12B model), the installer ships as
  `VideoDoc-Setup.exe` plus a few sibling `.bin` parts that must stay in the same
  folder — this is one package to distribute (e.g. as a zip, or via a network
  share/USB), and running the `.exe` installs everything in one step.

**B) Model downloaded on first run (smaller installer)**

| Downloaded once, then cached forever | Approx size | From |
|---|---|---|
| gemma3 model + vision projector (4B) | ~4 GB | `huggingface.co` (or our CDN), over HTTPS |
| gemma3 model + vision projector (12B, recommended for accuracy) | ~7.5 GB | `huggingface.co` (or our CDN), over HTTPS |
| Whisper model (speech-to-text) | ~1 GB | `huggingface.co` / CDN, HTTPS |
| Tesseract OCR language data (English) | ~10 MB | CDN, HTTPS |

- These are **downloaded to the user once**, then stored locally — never re-downloaded.
- **Only software/models are downloaded — never the user's content.**
- Optional **app auto-update**: an occasional HTTPS check to our update server. Can be turned off for locked-down environments.

## 4. One-line summary for security

> VideoDoc is a self-contained, on-device app. It bundles open-source AI engines
> (llama.cpp, Whisper, Tesseract) and the gemma3 model. User content is processed
> 100% locally and is **never transmitted**. The only network traffic is an optional
> one-time model download and an optional update check — both of which can be
> eliminated by shipping the fully-offline (model-bundled, auto-update-off) build.
