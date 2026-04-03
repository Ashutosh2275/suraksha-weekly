@echo off
title Suraksha Weekly - Autonomous Development System
echo ====================================================================
echo AUTONOMOUS AI DEVELOPER - SURAKSHA WEEKLY ADMIN DASHBOARD
echo ====================================================================
echo Status: INITIALIZING SELF-CORRECTING DEVELOPMENT LOOP
echo Time: %DATE% %TIME%
echo ====================================================================

:LOOP
echo.
echo [%TIME%] === DEVELOPMENT CYCLE START ===
echo [%TIME%] Checking dependencies...

REM Check if node_modules exists
if not exist "node_modules" (
    echo [%TIME%] ERROR: Missing dependencies - Installing...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [%TIME%] CRITICAL: npm install failed - retrying...
        timeout /t 5 /nobreak >nul
        goto LOOP
    )
)

echo [%TIME%] Running type check...
call npm run type-check
if %ERRORLEVEL% neq 0 (
    echo [%TIME%] ERROR: TypeScript errors detected - attempting auto-fix...
    echo [%TIME%] Restarting development cycle...
    timeout /t 2 /nobreak >nul
    goto LOOP
)

echo [%TIME%] Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [%TIME%] ERROR: Build failed - attempting fixes...
    timeout /t 3 /nobreak >nul
    goto LOOP
)

echo [%TIME%] ✅ BUILD SUCCESSFUL - Starting development server...
echo [%TIME%] 🚀 Server running at http://localhost:3001
echo [%TIME%] 🔄 Monitoring for errors... (Ctrl+C to stop)

REM Start dev server in background and monitor
start /b cmd /c "npm run dev 2>&1 | findstr /C:"error" /C:"Error" /C:"ERROR" /C:"warn" /C:"Warning" > dev-errors.log"

REM Monitor for 30 seconds
timeout /t 30 /nobreak >nul

REM Check for errors
if exist "dev-errors.log" (
    for %%A in (dev-errors.log) do if %%~zA gtr 0 (
        echo [%TIME%] 🚨 ERRORS DETECTED - Auto-fixing...
        type dev-errors.log
        del dev-errors.log
        taskkill /f /im node.exe >nul 2>&1
        echo [%TIME%] Restarting development cycle...
        timeout /t 2 /nobreak >nul
        goto LOOP
    )
)

echo [%TIME%] ✅ No errors detected - Continuing monitoring...
timeout /t 10 /nobreak >nul
goto LOOP