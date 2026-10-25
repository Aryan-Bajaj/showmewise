# ShowMeWise — Download & Install (Desktop, offline)

**Download:** [latest release](https://github.com/Aryan-Bajaj/showmewise/releases/latest) (~8.5 GB in total)

The release holds everything needed to run ShowMeWise offline: the app, the
llama.cpp engine, the gemma 3 12B vision model and the Whisper speech model.
Nothing is downloaded during install or while using the app, and nothing of
yours is ever uploaded. You can pull the network cable out and it still works.

## Steps

1. Download every file from the release: `ShowMeWise-Setup.exe` and all five
   `ShowMeWise-Setup-*.bin` files. Put them in the same folder. The installer
   reads the `.bin` parts from beside the `.exe`, so the `.exe` on its own
   stops partway through.
2. Run `ShowMeWise-Setup.exe`.
   - No admin rights required (installs to your user folder).
   - Windows SmartScreen may show an "unknown publisher" warning since this
     build isn't code-signed yet — choose **More info → Run anyway**.
3. Launch ShowMeWise from the Start Menu or desktop shortcut created by the installer.

## Silent install (for IT deployment via Matrix42 / Intune / SCCM)

```
ShowMeWise-Setup.exe /VERYSILENT /NORESTART /SUPPRESSMSGBOXES
```

## For IT review

See [IT_REQUIREMENTS.md](IT_REQUIREMENTS.md) for hardware/network requirements
and the approval checklist, and [WHATS_INSIDE.md](WHATS_INSIDE.md) for what the
app is built from and how data flows (nothing leaves the machine).
