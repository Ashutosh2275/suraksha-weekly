@echo off
setlocal enabledelayedexpansion

echo === Step 1: Removing old dependencies ===

if exist package-lock.json (
    echo Deleting package-lock.json...
    del /f /q package-lock.json
    echo [OK] Deleted package-lock.json
) else (
    echo [INFO] package-lock.json not found
)

if exist node_modules (
    echo Deleting root node_modules...
    rmdir /s /q node_modules
    echo [OK] Deleted root node_modules
) else (
    echo [INFO] root node_modules not found
)

if exist apps\worker\node_modules (
    echo Deleting apps\worker\node_modules...
    rmdir /s /q apps\worker\node_modules
    echo [OK] Deleted apps\worker\node_modules
)

if exist apps\admin\node_modules (
    echo Deleting apps\admin\node_modules...
    rmdir /s /q apps\admin\node_modules
    echo [OK] Deleted apps\admin\node_modules
)

if exist apps\landing\node_modules (
    echo Deleting apps\landing\node_modules...
    rmdir /s /q apps\landing\node_modules
    echo [OK] Deleted apps\landing\node_modules
)

echo.
echo === Step 2: Running npm install ===
call npm install

echo.
echo === Step 3: Verifying installation ===

if exist node_modules (
    echo [OK] root node_modules exists
) else (
    echo [ERROR] root node_modules not found
)

echo.
echo === Step 4: Directory structure ===
echo.
echo Directory: apps\
dir /b apps\

echo.
echo Directory: shared\
dir /b shared\

echo.
echo === Installation complete ===
