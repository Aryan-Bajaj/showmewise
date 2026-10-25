# ShowMeWise Desktop

The desktop version bundles the llama.cpp engine with the gemma 3 4B vision model and the Whisper speech model, so it runs fully offline with a single AI backend and nothing to install beyond copying a folder.

Setup, daily use and the folder layout are documented in [desktop/README.md](desktop/README.md).

In short:

1. `npm run build:desktop`, then copy `dist-desktop` into `desktop/app`
2. On the target machine, run `desktop/get-engine.ps1` once (downloads the engine and the model, about 4 GB)
3. Start with `desktop/ShowMeWise.bat`

### Choosing the model (4B vs 12B)

`get-engine.ps1` defaults to the **4B** model (fast, ~4 GB total). For dense
enterprise UIs and complex dashboards the 4B model can misread on-screen
labels and invent plausible-but-wrong text. Download the **12B** model instead:

```
powershell -ExecutionPolicy Bypass -File get-engine.ps1 -Model 12b
```

`ShowMeWise.bat` auto-detects the 12B model and loads it (partial GPU offload, the
rest on CPU/RAM — needs ~10 GB free RAM). First generation is slower than 4B but
it reads dense screens far more accurately. Override GPU offload if needed:
`set SHOWMEWISE_NGL=8 & ShowMeWise.bat` (lower on out-of-memory, higher for more VRAM).

How it works: the launcher starts `llama-server` on `http://localhost:8080`, which hosts both the app files and an OpenAI compatible, vision capable API. The app detects it and selects the built in engine automatically (`src/lib/llm.js`, `callLocalEngine` and `localEngineStatus`). All inference is local; localhost traffic is the computer talking to itself.

For IT and security review of what the bundle contains and downloads, see [WHATS_INSIDE.md](WHATS_INSIDE.md) and [IT_REQUIREMENTS.md](IT_REQUIREMENTS.md).

A single installer (`.exe` via Tauri) is planned as a later packaging step; the folder bundle above is the current supported path.
