@echo off
title MTG Collection Manager
cd /d "%~dp0"

echo Avvio MTG Collection Manager...
echo Server disponibile su http://localhost:3000
echo Premi Ctrl+C per fermare il server.
echo.

start "" "http://localhost:3000"
npm run dev

pause
