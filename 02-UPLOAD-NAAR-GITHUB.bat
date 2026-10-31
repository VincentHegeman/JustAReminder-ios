@echo off
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>&1 || (echo Git is niet geinstalleerd. & pause & exit /b 1)
node test-ios-layoutfix.mjs . || (pause & exit /b 1)
git status --short
echo.
echo Deze stap commit ALLEEN www/ios/native-fixes.css.
set /p akkoord="Uploaden naar GitHub main? Typ JA: "
if /i not "%akkoord%"=="JA" (echo Niet geupload. & pause & exit /b 0)
git add www/ios/native-fixes.css || (pause & exit /b 1)
git commit -m "Fix iPhone status bar calendar controls and mobile drawer layout" || (pause & exit /b 1)
git push origin HEAD:main || (pause & exit /b 1)
echo Wijzigingen staan nu op GitHub. Bouw daarna een nieuwe TestFlight-versie.
pause
