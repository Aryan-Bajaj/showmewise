# VideoDoc — Download & Install (Desktop, offline)

**Download:** [VideoDoc-Setup.zip](https://drive.google.com/file/d/12A21aqW3QnFJGnXR2sxUlWIYivxNsMmw/view?usp=sharing) (~7.6 GB)

The zip contains the app, the llama.cpp engine, and the gemma 3 12B vision
model. Install needs no internet at all, and neither does the writing AI.

One thing does need it: the first time you transcribe a video, the browser
downloads the Whisper speech model from Hugging Face (about 970 MB). It is
cached afterwards, so that happens once and every run after it works with the
network switched off. Nothing of yours is uploaded at any point.

## Steps

1. Download `VideoDoc-Setup.zip` from the link above and extract it. You'll get
   `VideoDoc-Setup.exe` plus four `VideoDoc-Setup-*.bin` files — keep all five
   in the same folder (the installer needs the `.bin` parts alongside the `.exe`).
2. Run `VideoDoc-Setup.exe`.
   - No admin rights required (installs to your user folder).
   - Windows SmartScreen may show an "unknown publisher" warning since this
     build isn't code-signed yet — choose **More info → Run anyway**.
3. Launch VideoDoc from the Start Menu or desktop shortcut created by the installer.

## Silent install (for IT deployment via Matrix42 / Intune / SCCM)

```
VideoDoc-Setup.exe /VERYSILENT /NORESTART /SUPPRESSMSGBOXES
```

## For IT review

See [IT_REQUIREMENTS.md](IT_REQUIREMENTS.md) for hardware/network requirements
and the approval checklist, and [WHATS_INSIDE.md](WHATS_INSIDE.md) for what the
app is built from and how data flows (nothing leaves the machine).
