@echo off
REM Deployment Build Script for Suraksha Weekly
REM Builds all 3 apps for Netlify deployment

echo ========================================
echo Suraksha Weekly - Deployment Builder
echo ========================================
echo.

echo [1/5] Cleaning old builds...
npm run clean:builds
if %errorlevel% neq 0 (
    echo ERROR: Clean failed!
    exit /b 1
)
echo ✓ Clean complete
echo.

echo [2/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Install failed!
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo [3/5] Building Landing Page...
call npm run build:landing
if %errorlevel% neq 0 (
    echo ERROR: Landing build failed!
    exit /b 1
)
echo ✓ Landing page built
echo.

echo [4/5] Building Worker App...
call npm run build:worker
if %errorlevel% neq 0 (
    echo ERROR: Worker build failed!
    exit /b 1
)
echo ✓ Worker app built
echo.

echo [5/5] Building Admin Dashboard...
call npm run build:admin
if %errorlevel% neq 0 (
    echo ERROR: Admin build failed!
    exit /b 1
)
echo ✓ Admin dashboard built
echo.

echo ========================================
echo ✓ All builds completed successfully!
echo ========================================
echo.
echo Output directories:
echo - Landing: apps\landing\out
echo - Worker:  apps\worker\out
echo - Admin:   apps\admin\out
echo.
echo Ready for Netlify deployment! 🚀
echo.
echo Next steps:
echo 1. Push to git repository
echo 2. Netlify will auto-deploy
echo 3. Or manually deploy with: netlify deploy --prod
echo.
pause
