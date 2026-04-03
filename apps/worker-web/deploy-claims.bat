@echo off
echo ========================================
echo  Suraksha Weekly - Claims Page Deployment
echo ========================================
echo.

echo [1/3] Backing up old claims page...
copy apps\worker-web\src\app\(app)\claims\page.tsx apps\worker-web\src\app\(app)\claims\page.tsx.backup >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Backup created
) else (
    echo ✗ Backup failed - continuing anyway
)

echo.
echo [2/3] Deploying new claims page...
copy apps\worker-web\src\app\(app)\claims\page.new.tsx apps\worker-web\src\app\(app)\claims\page.tsx >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ New claims page deployed
) else (
    echo ✗ Deployment failed
    echo.
    echo Please manually copy the file:
    echo   FROM: apps\worker-web\src\app\(app)\claims\page.new.tsx
    echo   TO:   apps\worker-web\src\app\(app)\claims\page.tsx
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning up...
del apps\worker-web\src\app\(app)\claims\page.new.tsx >nul 2>&1
echo ✓ Cleanup complete

echo.
echo ========================================
echo  ✅ Claims page deployed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Navigate to: http://localhost:3000/claims
echo 3. Review CLAIMS_PAGE_SUMMARY.md for details
echo.
echo Test these features:
echo - Filter bottom sheet (tap filter icon)
echo - Claim card expansion (tap "View details")
echo - Animated trigger icons (rain falls, heat waves)
echo - Copy transaction ID
echo.
pause
