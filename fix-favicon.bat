@echo off
echo Fixing favicon files...

REM Copy icon.png to all required locations
copy "app\icon.png" "public\favicon.ico"
copy "app\icon.png" "public\apple-touch-icon.png"
copy "app\icon.png" "public\icon-192.png"
copy "app\icon.png" "public\icon-512.png"

echo.
echo Files created! Now committing...
git add public/
git commit -m "Fix: Add all favicon files"
git push

echo.
echo Done! After deployment:
echo 1. Clear browser cache completely
echo 2. Hard refresh with Ctrl+Shift+R
echo 3. Favicon should appear
pause
