@echo off
REM Stops the VideoDoc AI engine (llama-server) started by the quiet launcher.
echo Stopping VideoDoc engine...
taskkill /IM llama-server.exe /F >nul 2>&1
if %errorlevel%==0 (
  echo VideoDoc engine stopped.
) else (
  echo VideoDoc engine was not running.
)
timeout /t 2 >nul
