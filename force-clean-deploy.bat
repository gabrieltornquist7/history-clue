@echo off
echo ================================================
echo FORCE CLEAN DEPLOYMENT (NO CACHE)
echo ================================================
echo.

echo [Step 1/4] Cleaning local build...
if exist .next rmdir /s /q .next
if exist .vercel rmdir /s /q .vercel
echo ✓ Local clean complete
echo.

echo [Step 2/4] Making a dummy change to force new build...
echo # Force clean rebuild >> .vercel-force-rebuild
git add .vercel-force-rebuild
git commit -m "Force clean build without cache"
echo ✓ Commit created
echo.

echo [Step 3/4] Pushing to trigger deployment...
git push
echo ✓ Push complete
echo.

echo [Step 4/4] Instructions:
echo ================================================
echo IMPORTANT: After push completes:
echo.
echo 1. Go to Vercel Dashboard
echo 2. Go to Deployments tab
echo 3. Click "..." on the new deployment
echo 4. Click "Redeploy"
echo 5. TOGGLE OFF "Use existing Build Cache"
echo 6. Click "Redeploy"
echo.
echo This will force a completely clean build.
echo ================================================
pause
