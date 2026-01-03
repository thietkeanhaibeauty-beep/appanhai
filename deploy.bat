@echo off
echo ================================================
echo     DEPLOY CLIENT TO VERCEL
echo ================================================
echo.

cd /d i:\appchinhanh\client

echo [1/3] Checking Vercel CLI...
where vercel >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
)

echo.
echo [2/3] Building production...
call npm run build

echo.
echo [3/3] Deploying to Vercel...
echo.
echo Choose deployment type:
echo   1. Production (--prod)
echo   2. Preview (default)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo Deploying to PRODUCTION...
    vercel --prod
) else (
    echo Deploying as PREVIEW...
    vercel
)

echo.
echo ================================================
echo     DEPLOYMENT COMPLETE!
echo ================================================
pause
