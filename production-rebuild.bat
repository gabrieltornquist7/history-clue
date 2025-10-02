@echo off
echo ================================================
echo PRODUCTION BUILD WITH FRESH CACHE
echo ================================================
echo.

echo [Step 1/4] Cleaning all caches...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
call npm cache clean --force
echo ✓ Caches cleared
echo.

echo [Step 2/4] Building for production...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed! Check errors above.
    pause
    exit /b 1
)
echo ✓ Production build complete
echo.

echo [Step 3/4] Build info:
dir .next /s | find "static"
echo.

echo [Step 4/4] Next steps:
echo ================================================
echo YOUR PRODUCTION BUILD IS READY!
echo.
echo Now deploy using one of these methods:
echo.
echo METHOD 1 - Vercel (recommended):
echo   vercel --prod
echo.
echo METHOD 2 - Manual deploy:
echo   - Upload .next folder to your server
echo   - Restart your Node.js process
echo.
echo METHOD 3 - If using a different host:
echo   - Follow your hosting provider's deployment steps
echo   - Make sure to upload the NEW .next folder
echo.
echo ⚠️  IMPORTANT: After deploying, clear your browser cache!
echo    Ctrl + Shift + Delete -> "Cached images and files" -> "All time"
echo.
echo ================================================
pause
