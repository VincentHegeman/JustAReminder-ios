@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Controle van JustAReminder voor GitHub...
node scripts\check-github.mjs
if errorlevel 1 (
  echo Veiligheidscontrole NIET geslaagd. NIET uploaden.
  pause
  exit /b 1
)
npm run check
if errorlevel 1 (
  echo Projectcontrole mislukt. NIET uploaden.
  pause
  exit /b 1
)
echo.
echo [OK] Controle geslaagd. Controleer ook zelf of er geen privégegevens in bestanden staan.
pause
