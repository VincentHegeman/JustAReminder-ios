@echo off
setlocal
chcp 65001 >nul
set "PATCH=%~dp0"
set "REPO=%USERPROFILE%\Documents\JustAReminder-ios"
where git >nul 2>nul || (echo [FOUT] Git voor Windows is nodig. & pause & exit /b 1)
if not exist "%REPO%\.git" (
 echo [1/5] Haal jouw prive-GitHub-repository op...
 git clone "https://github.com/VincentHegeman/JustAReminder-ios.git" "%REPO%" || (pause & exit /b 1)
)
echo [2/5] Controleer lokale aanpassingen...
for /f "usebackq delims=" %%L in (`git -C "%REPO%" status --porcelain`) do (
 echo [STOP] Er zijn al lokale aanpassingen in "%REPO%". Niets overschreven.
 pause
 exit /b 1
)
git -C "%REPO%" checkout main || (pause & exit /b 1)
git -C "%REPO%" pull --ff-only origin main || (pause & exit /b 1)
echo [3/5] Pas precies de gewijzigde iOS-bestanden toe...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=$env:PATCH; $d=$env:REPO; $files=Get-Content (Join-Path $s 'GEWIJZIGDE-BESTANDEN.txt'); foreach($f in $files){$from=Join-Path $s $f; $to=Join-Path $d $f; New-Item -ItemType Directory -Path (Split-Path -Parent $to) -Force | Out-Null; Copy-Item -LiteralPath $from -Destination $to -Force}; Write-Host ('Aangepast: '+$files.Count+' bestanden')" || (pause & exit /b 1)
git -C "%REPO%" diff --check || (pause & exit /b 1)
echo [4/5] Controle: deze bestanden veranderen in jouw repo:
git -C "%REPO%" status --short
choice /C JN /M "Wil je deze reparatie naar GitHub sturen (J=ja, N=nee)"
if errorlevel 2 (echo Niets naar GitHub verstuurd. & pause & exit /b 0)
echo [5/5] Commit en push...
git -C "%REPO%" add --all || (pause & exit /b 1)
git -C "%REPO%" commit -m "iOS v1.1: iPhone schermen, taaklabels, toetsenbord, appicon" || (pause & exit /b 1)
git -C "%REPO%" push origin main || (pause & exit /b 1)
echo [OK] GitHub is bijgewerkt. LET OP: Codemagic kan bij ingestelde automatische builds starten.
pause
