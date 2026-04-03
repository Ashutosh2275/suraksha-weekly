@echo off
echo ========================================
echo  Suraksha Weekly - Policy Page Deployment
echo ========================================
echo.

echo [1/3] Backing up old policy page...
copy apps\worker-web\src\app\(app)\policy\page.tsx apps\worker-web\src\app\(app)\policy\page.tsx.backup >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Backup created
) else (
    echo ✗ Backup failed - continuing anyway
)

echo.
echo [2/3] Deploying new policy page...
copy apps\worker-web\src\app\(app)\policy\page.new.tsx apps\worker-web\src\app\(app)\policy\page.tsx >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ New policy page deployed
) else (
    echo ✗ Deployment failed
    echo.
    echo Please manually copy the file:
    echo   FROM: apps\worker-web\src\app\(app)\policy\page.new.tsx
    echo   TO:   apps\worker-web\src\app\(app)\policy\page.tsx
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning up...
del apps\worker-web\src\app\(app)\policy\page.new.tsx >nul 2>&1
echo ✓ Cleanup complete

echo.
echo ========================================
echo  ✅ Policy page deployed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Navigate to: http://localhost:3000/policy
echo 3. Review POLICY_PAGE_SUMMARY.md for details
echo.
echo Test these features:
echo - Share button (copies policy summary)
echo - Policy ID copy button
echo - Animated trigger icons (rain, heat, pollution)
echo - Exclusions accordion
echo - Premium breakdown
echo - Auto-renew toggle
echo - Renewal modal flow
echo.
pause
