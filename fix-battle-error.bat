@echo off
echo ===================================
echo FIXING LIVE BATTLE LOADING ERROR
echo ===================================
echo.

echo [1/3] Clearing Next.js cache...
rmdir /s /q .next 2>nul
if exist .next (
    echo ERROR: Could not delete .next folder. Please close your dev server and try again.
    pause
    exit /b 1
)
echo ✓ Next.js cache cleared!
echo.

echo [2/3] Clearing node modules cache...
npm cache clean --force
echo ✓ NPM cache cleared!
echo.

echo [3/3] Done! Now follow these steps:
echo.
echo 1. Start your dev server: npm run dev
echo 2. Hard refresh your browser:
echo    - Chrome/Edge: Ctrl + Shift + R
echo    - Or: Ctrl + Shift + Delete to clear browser cache
echo 3. Try joining a battle again
echo.
pause
