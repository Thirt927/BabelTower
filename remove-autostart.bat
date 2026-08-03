@echo off
rem ============================================================
rem  Babel Tower - Remove auto-start (double-click to run)
rem ============================================================
cd /d "%~dp0"
echo [BabelTower] Removing auto-start...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\autostart.ps1" -Action Remove
echo.
echo Done.
pause
