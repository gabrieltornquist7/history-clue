@echo off
echo ================================================
echo FORCE VERCEL PRODUCTION DEPLOYMENT
echo ================================================
echo.

echo [Step 1/3] Checking Vercel CLI...
where vercel >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI not found!
    echo.
    echo Install it with: npm install -g vercel
    echo Then run this script again.
    pause
    exit /b 1
)
echo ✓ Vercel CLI found
echo.

echo [Step 2/3] Building production version...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed! Check errors above.
    pause
    exit /b 1
)
echo ✓ Build complete
echo.

echo [Step 3/3] Deploying to production...
call vercel --prod
echo.

echo ================================================
echo DEPLOYMENT COMPLETE!
echo ================================================
echo.
echo Next steps:
echo 1. Wait 1-2 minutes for deployment to propagate
echo 2. Clear your browser cache (Ctrl + Shift + Delete)
echo 3. Hard refresh: Ctrl + Shift + R
echo 4. Test battle mode at https://www.historyclue.com
echo.
pause
