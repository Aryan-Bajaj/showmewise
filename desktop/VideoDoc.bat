@echo off
REM VideoDoc desktop launcher.
REM Starts the bundled AI engine (llama.cpp) which also hosts the app itself,
REM then opens your browser. Everything runs on this machine. No cloud, no
REM account, nothing leaves the device.
REM
REM Model is auto-detected: if the 12B model was downloaded it is preferred
REM (better reading of dense UIs); otherwise the 4B model is used.
REM
REM GPU offload (-ngl) can be overridden:  set VIDEODOC_NGL=8 & VideoDoc.bat
REM   4B  : 99 layers on GPU (fits a 4 GB card).
REM   12B : 12 layers on GPU by default, the rest on CPU/RAM. Lower it if the
REM         engine window reports an out-of-memory / Vulkan allocation error;
REM         raise it if you have more VRAM (faster).
setlocal
cd /d "%~dp0"

if not exist "llama\llama-server.exe" (
  echo [VideoDoc] AI engine not found. Run the one-time setup first:
  echo   powershell -ExecutionPolicy Bypass -File get-engine.ps1
  pause
  exit /b 1
)

REM Prefer the 12B model when it is present, else fall back to 4B.
REM Accepts either the get-engine.ps1 name (…-qat-Q4_0) or the bundled name.
set "MODEL="
if exist "models\gemma-3-12b.gguf" (
  set "MODEL=models\gemma-3-12b.gguf"
  set "MMPROJ=models\mmproj-model-f16-12B.gguf"
  set "NGL_DEFAULT=10"
  set "WHICH=12B"
  goto :have_model
)
if exist "models\gemma-3-12b-it-qat-Q4_0.gguf" (
  set "MODEL=models\gemma-3-12b-it-qat-Q4_0.gguf"
  set "MMPROJ=models\mmproj-model-f16-12B.gguf"
  set "NGL_DEFAULT=10"
  set "WHICH=12B"
  goto :have_model
)
if exist "models\gemma-3-4b-it-qat-Q4_0.gguf" (
  set "MODEL=models\gemma-3-4b-it-qat-Q4_0.gguf"
  set "MMPROJ=models\mmproj-model-f16.gguf"
  set "NGL_DEFAULT=99"
  set "WHICH=4B"
  goto :have_model
)

echo [VideoDoc] No model found. Run the one-time setup first:
echo   powershell -ExecutionPolicy Bypass -File get-engine.ps1
echo   powershell -ExecutionPolicy Bypass -File get-engine.ps1 -Model 12b
pause
exit /b 1

:have_model
if not exist "%MMPROJ%" (
  echo [VideoDoc] Vision projector "%MMPROJ%" missing. Re-run get-engine.ps1 for the %WHICH% model.
  pause
  exit /b 1
)

set "NGL=%NGL_DEFAULT%"
if not "%VIDEODOC_NGL%"=="" set "NGL=%VIDEODOC_NGL%"

echo [VideoDoc] Model: %WHICH%   GPU layers: %NGL%
echo [VideoDoc] Starting on http://localhost:8080 ... keep this window open.
start "" http://localhost:8080
REM --no-mmproj-offload keeps the VISION encoder on the CPU. On a 4 GB GPU the
REM model layers already fill VRAM, so encoding a screenshot on the GPU throws
REM an out-of-memory error and every screenshot fails. Vision on CPU is a little
REM slower but reliable. (Tested: 12B, 4 GB card, reads dense enterprise UIs correctly.)
llama\llama-server.exe ^
  -m "%MODEL%" ^
  --mmproj "%MMPROJ%" ^
  --no-mmproj-offload ^
  --path app ^
  --host 127.0.0.1 --port 8080 ^
  -ngl %NGL% -c 8192
