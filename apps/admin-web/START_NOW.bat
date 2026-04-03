@echo off
echo SURAKSHA WEEKLY - IMMEDIATE EXECUTION SYSTEM
echo.
echo Starting complete system in 3 seconds...
timeout /t 3 /nobreak >nul

REM Change to project directory
cd /d "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web"

REM Execute the main system
call EXECUTE_EVERYTHING.bat