@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
 echo Git voor Windows ontbreekt. Installeer via https://git-scm.com/downloads/win
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js ontbreekt.
 pause
 exit /b 1
)
node scripts\check-github.mjs
if errorlevel 1 (
 echo GitHub-upload GESTOPT omdat veiligheidsscan niet slaagde.
 pause
 exit /b 1
)
call npm run check
if errorlevel 1 (
 echo Projectcontrole mislukt. Upload gestopt.
 pause
 exit /b 1
)
echo.
echo Plak de HTTPS-URL van je bestaande PRIVATE GitHub repository.
echo Voorbeeld: https://github.com/jouw-account/JustAReminder-iOS.git
set /p REPO=GitHub repository URL: 
if "%REPO%"=="" (
 echo Geen URL ingevuld.
 pause
 exit /b 1
)
echo %REPO% | findstr /b /c:"https://github.com/" >nul
if errorlevel 1 (
 echo Geen geldige GitHub HTTPS URL. Stop.
 pause
 exit /b 1
)
if not exist ".git" git init
if errorlevel 1 goto fail
git add .
if errorlevel 1 goto fail
echo.
echo De volgende bestanden worden naar GitHub verzonden:
git status --short
echo.
echo Controleer de lijst hierboven. Ga ALLEEN verder als er geen geheime bestanden tussen staan.
choice /c JN /m "Doorgaan en naar jouw PRIVATE repository uploaden"
if errorlevel 2 (
 echo Geannuleerd.
 pause
 exit /b 0
)
git diff --cached --quiet
if errorlevel 1 (
 git commit -m "Add JustAReminder iOS source and Codemagic compile check"
 if errorlevel 1 (
  echo Commit mislukt. Waarschijnlijk moet je eerst je Git gebruikersnaam en e-mail instellen.
  echo Zie GITHUB-EN-CODEMAGIC.md
  pause
  exit /b 1
 )
)
git branch -M main
if errorlevel 1 goto fail
git remote get-url origin >nul 2>nul
if errorlevel 1 (
 git remote add origin "%REPO%"
) else (
 git remote set-url origin "%REPO%"
)
if errorlevel 1 goto fail
git push -u origin main
if errorlevel 1 goto fail
echo.
echo [OK] Push voltooid. Controleer op GitHub of de projectbestanden zichtbaar zijn.
pause
exit /b 0
:fail
echo.
echo [FOUT] Upload niet voltooid. Maak een screenshot van deze fout zonder inloggegevens.
pause
exit /b 1
