@echo off
echo ================================================
echo FORCE BUNDLE REHASH
echo ================================================
echo.

echo This will make a tiny change to force new bundle hashes
echo.

echo Restoring LiveBattleView.js first...
git checkout HEAD -- components/LiveBattleView.js
echo ✓ File restored
echo.

echo Adding a comment to force rehash...
echo // Force bundle rehash >> components/LiveBattleView.js
echo ✓ Comment added
echo.

echo Committing change...
git add components/LiveBattleView.js
git commit -m "Force bundle rehash for cache fix"
echo ✓ Committed
echo.

echo Pushing to trigger deployment...
git push
echo ✓ Pushed
echo.

echo ================================================
echo Wait 2-3 minutes for deployment to complete
echo Then check the bundle hash in browser
echo It should be DIFFERENT from: common-6a14c0b4d24c4a62.js
echo ================================================
pause
