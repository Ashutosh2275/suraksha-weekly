@echo off
echo ========================================
echo  Suraksha Weekly - Dashboard Deployment
echo ========================================
echo.

echo [1/3] Backing up old dashboard...
copy apps\worker-web\src\app\(app)\dashboard\page.tsx apps\worker-web\src\app\(app)\dashboard\page.tsx.backup >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Backup created
) else (
    echo ✗ Backup failed - continuing anyway
)

echo.
echo [2/3] Deploying new dashboard...
copy apps\worker-web\src\app\(app)\dashboard\page.new.tsx apps\worker-web\src\app\(app)\dashboard\page.tsx >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ New dashboard deployed
) else (
    echo ✗ Deployment failed
    echo.
    echo Please manually copy the file:
    echo   FROM: apps\worker-web\src\app\(app)\dashboard\page.new.tsx
    echo   TO:   apps\worker-web\src\app\(app)\dashboard\page.tsx
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning up...
del apps\worker-web\src\app\(app)\dashboard\page.new.tsx >nul 2>&1
echo ✓ Cleanup complete

echo.
echo ========================================
echo  ✅ Dashboard deployed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Navigate to: http://localhost:3000/dashboard
echo 3. Review DASHBOARD_IMPLEMENTATION.md for details
echo.
pause
