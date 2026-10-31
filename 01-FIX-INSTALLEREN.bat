@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo == JustAReminder iOS layoutfix ==
echo Plaats de uitgepakte fixbestanden in de hoofdmap van JustAReminder-ios.
where node >nul 2>&1 || (echo Node.js niet gevonden. & pause & exit /b 1)
node installeer-ios-layoutfix.mjs . || (pause & exit /b 1)
node test-ios-layoutfix.mjs . || (pause & exit /b 1)
echo.
echo Als de fix geslaagd is kun je de wijzigingen naar GitHub uploaden.
pause
