@echo off
chcp 65001 >nul
rem Publie l'Atelier blocs sur GitHub Pages.
rem Seuls les fichiers de l'appli partent (index.html, app.js, catalogue.js, docx.iife.js, README.md, .gitignore).
rem Les projets enregistres (*.json) et le dossier dev\ ne sont jamais envoyes.
cd /d "%~dp0"

where git >nul 2>&1 || (echo Git n'est pas installe : https://git-scm.com/download/win & pause & exit /b 1)
if not exist ".git" (echo Ce dossier n'est pas encore un depot GitHub : %CD% & echo Creez-le d'abord avec GitHub Desktop ^(voir README^). & pause & exit /b 1)
if not exist "index.html" (echo index.html introuvable dans %CD% & pause & exit /b 1)
if not exist "app.js" (echo app.js introuvable dans %CD% & pause & exit /b 1)

git pull --rebase --autostash
git add index.html app.js catalogue.js docx.iife.js README.md .gitignore
git diff --cached --quiet || git commit -m "Publication %date% %time:~0,5%"
for /f %%n in ('git rev-list --count @{u}..HEAD') do if "%%n"=="0" (echo Rien de nouveau a publier. & pause & exit /b 0)
git push || (echo ECHEC de l'envoi : verifiez la connexion a GitHub. & pause & exit /b 1)

echo.
echo Publie. Le site se met a jour d'ici 1 a 2 minutes : rechargez la page (Ctrl+F5).
pause
