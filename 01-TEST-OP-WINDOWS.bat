@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js ontbreekt. Download: https://nodejs.org/ & pause & exit /b 1)
echo JustAReminder iOS web-preview starten op http://localhost:4173
node scripts/preview.mjs
pause
