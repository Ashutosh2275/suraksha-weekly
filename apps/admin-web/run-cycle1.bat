@echo off
echo ========== CYCLE 1 - Admin Web ==========
echo.
echo Step 1: Checking node_modules
if exist node_modules (
    echo [PASS] node_modules exists
) else (
    echo [FAIL] node_modules does not exist
)
echo.
echo Step 2: Running TypeScript type-check
call npm run type-check
if %errorlevel% equ 0 (
    echo [PASS] TypeScript type-check passed
) else (
    echo [FAIL] TypeScript type-check failed with error code %errorlevel%
)
echo.
echo Step 3: Running build
call npm run build
if %errorlevel% equ 0 (
    echo [PASS] Build successful
) else (
    echo [FAIL] Build failed with error code %errorlevel%
)
echo.
echo ========== END CYCLE 1 ==========
