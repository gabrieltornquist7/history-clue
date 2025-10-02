@echo off
echo ================================================
echo COMPLETE CACHE CLEAR AND REBUILD
echo ================================================
echo.

echo [Step 1/5] Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo ✓ Processes stopped
echo.

echo [Step 2/5] Deleting .next build folder...
if exist .next (
    rmdir /s /q .next
    echo ✓ .next folder deleted
) else (
    echo ✓ .next folder already clean
)
echo.

echo [Step 3/5] Clearing npm cache...
call npm cache clean --force
echo ✓ NPM cache cleared
echo.

echo [Step 4/5] Clearing Next.js cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo ✓ Node modules cache cleared
) else (
    echo ✓ Node modules cache already clean
)
echo.

echo [Step 5/5] Rebuilding...
echo This may take a minute...
call npm run build
echo.

echo ================================================
echo CLEANUP COMPLETE!
echo ================================================
echo.
echo Now run: npm run dev
echo.
echo Then in your browser:
echo 1. Press Ctrl + Shift + Delete
echo 2. Clear "Cached images and files"
echo 3. Select "All time"
echo 4. Click "Clear data"
echo 5. Hard refresh: Ctrl + Shift + R
echo.
pause
