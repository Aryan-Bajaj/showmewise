# VideoDoc Desktop — IT Requirements & Approval Sheet

**What it is:** a desktop app that turns a screen recording into step-by-step
documentation. The AI runs **entirely on the user's computer**. There is **no
cloud, no account, no data upload**.

**The one outbound connection:** the first transcription downloads the Whisper
speech model from `huggingface.co` (about 970 MB), which the browser then
caches. Everything after that, and everything else in the app, runs locally.
If that download is not acceptable on your network, see the air-gapped note
below.

---

## 1. Hardware

| | Minimum (4B model) | Recommended (12B model, ships by default) |
|---|---|---|
| **RAM** | 8 GB | **16 GB** (12B needs ~10 GB free while generating) |
| **Free disk** | 6 GB | 10 GB (installer payload is ~7.6 GB) |
| **GPU** | Not required (runs on CPU) | Any dedicated GPU (e.g. 4 GB+) speeds it up; partial CPU offload is used automatically on smaller GPUs |
| **CPU** | 64-bit, 4 cores | 6+ cores |

> The 12B model (shipped by default for accuracy on dense enterprise UIs)
> installs to ~8 GB total (app + engine + model) and uses ~10 GB RAM while
> generating. A smaller 4B model (~4 GB, ~4–6 GB RAM) is available for lower-spec
> machines — trades some screen-reading accuracy for speed and a smaller footprint.

## 2. Operating system / software

- **Windows 10 or 11 (64-bit)** — primary. (macOS build also possible.)
- Uses the system's default web browser (Edge/Chrome) to display the app — no
  WebView runtime or browser install required beyond what Windows ships with.
- No .NET, Java, Python, or other runtimes required — everything is bundled.

## 3. Installation & permissions

- Ships as an **Inno Setup installer** (`.exe`, currently **unsigned** — no code-signing
  certificate yet. Windows SmartScreen will show an "unknown publisher" prompt on
  first run until the org either allow-lists it or a certificate is added).
- Due to the ~7.6 GB payload, the installer is delivered as `VideoDoc-Setup.exe`
  plus a few sibling `.bin` files that must be kept together in the same folder —
  still a single run of the `.exe` to install everything.
- **Per-user install → NO admin rights needed** (good for locked-down machines).
- Installs only to the user's local app folder (`%LOCALAPPDATA%`). No drivers, no
  system services, no registry-wide changes.
- Supports a **silent switch** for software deployment tools (Matrix42, Intune, SCCM):
  `VideoDoc-Setup.exe /VERYSILENT /NORESTART /SUPPRESSMSGBOXES`.

## 4. Network & security  *(the important part for IT)*

| Activity | Network used? | Destination |
|---|---|---|
| **Generating documentation (normal use)** | **None** | — runs 100% locally |
| **AI model download** *(only if not bundled in installer)* | One-time HTTPS | `huggingface.co` (or our CDN) |
| **App auto-update** *(optional — can be disabled)* | Occasional HTTPS | our update server |
| **Internal AI engine** | Loopback only | `127.0.0.1:8080` — never leaves the device |

**Key points for security review:**
- **No outbound data.** The video, screenshots, audio and transcript are **never
  sent anywhere**. Nothing is uploaded.
- **No telemetry, no analytics, no account/login.**
- The AI talks to a **localhost (127.0.0.1) loopback** server inside the app — this
  is the computer talking to itself; it needs **no inbound firewall rule** and is not
  reachable from the network.
- For an **air-gapped / offline** deployment: choose the **model-bundled installer**
  and **disable auto-update**. The writing AI, the OCR engine and the OCR language
  data are all bundled and served by the app itself, so the only connection left is
  the one-time Whisper speech-model download described above. Let that download
  happen once on a connected machine and the app then runs with **no network
  connections at all**.
- The bundled local-inference binary (`llama-server.exe`) is open-source
  (llama.cpp). It may need to be **allow-listed in EDR/antivirus** (standard for any
  new signed app running a local process).

## 5. Privacy / compliance

- All processing is **on-device**. Suitable for confidential / regulated data
  (the app never transmits the content it processes).
- No personal data is collected or transmitted by the app.
- Open-source components (llama.cpp, Whisper, Tesseract) — auditable.

---

## ✅ Ask your IT team to confirm these 6 items

1. **Disk:** ~10 GB free on the target machines — OK?
2. **RAM:** 16 GB recommended for the default 12B model (8 GB works with the smaller 4B model) — OK?
3. **Install method:** is a **per-user, unsigned installer** (no admin) acceptable, or do they require code signing / system-wide / their own packaging (SCCM/Intune/Matrix42 — a silent-install switch is already supported)?
4. **App allow-listing:** can the unsigned app + its local `llama-server.exe` be **allow-listed in antivirus/EDR** (and SmartScreen)?
5. **Localhost server:** is a **127.0.0.1-only** local server (loopback, no external port) permitted by endpoint policy?
6. **Offline vs download:** do they want the **fully-offline build** (model bundled, no network) — or is a one-time HTTPS model download from a trusted source allowed?

> If IT says "no new installs at all," the **browser version** (no install, runs in
> Chrome/Edge) is the fallback — but it's limited to smaller models and lower accuracy.
