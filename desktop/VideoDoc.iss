; VideoDoc — Inno Setup installer script
; Packages the whole desktop bundle (web app + llama.cpp engine + gemma-3-12B
; vision model) into a single self-contained installer. Everything runs on the
; user's machine; nothing is downloaded at install or run time.
;
; HOW TO BUILD:
;   1. Install Inno Setup 6 (free): https://jrsoftware.org/isdl.php
;   2. Open this file in Inno Setup, or run:
;        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" VideoDoc.iss
;   3. The installer appears in desktop\Output\VideoDoc-Setup.exe
;
; SILENT INSTALL (for Matrix42 / Intune / SCCM software deployment):
;   VideoDoc-Setup.exe /VERYSILENT /NORESTART /SUPPRESSMSGBOXES
;
; NOTE: the bundled model makes this installer ~8 GB. That is expected — it is a
; fully offline AI app. For a smaller installer, ship without models\ and have
; first run call get-engine.ps1 instead (see DESKTOP_SETUP.md).

#define MyAppName "VideoDoc"
#define MyAppVersion "1.0"
#define MyAppPublisher "Aryan Bajaj"
#define MyAppExeName "VideoDoc-quiet.vbs"

[Setup]
AppId={{5E9EAB1B-6BEF-468C-AD87-2AA7FAD461FF}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
; Per-user install → NO admin rights required (good for locked-down machines).
PrivilegesRequired=lowest
DefaultDirName={localappdata}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=VideoDoc-Setup
; The model is already Q4-compressed; recompressing wastes an hour for ~0 gain.
Compression=none
SolidCompression=no
WizardStyle=modern
; ~8 GB of payload + working space.
ExtraDiskSpaceRequired=8600000000
UninstallDisplayName={#MyAppName}
; Payload is ~7.6 GB, over Inno's 4.2 GB single-exe ceiling, so the build
; splits into VideoDoc-Setup.exe + VideoDoc-Setup-1.bin, -2.bin, ... Keep all
; of these files together in one folder (zip them together to share) — the
; installer reads the .bin parts from beside the .exe.
DiskSpanning=yes
DiskSliceSize=1900000000

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"

[Files]
; The built web app (served by llama-server on localhost:8080)
Source: "app\*";    DestDir: "{app}\app";    Flags: ignoreversion recursesubdirs createallsubdirs
; The llama.cpp engine (llama-server.exe + Vulkan/CPU DLLs)
Source: "llama\*";  DestDir: "{app}\llama";  Flags: ignoreversion recursesubdirs createallsubdirs
; The gemma-3-12B vision model + projector (~8 GB) — bundled, fully offline
Source: "models\*"; DestDir: "{app}\models"; Flags: ignoreversion recursesubdirs createallsubdirs
; Launchers + docs
Source: "VideoDoc.bat";        DestDir: "{app}"; Flags: ignoreversion
Source: "VideoDoc-quiet.vbs";  DestDir: "{app}"; Flags: ignoreversion
Source: "Stop-VideoDoc.bat";   DestDir: "{app}"; Flags: ignoreversion
Source: "README.md";           DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Start Menu
Name: "{group}\{#MyAppName}";        Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Stop {#MyAppName}";   Filename: "{app}\Stop-VideoDoc.bat"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
; Desktop (optional task)
Name: "{userdesktop}\{#MyAppName}";  Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
; Offer to launch after install (skipped in silent mode).
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent shellexec

[UninstallRun]
; Make sure the engine is stopped before files are removed.
Filename: "{cmd}"; Parameters: "/c taskkill /IM llama-server.exe /F"; Flags: runhidden; RunOnceId: "StopEngine"
