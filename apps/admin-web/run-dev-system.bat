@echo off
echo ====================================================================
echo AUTONOMOUS DEVELOPMENT SYSTEM - CMD VERSION
echo ====================================================================
echo [%TIME%] Starting dependency check and installation...

cd /d "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web"

echo [%TIME%] Installing dependencies (including lucide-react fix)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [%TIME%] ERROR: npm install failed
    echo [%TIME%] Check the output above for installation errors
    pause
    exit /b 1
)

echo [%TIME%] ✅ Dependencies installed successfully
echo [%TIME%] Checking TypeScript compilation...
call npm run type-check
if %ERRORLEVEL% neq 0 (
    echo [%TIME%] ERROR: TypeScript compilation failed
    echo [%TIME%] Check the output above for type errors
    pause
    exit /b 1
)

echo [%TIME%] ✅ TypeScript validation passed
echo [%TIME%] Starting build process...

call npm run build
if %ERRORLEVEL% neq 0 (
    echo [%TIME%] ERROR: Build failed
    echo [%TIME%] Check the output above for build errors
    pause
    exit /b 1
)

echo [%TIME%] ✅ Build successful
echo [%TIME%] Starting development server...
echo [%TIME%] Server will be available at http://localhost:3001

call npm run dev