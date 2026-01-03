@echo off
echo ================================================
echo     GIT PUSH TO VERCEL AUTO-DEPLOY
echo ================================================
echo.

cd /d i:\appchinhanh

echo [1/3] Adding all changes...
git add -A

echo.
set /p msg="Enter commit message (or press Enter for default): "
if "%msg%"=="" set msg=Update: Auto commit

echo.
echo [2/3] Committing: %msg%
git commit -m "%msg%"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo ================================================
echo   DONE! Vercel will auto-deploy in ~1 minute
echo ================================================
echo.
echo Check deploy status: https://vercel.com/dashboard
echo.
pause
