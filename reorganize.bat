@echo off
REM Reorganize mock API files into proper directory structure

echo.
echo ========================================
echo   Suraksha Weekly - Mock API Setup
echo ========================================
echo.

echo Step 1: Creating API directories...
mkdir "apps\worker\src\lib\api" 2>nul
mkdir "apps\admin\src\lib\api" 2>nul
echo [OK] Directories created
echo.

echo Step 2: Moving worker app files...
if exist "apps\worker\src\lib\api-mock-handlers.ts" (
    move /Y "apps\worker\src\lib\api-mock-handlers.ts" "apps\worker\src\lib\api\mock-handlers.ts" >nul 2>&1
    echo [OK] Moved api-mock-handlers.ts to api\mock-handlers.ts
) else (
    echo [SKIP] api-mock-handlers.ts already moved or not found
)

if exist "apps\worker\src\lib\api-client.ts" (
    move /Y "apps\worker\src\lib\api-client.ts" "apps\worker\src\lib\api\client.ts" >nul 2>&1
    echo [OK] Moved api-client.ts to api\client.ts
) else (
    echo [SKIP] api-client.ts already moved or not found
)
echo.

echo Step 3: Moving admin app files...
if exist "apps\admin\src\lib\api-mock-handlers.ts" (
    move /Y "apps\admin\src\lib\api-mock-handlers.ts" "apps\admin\src\lib\api\mock-handlers.ts" >nul 2>&1
    echo [OK] Moved api-mock-handlers.ts to api\mock-handlers.ts
) else (
    echo [SKIP] api-mock-handlers.ts already moved or not found
)

if exist "apps\admin\src\lib\api-client.ts" (
    move /Y "apps\admin\src\lib\api-client.ts" "apps\admin\src\lib\api\client.ts" >nul 2>&1
    echo [OK] Moved api-client.ts to api\client.ts
) else (
    echo [SKIP] api-client.ts already moved or not found
)
echo.

echo Step 4: Copying .env.demo to .env.production...
if exist "apps\worker\.env.demo" (
    copy /Y "apps\worker\.env.demo" "apps\worker\.env.production" >nul 2>&1
    echo [OK] Worker .env.production created
) else (
    echo [ERROR] apps\worker\.env.demo not found
)

if exist "apps\admin\.env.demo" (
    copy /Y "apps\admin\.env.demo" "apps\admin\.env.production" >nul 2>&1
    echo [OK] Admin .env.production created
) else (
    echo [ERROR] apps\admin\.env.demo not found
)
echo.

echo ========================================
echo   Mock API Setup Complete!
echo ========================================
echo.
echo Files organized:
echo   - apps\worker\src\lib\api\mock-handlers.ts
echo   - apps\worker\src\lib\api\client.ts
echo   - apps\admin\src\lib\api\mock-handlers.ts
echo   - apps\admin\src\lib\api\client.ts
echo   - .env.production files created
echo.
echo Next steps:
echo   1. Update your components to import from '@/lib/api/client'
echo   2. Test builds: npm run build
echo   3. Deploy to Vercel
echo.
echo See docs\MOCK_API_SETUP.md for full documentation
echo.
pause
