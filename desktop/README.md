# ShowMeWise Desktop

Run ShowMeWise fully offline with built in vision and speech models. No Ollama, no browser AI downloads, no admin rights needed. Made for office laptops.

## Easiest path: the installer

Run `ShowMeWise-Setup.exe` (built from `ShowMeWise.iss` with Inno Setup). It installs everything, engine and model included, to your user folder, no admin rights needed, and adds a Start Menu and desktop shortcut. Nothing is downloaded during install or at run time.

For software deployment tools (Matrix42, Intune, SCCM), it supports a silent switch:

```
ShowMeWise-Setup.exe /VERYSILENT /NORESTART /SUPPRESSMSGBOXES
```

## Manual one time setup (if not using the installer)

1. Copy this `desktop` folder anywhere on the target machine (USB stick works).
2. Open PowerShell in the folder and run:

   ```
   powershell -ExecutionPolicy Bypass -File get-engine.ps1 -Model 12b
   ```

   This downloads the llama.cpp engine (Vulkan build, works on NVIDIA, AMD and Intel graphics with CPU fallback) and the gemma 3 12B vision model (about 8 GB total). Internet is only needed for this step. Pass `-Model 4b` instead for a smaller, faster, slightly less accurate download (about 4 GB) on lower-end machines.

3. Build the app into the `app` subfolder (done once by whoever prepares the bundle):

   ```
   npm run build:desktop
   ```

   then copy the contents of `dist-desktop` into `desktop\app`.

## Daily use

Double click `ShowMeWise.bat` (or the Start Menu / desktop shortcut from the installer). It starts the local engine, opens the browser, and you can drop a video straight in. Keep the black window open while you work, or use the shortcut that installs as `ShowMeWise-quiet.vbs` to hide it. Use `Stop-ShowMeWise.bat` (or its Start Menu shortcut) to shut the engine down when you are done.

## What runs where

| Part | Where it runs |
|---|---|
| Transcription (Whisper) | in your browser, model bundled with the app |
| Screen text reading (OCR) | in your browser |
| AI writing (gemma 3 12B, vision) | llama.cpp on localhost |
| Your video | never leaves the machine |

## Folder layout after setup

```
desktop/
  ShowMeWise.bat          launcher
  ShowMeWise-quiet.vbs    launcher, no console window
  Stop-ShowMeWise.bat     shuts the engine down
  ShowMeWise.iss          Inno Setup installer script
  get-engine.ps1        one time downloader (manual path only)
  llama/                engine binaries
  models/                gemma 3 model + vision projector
  app/                  the built web app
```
