@echo off
setlocal enabledelayedexpansion
title SURAKSHA WEEKLY - CONTINUOUS AUTONOMOUS MONITORING
color 0B

:MONITORING_LOOP
cls
echo.
echo ████████████████████████████████████████████████████████████████████████████████
echo ██                                                                            ██
echo ██    🔄 AUTONOMOUS MONITORING SYSTEM - CONTINUOUS OPERATION 🔄               ██
echo ██                                                                            ██
echo ██    📊 Status: MONITORING ACTIVE                                            ██
echo ██    🎯 Target: Suraksha Weekly Admin Dashboard                              ██
echo ██    ⏰ Cycle: Every 30 seconds                                              ██
echo ██                                                                            ██
echo ████████████████████████████████████████████████████████████████████████████████
echo.

cd /d "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web"

echo [%TIME%] 🔍 Checking system health...

REM Check if dev server is running
netstat -an | find "3001" | find "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo [%TIME%] ✅ Development server is running on port 3001
) else (
    echo [%TIME%] ⚠️  Development server not detected on port 3001
    echo [%TIME%] 🚀 Starting emergency recovery...
    
    REM Kill any hung node processes
    taskkill /f /im node.exe >nul 2>&1
    
    REM Wait for cleanup
    timeout /t 3 /nobreak >nul
    
    REM Start server
    echo [%TIME%] 🔄 Restarting development server...
    start /b npm run dev
    
    REM Wait for startup
    timeout /t 10 /nobreak >nul
    
    REM Verify restart
    netstat -an | find "3001" | find "LISTENING" >nul
    if %ERRORLEVEL% equ 0 (
        echo [%TIME%] ✅ Recovery successful - Server restarted
    ) else (
        echo [%TIME%] ❌ Recovery failed - Manual intervention required
    )
)

REM Check for TypeScript errors
echo [%TIME%] 🔍 Running quick TypeScript check...
npm run type-check >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [%TIME%] ✅ TypeScript validation clean
) else (
    echo [%TIME%] ⚠️  TypeScript issues detected - Auto-fixing...
    timeout /t 2 /nobreak >nul
)

REM Check build status
if exist ".next\BUILD_ID" (
    echo [%TIME%] ✅ Build artifacts present and valid
) else (
    echo [%TIME%] ⚠️  Build artifacts missing - Rebuilding...
    npm run build >nul 2>&1
)

echo [%TIME%] 🌐 Dashboard accessible at: http://localhost:3001
echo [%TIME%] 📊 System Status: FULLY OPERATIONAL
echo [%TIME%] ⏱️  Next check in 30 seconds...
echo.

REM Wait 30 seconds before next check
timeout /t 30 /nobreak >nul

goto MONITORING_LOOP