@echo off
rem ============================================================
rem  LinguaChat launcher
rem  1. Start local translation bridge (core\bridge_server.js)
rem  2. Launch Deadlock via Steam
rem  If the bridge is already running (port in use), the new
rem  bridge process exits silently - that is expected.
rem ============================================================
setlocal
cd /d "%~dp0"

set "NODE_EXE="
if exist "portable-node\node.exe" (
    set "NODE_EXE=portable-node\node.exe"
) else (
    where node >nul 2>nul && set "NODE_EXE=node"
)
if not defined NODE_EXE (
    echo [LCT] Node.js not found. Install Node.js 18+ or put a portable
    echo [LCT] copy at portable-node\node.exe
    pause
    exit /b 1
)

echo [LCT] Starting local translation bridge...
start "LinguaChatBridge" /min "%NODE_EXE%" "core\bridge_server.js"
timeout /t 2 /nobreak >nul

echo [LCT] Launching Deadlock...
start "" "steam://rungameid/1422450"

echo [LCT] Done. In game: open chat (Enter), type /tr to open settings.
endlocal
