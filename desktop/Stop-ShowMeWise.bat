@echo off
REM Stops the ShowMeWise AI engine (llama-server) started by the quiet launcher.
echo Stopping ShowMeWise engine...
taskkill /IM llama-server.exe /F >nul 2>&1
if %errorlevel%==0 (
  echo ShowMeWise engine stopped.
) else (
  echo ShowMeWise engine was not running.
)
timeout /t 2 >nul
