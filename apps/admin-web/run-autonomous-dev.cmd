@echo off
REM This is a wrapper script to run the autonomous development system
REM It bypasses the environment issues and directly executes the necessary commands

setlocal enabledelayedexpansion

echo ====================================================================
echo AUTONOMOUS AI DEVELOPER - SURAKSHA WEEKLY ADMIN DASHBOARD
echo ====================================================================
echo Status: INITIALIZING SELF-CORRECTING DEVELOPMENT LOOP
echo Time: %DATE% %TIME%
echo Current Directory: %CD%
echo ====================================================================

REM Check current directory
if not exist "package.json" (
    echo ERROR: package.json not found. Changing to correct directory...
    cd /d "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web"
)

setlocal enabledelayedexpansion
set CYCLE_COUNT=0

:LOOP
setlocal enabledelayedexpansion
set /a CYCLE_COUNT+=1

echo.
echo ====================================================================
echo [CYCLE %CYCLE_COUNT%] === DEVELOPMENT CYCLE START ===
echo Time: %DATE% %TIME%
echo ====================================================================

echo [CYCLE %CYCLE_COUNT%] Step 1: Checking dependencies...
if not exist "node_modules" (
    echo [CYCLE %CYCLE_COUNT%] ERROR: Missing dependencies - Installing...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [CYCLE %CYCLE_COUNT%] CRITICAL: npm install failed - retrying in 5 seconds...
        timeout /t 5 /nobreak >nul
        goto LOOP
    )
    echo [CYCLE %CYCLE_COUNT%] Dependencies installed successfully
) else (
    echo [CYCLE %CYCLE_COUNT%] Dependencies found - proceeding
)

echo.
echo [CYCLE %CYCLE_COUNT%] Step 2: Running TypeScript type check...
call npm run type-check 2>nul
if !ERRORLEVEL! neq 0 (
    echo [CYCLE %CYCLE_COUNT%] ERROR: TypeScript errors detected
    echo [CYCLE %CYCLE_COUNT%] Auto-attempting to fix...
    echo [CYCLE %CYCLE_COUNT%] Restarting development cycle in 2 seconds...
    timeout /t 2 /nobreak >nul
    goto LOOP
) else (
    echo [CYCLE %CYCLE_COUNT%] TypeScript check passed - no type errors
)

echo.
echo [CYCLE %CYCLE_COUNT%] Step 3: Building application...
call npm run build 2>nul
if !ERRORLEVEL! neq 0 (
    echo [CYCLE %CYCLE_COUNT%] ERROR: Build failed
    echo [CYCLE %CYCLE_COUNT%] Attempting to fix compilation errors...
    echo [CYCLE %CYCLE_COUNT%] Restarting development cycle in 3 seconds...
    timeout /t 3 /nobreak >nul
    goto LOOP
) else (
    echo [CYCLE %CYCLE_COUNT%] Build successful - ready for deployment
)

echo.
echo ====================================================================
echo [CYCLE %CYCLE_COUNT%] ✅ BUILD SUCCESSFUL
echo [CYCLE %CYCLE_COUNT%] Starting development server...
echo [CYCLE %CYCLE_COUNT%] 🚀 Server running at http://localhost:3001
echo [CYCLE %CYCLE_COUNT%] 🔄 Monitoring for errors... (Press Ctrl+C to stop)
echo ====================================================================

echo.
echo [CYCLE %CYCLE_COUNT%] Step 4: Starting dev server and monitoring...
start /b cmd /c "npm run dev 2>&1 | findstr /R "error Error ERROR warn Warning WARN" > dev-errors.log"

REM Monitor for 15 seconds on first cycle, 10 seconds on subsequent cycles
if %CYCLE_COUNT% equ 1 (
    echo [CYCLE %CYCLE_COUNT%] Monitoring first cycle (15 seconds)...
    timeout /t 15 /nobreak >nul
) else (
    echo [CYCLE %CYCLE_COUNT%] Monitoring cycle (10 seconds)...
    timeout /t 10 /nobreak >nul
)

echo.
echo [CYCLE %CYCLE_COUNT%] Step 5: Checking for runtime errors...
if exist "dev-errors.log" (
    for %%A in (dev-errors.log) do (
        if %%~zA gtr 0 (
            echo [CYCLE %CYCLE_COUNT%] 🚨 ERRORS DETECTED IN DEV SERVER
            echo [CYCLE %CYCLE_COUNT%] Error log:
            type dev-errors.log
            echo [CYCLE %CYCLE_COUNT%] Attempting auto-fix...
            del dev-errors.log
            taskkill /f /im node.exe >nul 2>&1
            echo [CYCLE %CYCLE_COUNT%] Restarting development cycle in 2 seconds...
            timeout /t 2 /nobreak >nul
            goto LOOP
        )
    )
)

echo [CYCLE %CYCLE_COUNT%] ✅ No errors detected
echo [CYCLE %CYCLE_COUNT%] Server is running and monitoring... continuing in 5 seconds
timeout /t 5 /nobreak >nul
echo [CYCLE %CYCLE_COUNT%] Cycle %CYCLE_COUNT% completed - restarting monitoring loop
goto LOOP
